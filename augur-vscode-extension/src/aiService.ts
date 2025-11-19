// 从主 types.ts 导入共享的响应结构
import { AiResponse } from './types';

// 1. 定义插件可用的 AI 模型
export type AiAgentModel = 'gemini' | 'claude';

// 2. 定义所有 AI 代理必须实现的接口
export interface IAiAgentService {
  getAIDebugAction(context: string): Promise<AiResponse>;
}