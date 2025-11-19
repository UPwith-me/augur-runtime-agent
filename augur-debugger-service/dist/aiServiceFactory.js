"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentService = void 0;
const geminiAgent_1 = require("./agents/geminiAgent");
const mockAgent_1 = require("./agents/mockAgent");
const claudeAgent_1 = require("./agents/claudeAgent");
const serviceCache = {};
function getOrCreateAgent(model, createFn) {
    if (serviceCache[model]) {
        return serviceCache[model];
    }
    const service = createFn();
    serviceCache[model] = service;
    return service;
}
const getAgentService = (model) => {
    switch (model) {
        // --- 升级：切换到 Pro 模型 ---
        case 'gemini-2.5-pro': // <-- 已从 'flash' 更改
            return getOrCreateAgent(model, () => new geminiAgent_1.GeminiAgent());
        // --- 升级结束 ---
        // Updated to use the new ID: claude-4-5-sonnet
        case 'claude-4-5-sonnet':
            return getOrCreateAgent(model, () => new claudeAgent_1.ClaudeAgent());
        case 'mock':
            return getOrCreateAgent(model, () => new mockAgent_1.MockAgent());
        default:
            console.warn(`Unknown model: ${model}. Falling back to MockAgent.`);
            return getOrCreateAgent('mock', () => new mockAgent_1.MockAgent());
    }
};
exports.getAgentService = getAgentService;
