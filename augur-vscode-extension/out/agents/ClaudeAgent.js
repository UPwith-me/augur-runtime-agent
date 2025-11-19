"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAgent = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const API_BASE_URL = 'http://localhost:4000/api/v1';
class ClaudeAgent {
    constructor(apiKey) {
        // API Key managed by server.
    }
    async getAIDebugAction(context) {
        try {
            const response = await (0, node_fetch_1.default)(`${API_BASE_URL}/getDebugAction`, {
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
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorMessage = errorData.message;
                    }
                }
                catch (e) { }
                throw new Error(errorMessage);
            }
            const action = await response.json();
            return action;
        }
        catch (error) {
            console.error("[Augur/ClaudeAgent] Error getting debug action:", error);
            throw new Error(`Failed to get decision from Augur Service. ${error instanceof Error ? error.message : ''}`);
        }
    }
}
exports.ClaudeAgent = ClaudeAgent;
//# sourceMappingURL=ClaudeAgent.js.map