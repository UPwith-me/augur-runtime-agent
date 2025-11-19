// FIX: Add comprehensive type definitions for the entire application (VS Code extension and web UI).

// This `AiResponse` is a union of types needed by the VS Code extension and the web UI.
export interface AiResponse {
    // --- 变更 (STAGE 1) ---
    // 添加了 'proposeFix' 工具
    tool: 'next' | 'stepIn' | 'stepOut' | 'continue' | 'stepOver' | 'stepInto' | 'inspectVariable' | 'proposeFix';
    explanation: string;
    variableName?: string; // Only used by the web UI's 'inspectVariable' tool
    fixSuggestion?: string; // <-- 1. 添加新字段, 用于 AI 提议的代码
    // --- 变更结束 ---
}

// Updated AiModel type to Claude 4.5 Sonnet
export type AiModel = 'gemini-2.5-flash' | 'mock' | 'claude-4-5-sonnet';

export interface PromptConfig {
    systemPrompt: string;
    codeContextWindow: number;
}

export interface DapMessage {
    id: number;
    type: 'event' | 'request' | 'response';
    direction: 'in' | 'out';
    command: string;
    payload: any;
}

export interface SimulationStep {
    line: number;
    file: string;
    pauseReason: 'breakpoint' | 'step';
    variables: Record<string, any>;
    callStack: string[];
    dapSequence: DapMessage[];
    rawDapDetails: object;
}

export interface SimulationState {
    isRunning: boolean;
    isPaused: boolean;
    isAwaitingAI: boolean;
    isGeneratingSimulation: boolean;
    error: string | null;
    currentStepIndex: number;
    dapLog: DapMessage[];
    aiContext: string;
    aiResponse: AiResponse | null;
    highlightedVariable: string | null;
    rawDapPayloads: object | null;
}

export interface IAgentService {
    generateSimulation(code: string): Promise<SimulationStep[]>;
    getAIDebugAction(context: string): Promise<AiResponse>;
}