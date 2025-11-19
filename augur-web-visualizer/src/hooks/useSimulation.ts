import { useState, useCallback } from 'react';
import type { SimulationState, SimulationStep, PromptConfig } from '@/types';
import { INITIAL_PYTHON_CODE } from '@/constants';
import { getAgentService } from '@/services/aiServiceFactory';
import { useI18n } from '@/lib/i18n';
import { useAI } from '@/contexts/AIProvider';

const initialState: SimulationState = {
    isRunning: false,
    isPaused: false,
    isAwaitingAI: false,
    isGeneratingSimulation: false,
    error: null,
    currentStepIndex: -1,
    dapLog: [],
    aiContext: '',
    aiResponse: null,
    highlightedVariable: null,
    rawDapPayloads: null,
};

function getCodeSnippet(fullCode: string, currentLine: number, windowSize: number): string {
    const lines = fullCode.split('\n');
    const startLineIndex = Math.max(0, currentLine - 1 - windowSize);
    const endLineIndex = Math.min(lines.length, currentLine + windowSize);
    let snippet = '';
    for (let i = startLineIndex; i < endLineIndex; i++) {
        const lineNum = i + 1;
        const prefix = lineNum === currentLine ? '>' : ' ';
        snippet += `${prefix} ${lineNum}: ${lines[i]}\n`;
    }
    return snippet;
}

export const useSimulation = () => {
    const { t } = useI18n();
    const { selectedModel } = useAI();

    const [code, setCode] = useState<string>(INITIAL_PYTHON_CODE);
    const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
    const [state, setState] = useState<SimulationState>(initialState);
    const [promptConfig, setPromptConfig] = useState<PromptConfig>({
        systemPrompt: `You are an expert debugging assistant...`,
        codeContextWindow: 5,
    });

    const resetSimulation = useCallback(() => { setState(initialState); }, []);

    const startSimulation = useCallback(async () => {
        try {
            setState(_s => ({ ...initialState, isGeneratingSimulation: true, error: null }));
            const agentService = getAgentService(selectedModel);
            const steps = await agentService.generateSimulation(code);

            if (steps.length === 0) {
                throw new Error(t('error.simulation.generationFailed'));
            }
            setSimulationSteps(steps);
            setState({
                ...initialState,
                isRunning: true,
                isPaused: true,
                currentStepIndex: 0,
                dapLog: steps[0].dapSequence,
                rawDapPayloads: steps[0].rawDapDetails,
            });
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : t('error.simulation.unknown');
            setState(_s => ({ ...initialState, error: errorMessage }));
        }
    }, [code, t, selectedModel]);

    const handleNextStep = useCallback(async () => {
        if (!state.isRunning || !state.isPaused || state.isAwaitingAI) return;
        if (state.currentStepIndex >= simulationSteps.length - 1) {
            setState(s => ({ ...s, isPaused: false, isAwaitingAI: false, error: t('simulation.end') }));
            return;
        }

        setState(s => ({ ...s, isAwaitingAI: true, error: null, aiResponse: null, highlightedVariable: null }));

        const currentStep = simulationSteps[state.currentStepIndex];

        try {
            const codeSnippet = getCodeSnippet(code, currentStep.line, promptConfig.codeContextWindow);
            const context = `${promptConfig.systemPrompt}

Current state:
- File: ${currentStep.file}
- Paused at line: ${currentStep.line}
- Reason: ${currentStep.pauseReason}

Code Context:
\`\`\`python
${codeSnippet}
\`\`\`

Call Stack:
${JSON.stringify(currentStep.callStack, null, 2)}

Local Variables:
${JSON.stringify(currentStep.variables, null, 2)}
`;
            setState(s => ({ ...s, aiContext: context }));

            const agentService = getAgentService(selectedModel);
            const aiResponse = await agentService.getAIDebugAction(context);

            const nextStepIndex = state.currentStepIndex + 1;
            const nextStep = simulationSteps[nextStepIndex];

            if (!nextStep) {
                setState(s => ({ ...s, isAwaitingAI: false, isPaused: false, error: t('simulation.end'), aiResponse }));
                return;
            }

            setState(s => ({
                ...s,
                isAwaitingAI: false,
                aiResponse: aiResponse,
                currentStepIndex: nextStepIndex,
                dapLog: [...s.dapLog, ...nextStep.dapSequence],
                rawDapPayloads: nextStep.rawDapDetails,
                highlightedVariable: aiResponse.tool === 'inspectVariable' ? aiResponse.variableName || null : null,
            }));

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : t('error.ai.unknown');
            setState(s => ({ ...s, isAwaitingAI: false, error: errorMessage }));
        }
    }, [state, simulationSteps, code, promptConfig, t, selectedModel]);

    const handleApplyFix = useCallback((fix: string) => {
        const currentStep = state.isRunning ? simulationSteps[state.currentStepIndex] : null;
        if (!currentStep) return;
        const currentLine = currentStep.line;
        const lines = code.split('\n');
        if (currentLine > 0 && currentLine <= lines.length) {
            lines[currentLine - 1] = fix;
            const newCode = lines.join('\n');
            setCode(newCode);
            setState(s => ({ ...s, error: "Fix applied. Please reset simulation to verify." }));
        }
    }, [code, state.isRunning, state.currentStepIndex, simulationSteps]);

    return {
        code,
        setCode,
        simulationSteps,
        state,
        promptConfig,
        setPromptConfig,
        resetSimulation,
        startSimulation,
        handleNextStep,
        handleApplyFix
    };
};
