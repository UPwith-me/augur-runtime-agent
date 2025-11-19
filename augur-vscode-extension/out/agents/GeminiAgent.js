"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAgent = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
// The URL of our new Pattern B server
const API_BASE_URL = 'http://localhost:4000/api/v1';
class GeminiAgent {
    // Note: We don't need the apiKey in the client anymore, 
    // but we keep the constructor signature compatible or update it.
    // Since the factory calls `new GeminiAgent(apiKey)`, we can ignore the key here.
    constructor(apiKey) {
        // The API Key is now managed by the server (augur-debugger-service).
        // We ignore the client-side key.
    }
    async getAIDebugAction(context) {
        try {
            const response = await (0, node_fetch_1.default)(`${API_BASE_URL}/getDebugAction`, {
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
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorMessage = errorData.message;
                    }
                }
                catch (e) {
                    // Ignore json parse error
                }
                throw new Error(errorMessage);
            }
            const action = await response.json();
            return action;
        }
        catch (error) {
            console.error('[Augur/GeminiAgent] Error getting debug action:', error);
            throw new Error(`Failed to get decision from Augur Service. ${error instanceof Error ? error.message : ''}`);
        }
    }
}
exports.GeminiAgent = GeminiAgent;
//# sourceMappingURL=GeminiAgent.js.map