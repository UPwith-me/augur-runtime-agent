/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import type { SimulationStep, DapMessage, AiModel } from '@/types';
import { INITIAL_PYTHON_CODE } from '@/constants';

interface AiSimulationStep {
    line: number;
    pauseReason: 'breakpoint' | 'step';
    variables: Record<string, any>;
    callStack: string[];
}


const MOCK_FIBONACCI_SIMULATION_RAW: AiSimulationStep[] = [
    { line: 11, pauseReason: 'breakpoint', variables: {}, callStack: ['<module>'] },
    { line: 1, pauseReason: 'step', variables: { n: 5 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 3, pauseReason: 'step', variables: { n: 5 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 5, pauseReason: 'step', variables: { n: 5, a: 0, b: 1 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 6, pauseReason: 'step', variables: { n: 5, a: 0, b: 1, '_': 0 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 7, pauseReason: 'step', variables: { n: 5, a: 1, b: 1, '_': 0 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 6, pauseReason: 'step', variables: { n: 5, a: 1, b: 1, '_': 1 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 7, pauseReason: 'step', variables: { n: 5, a: 1, b: 2, '_': 1 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 6, pauseReason: 'step', variables: { n: 5, a: 1, b: 2, '_': 2 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 7, pauseReason: 'step', variables: { n: 5, a: 2, b: 3, '_': 2 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 6, pauseReason: 'step', variables: { n: 5, a: 2, b: 3, '_': 3 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 7, pauseReason: 'step', variables: { n: 5, a: 3, b: 5, '_': 3 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 8, pauseReason: 'step', variables: { n: 5, a: 3, b: 5 }, callStack: ['<module>', 'fibonacci(n=5)'] },
    { line: 11, pauseReason: 'step', variables: { result: 5 }, callStack: ['<module>'] },
    { line: 12, pauseReason: 'step', variables: { result: 5 }, callStack: ['<module>'] },
];


function createDapSequenceForStep(dapId: number, stepData: AiSimulationStep): { dapSequence: DapMessage[], rawDapDetails: object, nextId: number } {
    const messages: DapMessage[] = [];
    let currentId = dapId;

    if (stepData.pauseReason === 'breakpoint') {
        messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: 'breakpoint', threadId: 1, text: 'Paused on breakpoint' } });
        messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'stackTrace', payload: { threadId: 1 } });
        messages.push({ id: currentId++, type: 'response', direction: 'in', command: 'stackTrace', payload: { stackFrames: [{ id: 1000, name: stepData.callStack[0] || 'main', line: stepData.line, source: {name: 'main.py'}}] } });
        messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'scopes', payload: { frameId: 1000 } });
        messages.push({ id: currentId++, type: 'response', direction: 'in', command: 'scopes', payload: { scopes: [{ name: 'Locals', variablesReference: 1001 }] } });
    } else {
        messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'next', payload: { threadId: 1 } });
        messages.push({ id: currentId++, type: 'response', direction: 'in', command: 'next', payload: {} });
        messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: 'step', threadId: 1 } });
    }
    
    const rawDapDetails = {
        command: stepData.pauseReason === 'breakpoint' ? 'initial stop' : 'next',
        stopped: { reason: stepData.pauseReason },
        variables: stepData.variables,
    };

    return { dapSequence: messages, rawDapDetails, nextId: currentId };
}

function hydrateSimulationSteps(steps: AiSimulationStep[]): SimulationStep[] {
    let dapId = 1;
    return steps.map(step => {
        const { dapSequence, rawDapDetails, nextId } = createDapSequenceForStep(dapId, step);
        dapId = nextId;
        return { ...step, file: 'main.py', dapSequence, rawDapDetails };
    });
}

async function generateWithGemini(code: string): Promise<SimulationStep[]> {
     try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("APIKeyError: VITE_GEMINI_API_KEY is not set. Please create a .env.local file and add your key.");
        }
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
You are an expert Python debugger. Your task is to trace the execution of the following Python code and generate a series of simulation steps representing the state of the debugger at each pause point.
Rules:
1. Trace the code execution line by line, as a step-through debugger would.
2. The first step MUST have 'breakpoint' as the pauseReason and be on the first executable line. Subsequent steps MUST have 'step' as the pauseReason.
3. For each step, provide the line number, the call stack, and the state of ALL local variables currently in scope.
4. The call stack should be an array of strings. For the global scope, use '<module>'. For functions, use the format 'function_name(arg1=value1)'.
5. Variables should be a JSON object where keys are variable names and values are their corresponding JSON-compatible values (string, number, boolean, array, object).
6. The simulation should trace the entire execution until the program finishes. Do not stop prematurely.
7. Provide the output as a JSON object, adhering to the provided schema.

Python Code:
---
${code}
---
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        steps: {
                            type: Type.ARRAY,
                            description: "An array of debugging steps.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    line: { type: Type.INTEGER, description: "The line number where the debugger is paused." },
                                    pauseReason: { type: Type.STRING, enum: ['breakpoint', 'step'], description: "Reason for pausing." },
                                    
                                    // --- 最终修复 (基于搜索验证) ---
                                    variables: {
                                        type: Type.OBJECT,
                                        description: "A key-value map of local variables in scope.",
                                        // 1. 添加一个“虚拟”属性来满足 "non-empty" 验证要求。
                                        properties: {
                                            _virtual: { type: Type.STRING } 
                                        },
                                        // 2. 仍然使用 "additionalProperties" 来允许任何其他键（即我们的实际变量）。
                                        additionalProperties: {
                                            type: [Type.STRING, Type.NUMBER, Type.BOOLEAN, Type.ARRAY, Type.OBJECT, Type.NULL]
                                        }
                                    },
                                    // --- 修复结束 ---

                                    callStack: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The current call stack." }
                                },
                                required: ["line", "pauseReason", "variables", "callStack"]
                            }
                        }
                    },
                    required: ["steps"]
                }
            }
        });

        const jsonString = (response.text || "").trim();
        const parsedResponse = JSON.parse(jsonString);
        const aiSteps: AiSimulationStep[] = parsedResponse.steps;

        if (!aiSteps || !Array.isArray(aiSteps) || aiSteps.length === 0) {
            throw new Error("AI failed to generate valid simulation steps.");
        }
        
        return hydrateSimulationSteps(aiSteps);

    } catch (error) {
        console.error("Error generating simulation with Gemini API:", error);
        if (error instanceof Error && error.message.includes("API key")) {
                throw new Error("APIKeyError: Please check if the API key is valid or provided in your .env.local file as VITE_GEMINI_API_KEY.");
        }
        if (error instanceof Error && error.message.includes("INVALID_ARGUMENT")) {
            throw new Error("API Schema Error: The AI model could not follow the requested JSON format. Please check the schema.");
        }
        throw new Error("Failed to generate simulation. The AI model may be unavailable or the code is invalid.");
    }
}

function generateWithMock(code: string): Promise<SimulationStep[]> {
    if (code.trim() !== INITIAL_PYTHON_CODE.trim()) {
        throw new Error("The Mock Agent only supports the default Fibonacci code. Please use a real AI model for custom code.");
    }
    const hydratedSteps = hydrateSimulationSteps(MOCK_FIBONACCI_SIMULATION_RAW);
    return Promise.resolve(hydratedSteps);
}


export const generateSimulation = (code: string, model: AiModel): Promise<SimulationStep[]> => {
    if (model === 'mock') {
        return generateWithMock(code);
    }
    return generateWithGemini(code);
};