// This file will consolidate all types needed by the server
// It's a combination of types from both the web app and the VS Code extension

// From augur-vscode-extension/src/types.ts
export interface AiResponse {
    tool: 'next' | 'stepIn' | 'stepOut' | 'continue' | 'stepOver' | 'stepInto' | 'inspectVariable' | 'proposeFix' | 'setBreakpoint';
    explanation: string;
    variableName?: string;
    fixSuggestion?: string;
    breakpointLine?: number;
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

// Allow any string for model to support generic agents
export type AiModel = string;

export interface GenerateSimulationRequest {
    code: string;
    model: AiModel;
}

export interface GetDebugActionRequest {
    context: string;
    model: AiModel;
    plan?: 'free' | 'paid';
}

export interface IAgentService {
    generateSimulation(code: string): Promise<SimulationStep[]>;
    getAIDebugAction(context: string): Promise<AiResponse>;
}