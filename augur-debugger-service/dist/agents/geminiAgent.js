"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAgent = void 0;
const genai_1 = require("@google/genai");
// (这是我们上一步添加的系统提示词)
const GEMINI_SYSTEM_PROMPT = `You are an expert Python debugger AI named Augur. Your sole objective is to find and fix potential BUGs in the user's code.

You will receive a JSON context representing the *current* state of the debugger (why it stopped).

Your task is to analyze this context and choose the *single best tool* to move the debugging process forward towards finding a bug.

**Rules:**
1.  **Prioritize \`stepInto\`:** DO NOT just use \`stepOver\` repeatedly. If the current line of code (which you may not see yet) is a call to a custom function (e.g., \`my_function(...)\`, \`lru.put(...)\`), you **MUST** prioritize using \`stepInto\` to inspect its internal logic. This is the only way to find hidden bugs.
2.  **Use \`proposeFix\`:** If you have enough information to identify a bug, use \`proposeFix\`.
3.  **Use \`stepOver\`:** Use \`stepOver\` only for simple lines (like \`print()\`, variable assignments) where you are certain no bugs are hiding inside.

Here is the current debugger context (as JSON):
---
%CONTEXT%
---
Now, choose the best tool to find the bug.`;
class GeminiAgent {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("APIKeyError: GEMINI_API_KEY is not set.");
        }
        const baseUrl = process.env.GEMINI_API_BASE_URL;
        this.ai = new genai_1.GoogleGenAI({
            apiKey: apiKey,
            ...(baseUrl ? { baseUrl: baseUrl } : {})
        });
    }
    async generateSimulation(code) {
        try {
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
            const response = await this.ai.models.generateContent({
                // --- 升级：切换到 Pro 模型 ---
                model: "gemini-2.5-pro", // <-- 已从 'flash' 更改
                // --- 升级结束 ---
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            steps: {
                                type: genai_1.Type.ARRAY,
                                description: "An array of debugging steps.",
                                items: {
                                    type: genai_1.Type.OBJECT,
                                    properties: {
                                        line: { type: genai_1.Type.INTEGER, description: "The line number where the debugger is paused." },
                                        pauseReason: { type: genai_1.Type.STRING, enum: ['breakpoint', 'step'], description: "Reason for pausing." },
                                        variables: {
                                            type: genai_1.Type.OBJECT,
                                            description: "A key-value map of local variables in scope.",
                                            properties: {
                                                _virtual: { type: genai_1.Type.STRING }
                                            },
                                            additionalProperties: {
                                                type: [genai_1.Type.STRING, genai_1.Type.NUMBER, genai_1.Type.BOOLEAN, genai_1.Type.ARRAY, genai_1.Type.OBJECT, genai_1.Type.NULL]
                                            }
                                        },
                                        callStack: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.STRING }, description: "The current call stack." }
                                    },
                                    required: ["line", "pauseReason", "variables", "callStack"]
                                }
                            }
                        },
                        required: ["steps"]
                    }
                }
            });
            const text = response.text || "";
            if (!text) {
                throw new Error("Gemini API returned empty response.");
            }
            const jsonString = text.trim();
            const parsedResponse = JSON.parse(jsonString);
            const aiSteps = parsedResponse.steps;
            if (!aiSteps || !Array.isArray(aiSteps) || aiSteps.length === 0) {
                throw new Error("AI failed to generate valid simulation steps.");
            }
            let dapId = 1;
            const fullSimulationSteps = aiSteps.map(step => {
                const { dapSequence, rawDapDetails, nextId } = this.createDapSequenceForStep(dapId, step);
                dapId = nextId;
                return { ...step, file: 'main.py', dapSequence, rawDapDetails };
            });
            return fullSimulationSteps;
        }
        catch (error) {
            console.error("Error generating simulation with Gemini API:", error);
            if (error.message.includes("API key")) {
                throw new Error("APIKeyError: Please check if the API key is valid or provided.");
            }
            if (error.message.includes("INVALID_ARGUMENT")) {
                console.error('Gemini API Schema Error Details:', error.message);
                throw new Error("API Schema Error: The AI model could not follow the requested JSON format. Please check the schema.");
            }
            throw new Error(`Failed to generate simulation. ${error.message}`);
        }
    }
    async getAIDebugAction(context) {
        try {
            const prompt = GEMINI_SYSTEM_PROMPT.replace('%CONTEXT%', context);
            const response = await this.ai.models.generateContent({
                // --- 升级：切换到 Pro 模型 ---
                model: "gemini-2.5-pro", // <-- 已从 'flash' 更改
                // --- 升级结束 ---
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            tool: {
                                type: genai_1.Type.STRING,
                                description: "The debugging action: 'stepOver', 'stepInto', 'continue', 'inspectVariable', 'proposeFix', 'setBreakpoint'."
                            },
                            variableName: { type: genai_1.Type.STRING },
                            fixSuggestion: { type: genai_1.Type.STRING },
                            breakpointLine: {
                                type: genai_1.Type.INTEGER,
                                description: "The line number to set a breakpoint at. ONLY if tool is 'setBreakpoint'."
                            },
                            explanation: { type: genai_1.Type.STRING }
                        },
                        required: ["tool", "explanation"]
                    },
                },
            });
            const text = response.text || "";
            if (!text) {
                throw new Error("Gemini API returned empty response.");
            }
            const jsonString = text.trim();
            return JSON.parse(jsonString);
        }
        catch (error) {
            console.error("Error calling Gemini API:", error);
            throw new Error(`GeminiAPIError: ${error.message}`);
        }
    }
    createDapSequenceForStep(dapId, stepData) {
        const messages = [];
        let currentId = dapId;
        if (stepData.pauseReason === 'breakpoint') {
            messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: 'breakpoint', threadId: 1, text: 'Paused on breakpoint' } });
            messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'stackTrace', payload: { threadId: 1 } });
            messages.push({ id: currentId++, type: 'response', direction: 'in', command: 'stackTrace', payload: { stackFrames: [{ id: 1000, name: stepData.callStack[0] || 'main', line: stepData.line, source: { name: 'main.py' } }] } });
            messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'scopes', payload: { frameId: 1000 } });
            messages.push({ id: currentId++, type: 'response', direction: 'in', command: 'scopes', payload: { scopes: [{ name: 'Locals', variablesReference: 1001 }] } });
        }
        else {
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
}
exports.GeminiAgent = GeminiAgent;
