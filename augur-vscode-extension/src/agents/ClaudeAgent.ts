import { AiResponse } from '../types';
import { IAiAgentService } from '../aiService';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:4000/api/v1';

export class ClaudeAgent implements IAiAgentService {
  
  constructor(apiKey: string) {
    // API Key managed by server.
  }

  async getAIDebugAction(context: string): Promise<AiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/getDebugAction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            context,
            // Updated to the new model ID
            model: 'claude-4-5-sonnet' 
        })
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
            const errorData = await response.json() as any;
            if (errorData && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) { }
        throw new Error(errorMessage);
      }

      const action = await response.json() as AiResponse;
      return action;

    } catch (error) {
      console.error("[Augur/ClaudeAgent] Error getting debug action:", error);
      throw new Error(`Failed to get decision from Augur Service. ${error instanceof Error ? error.message : ''}`);
    }
  }
}