import type { IAgentService, SimulationStep, AiResponse, AiModel } from '../../types';

const API_BASE_URL = 'http://localhost:4000/api/v1';

export class ClaudeAgentService implements IAgentService {
    
    // Updated model ID to 4.5
    private readonly modelId: AiModel = 'claude-4-5-sonnet'; 

    async generateSimulation(code: string): Promise<SimulationStep[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/generateSimulation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    model: this.modelId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            return await response.json() as SimulationStep[];

        } catch (error) {
            console.error("[WebClient] Error generating simulation (Claude):", error);
            throw error;
        }
    }

    async getAIDebugAction(context: string): Promise<AiResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/getDebugAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context,
                    model: this.modelId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            return await response.json() as AiResponse;

        } catch (error) {
            console.error("[WebClient] Error getting debug action (Claude):", error);
            throw error;
        }
    }
}