import type { IAgentService, SimulationStep, AiResponse, DapMessage } from '../types';
import fetch from 'node-fetch';

// Define types for Claude API
interface ClaudeMessageRequest {
  model: string;
  max_tokens: number;
  system?: string; 
  messages: { role: 'user' | 'assistant', content: string }[];
  tool_choice: { type: 'tool', name: string };
  tools: any[];
}
interface ClaudeMessageResponse {
  content: { type: string; text?: string; input?: any; }[];
  stop_reason: string;
}
function extractToolCallJson(response: ClaudeMessageResponse): any {
    if (response.stop_reason === 'tool_use' && response.content) {
        const toolUseBlock = response.content.find(block => block.type === 'tool_use');
        if (toolUseBlock && toolUseBlock.input) {
            return toolUseBlock.input;
        }
    }
    throw new Error("Claude API did not return a valid tool call.");
}

export class ClaudeAgent implements IAgentService {
  
  private apiKey: string;
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  // Updated to the latest model: Claude 4.5 Sonnet (Released Sep 2025)
  private readonly MODEL_ID = 'claude-sonnet-4-5-20250929';

  constructor() {
    const key = process.env.CLAUDE_API_KEY;
    if (!key) {
      console.error("CLAUDE_API_KEY is not set in .env file.");
      throw new Error("APIKeyError: CLAUDE_API_KEY is not set.");
    }
    this.apiKey = key;
  }

  async generateSimulation(code: string): Promise<SimulationStep[]> {
    // Updated system prompt for Claude 4.5 Sonnet
    const systemPrompt = `You are an expert Python debugger powered by Claude 4.5 Sonnet. 
Trace the execution of the following Python code and generate a detailed simulation trace.

Rules:
1. The first step MUST be at the first executable line with pauseReason 'breakpoint'.
2. Subsequent steps MUST have pauseReason 'step'.
3. Trace the execution line-by-line until the program terminates.
4. For each step, strictly record the line number, call stack, and ALL local variables.
5. Output MUST be a JSON object via the 'record_simulation_steps' tool.

<tool_definition>
{
  "name": "record_simulation_steps",
  "input_schema": {
    "type": "object",
    "properties": {
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "line": { "type": "integer" },
            "pauseReason": { "type": "string", "enum": ["breakpoint", "step"] },
            "variables": { "type": "object", "additionalProperties": true },
            "callStack": { "type": "array", "items": { "type": "string" } }
          },
          "required": ["line", "pauseReason", "variables", "callStack"]
        }
      }
    },
    "required": ["steps"]
  }
}
</tool_definition>`;

    const requestBody: ClaudeMessageRequest = {
      model: this.MODEL_ID,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Here is the Python code to trace:\n\n\`\`\`python\n${code}\n\`\`\`` }],
      tool_choice: { type: 'tool', name: 'record_simulation_steps' },
      tools: [
        {
          "name": "record_simulation_steps",
          "description": "Records the complete debugging simulation trace.",
          "input_schema": {
            "type": "object",
            "properties": {
              "steps": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "line": { "type": "integer" },
                    "pauseReason": { "type": "string", "enum": ["breakpoint", "step"] },
                    "variables": { "type": "object", "additionalProperties": true },
                    "callStack": { "type": "array", "items": { "type": "string" } }
                  },
                  "required": ["line", "pauseReason", "variables", "callStack"]
                }
              }
            },
            "required": ["steps"]
          }
        }
      ]
    };

    try {
      const response = await fetch(this.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody as any)
      });

      if (!response.ok) {
        throw new Error(`Claude API request failed with status ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json() as ClaudeMessageResponse;
      const toolCallJson = extractToolCallJson(responseData);

      let dapId = 1;
      const hydratedSteps: SimulationStep[] = (toolCallJson.steps || []).map((step: any) => {
          const { dapSequence, rawDapDetails, nextId } = this.createDapSequenceForStep(dapId, step);
          dapId = nextId;
          return { ...step, file: 'main.py', dapSequence, rawDapDetails };
      });
      
      return hydratedSteps;

    } catch (error) {
      console.error("Error in ClaudeAgent.generateSimulation:", error);
      throw new Error(`Claude API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAIDebugAction(context: string): Promise<AiResponse> {
    
    const decisionToolSchema = {
      "name": "record_debug_decision",
      "description": "Records the AI's chosen debugging action and its reasoning.",
      "input_schema": {
        "type": "object",
        "properties": {
          "tool": {
            "type": "string",
            "enum": ["stepOver", "stepInto", "continue", "inspectVariable", "proposeFix", "setBreakpoint"],
            "description": "The debugging action to take."
          },
          "variableName": { "type": "string" },
          "fixSuggestion": { "type": "string" },
          "breakpointLine": { "type": "integer" },
          "explanation": { "type": "string" }
        },
        "required": ["tool", "explanation"]
      }
    };

    const requestBody: ClaudeMessageRequest = {
      model: this.MODEL_ID,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: `${context}\n\nNow, analyze the state and choose the next action by calling the 'record_debug_decision' tool.` },
        { role: 'assistant', content: "Thinking... I will analyze the context and select the appropriate tool." }
      ],
      tool_choice: { type: 'tool', name: 'record_debug_decision' },
      tools: [ decisionToolSchema ]
    };

    try {
      const response = await fetch(this.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'tools-2024-04-04'
        },
        body: JSON.stringify(requestBody as any)
      });

      if (!response.ok) {
        throw new Error(`Claude API request failed with status ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json() as ClaudeMessageResponse;
      const toolCallJson = extractToolCallJson(responseData);

      return toolCallJson as AiResponse;

    } catch (error) {
      console.error("Error in ClaudeAgent.getAIDebugAction:", error);
      throw new Error(`Claude API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createDapSequenceForStep(dapId: number, stepData: any): { dapSequence: DapMessage[], rawDapDetails: object, nextId: number } {
    const messages: DapMessage[] = [];
    let currentId = dapId;
    if (stepData.pauseReason === 'breakpoint') {
        messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: 'breakpoint' } } as DapMessage);
    } else {
        messages.push({ id: currentId++, type: 'request', direction: 'out', command: 'next', payload: {} } as DapMessage);
        messages.push({ id: currentId++, type: 'event', direction: 'in', command: 'stopped', payload: { reason: 'step' } } as DapMessage);
    }
    const rawDapDetails = { variables: stepData.variables };
    return { dapSequence: messages, rawDapDetails, nextId: currentId };
  }
}