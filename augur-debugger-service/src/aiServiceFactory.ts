import type { AiModel, IAgentService } from './types';
import { GeminiAgent } from './agents/geminiAgent';
import { MockAgent } from './agents/mockAgent';
import { ClaudeAgent } from './agents/claudeAgent';
import { GenericOpenAIAgent } from './agents/GenericOpenAIAgent';

const serviceCache: Partial<Record<string, IAgentService>> = {};

function getOrCreateAgent(model: string, createFn: () => IAgentService): IAgentService {
    if (serviceCache[model]) {
        return serviceCache[model] as IAgentService;
    }
    const service = createFn();
    serviceCache[model] = service;
    return service;
}

export const getAgentService = (model: AiModel): IAgentService => {
    switch (model) {
        case 'gemini-2.5-pro':
        case 'gemini-1.5-pro':
            return getOrCreateAgent('gemini', () => new GeminiAgent());

        case 'claude-4-5-sonnet':
            return getOrCreateAgent('claude', () => new ClaudeAgent());

        case 'mock':
            return getOrCreateAgent('mock', () => new MockAgent());

        default:
            console.log(`[Factory] Unknown model '${model}'. Using GenericOpenAIAgent.`);
            return getOrCreateAgent(model, () => new GenericOpenAIAgent(model));
    }
};