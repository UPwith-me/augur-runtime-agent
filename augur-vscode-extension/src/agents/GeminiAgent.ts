import { AiResponse } from '../types';
import { IAiAgentService } from '../aiService';
import fetch from 'node-fetch';

// The URL of our new Pattern B server
const API_BASE_URL = 'http://localhost:4000/api/v1';

export class GeminiAgent implements IAiAgentService {

  // Note: We don't need the apiKey in the client anymore, 
  // but we keep the constructor signature compatible or update it.
  // Since the factory calls `new GeminiAgent(apiKey)`, we can ignore the key here.
  constructor(apiKey: string) {
    // The API Key is now managed by the server (augur-debugger-service).
    // We ignore the client-side key.
  }

  async getAIDebugAction(context: string): Promise<AiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/getDebugAction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              context,
              model: 'gemini-2.5-flash'
          })
      });

      if (!response.ok) {
        // Try to parse error message from server
        let errorMessage = `Server error: ${response.status}`;
        try {
            const errorData = await response.json() as any;
            if (errorData && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // Ignore json parse error
        }
        throw new Error(errorMessage);
      }

      const action = await response.json() as AiResponse;
      return action;

    } catch (error) {
      console.error('[Augur/GeminiAgent] Error getting debug action:', error);
      throw new Error(`Failed to get decision from Augur Service. ${error instanceof Error ? error.message : ''}`);
    }
  }
}