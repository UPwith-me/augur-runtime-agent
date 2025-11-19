// FIX: Removed file extensions from imports for proper module resolution.
import type { AiModel, IAgentService } from '../types';
import { GeminiAgentService } from './agents/GeminiAgentService';
import { MockAgentService } from './agents/MockAgentService';

// A simple cache for service instances
const serviceCache: Partial<Record<AiModel, IAgentService>> = {};

/**
 * Factory function to get an instance of an AI agent service.
 * Implements a simple singleton pattern to avoid re-instantiating services.
 * @param model The identifier for the AI model.
 * @returns An instance of a class that implements the IAgentService interface.
 */
export const getAgentService = (model: AiModel): IAgentService => {
    if (serviceCache[model]) {
        return serviceCache[model] as IAgentService;
    }

    let service: IAgentService;
    switch (model) {
        case 'gemini-2.5-flash':
            service = new GeminiAgentService();
            break;
        case 'mock':
            service = new MockAgentService();
            break;
        default:
            // Fallback to mock agent for any unknown model
            console.warn(`Unknown model: ${model}. Falling back to MockAgentService.`);
            service = new MockAgentService();
            break;
    }

    serviceCache[model] = service;
    return service;
};
