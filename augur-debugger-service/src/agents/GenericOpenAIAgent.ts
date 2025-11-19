import fetch from 'node-fetch';
import type { IAgentService, SimulationStep, AiResponse, DapMessage } from '../types';

export class GenericOpenAIAgent implements IAgentService {
    private baseUrl: string;
    private apiKey: string;
    private model: string;

    constructor(modelName: string) {
        this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.model = modelName;

        if (!this.apiKey) {
            console.warn('[GenericOpenAIAgent] Warning: OPENAI_API_KEY is not set. Requests may fail.');
        }
    }

    async generateSimulation(code: string): Promise<SimulationStep[]> {
        const prompt = `
You are an expert Python debugger. Trace the execution of the following code line by line.
Return a JSON object with a "steps" array.
Each step must have:
- line: number
- pauseReason: "breakpoint" (first step) or "step"
- variables: object (all local variables)
- callStack: array of strings

Code:
${code}
`;
        try {
            const response = await this.callOpenAI(prompt, true);
            const steps = JSON.parse(response).steps;

            let dapId = 1;
            return steps.map((step: any) => {
                const { dapSequence, rawDapDetails, nextId } = this.createDapSequenceForStep(dapId, step);
                dapId = nextId;
                return { ...step, file: 'main.py', dapSequence, rawDapDetails };
            });
        } catch (error: any) {
            console.error('[GenericOpenAIAgent] Simulation failed:', error);
            throw new Error(`Failed to generate simulation: ${error.message}`);
        }
    }

    async getAIDebugAction(context: string): Promise<AiResponse> {
        const prompt = `
You are an expert debugging assistant.
Analyze the current state and choose the next best debugging action.
Return a JSON object with:
- tool: "next", "stepIn", "stepOut", "continue", "proposeFix", "setBreakpoint"
- explanation: string
- fixSuggestion: string (only if tool is proposeFix)
- breakpointLine: number (only if tool is setBreakpoint)

Context:
${context}
`;
        try {
            const response = await this.callOpenAI(prompt, true);
            return JSON.parse(response) as AiResponse;
        } catch (error: any) {
            console.error('[GenericOpenAIAgent] Action failed:', error);
            throw new Error(`Failed to get debug action: ${error.message}`);
        }
    }

    private async callOpenAI(prompt: string, jsonMode: boolean = false): Promise<string> {
        const url = `${this.baseUrl}/chat/completions`;
        const body = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
        }

        const data = await res.json() as any;
        return data.choices[0].message.content;
    }

    private createDapSequenceForStep(dapId: number, stepData: any): { dapSequence: DapMessage[], rawDapDetails: object, nextId: number } {
        // Simplified DAP sequence generation
        const messages: DapMessage[] = [];
        let currentId = dapId;

        // ... (Reuse logic from GeminiAgent or simplify)
        // For brevity, using a minimal implementation
        messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: stepData.pauseReason, threadId: 1 } });

        return {
            dapSequence: messages,
            rawDapDetails: { variables: stepData.variables },
            nextId: currentId
        };
    }
}
