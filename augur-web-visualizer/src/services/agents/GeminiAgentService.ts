import type { IAgentService, SimulationStep, AiResponse, AiModel } from '../../types';

// The URL of our new Pattern B server
// In production, this would be an environment variable (VITE_API_URL)
const API_BASE_URL = 'http://localhost:4000/api/v1';

export class GeminiAgentService implements IAgentService {
    
    private readonly modelId: AiModel = 'gemini-2.5-flash';

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

            const steps = await response.json();
            return steps as SimulationStep[];

        } catch (error) {
            console.error("[WebClient] Error generating simulation:", error);
            throw error; // Re-throw to be caught by UI
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

            const action = await response.json();
            return action as AiResponse;

        } catch (error) {
            console.error("[WebClient] Error getting debug action:", error);
            throw error;
        }
    }
}