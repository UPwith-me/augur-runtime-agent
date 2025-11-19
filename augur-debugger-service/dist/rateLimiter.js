"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceFreeTierLimit = enforceFreeTierLimit;
const freeTierCallTimestamps = [];
const MAX_CALLS_PER_MINUTE = 2;
const ONE_MINUTE_IN_MS = 60 * 1000;
async function enforceFreeTierLimit() {
    const now = Date.now();
    // 1. 移除所有一分钟以前的旧时间戳
    while (freeTierCallTimestamps.length > 0 && now - freeTierCallTimestamps[0] > ONE_MINUTE_IN_MS) {
        freeTierCallTimestamps.shift(); // 移除队列头部的旧时间戳
    }
    // 2. 检查当前队列中的调用次数是否已达到上限
    if (freeTierCallTimestamps.length >= MAX_CALLS_PER_MINUTE) {
        // 计算需要等待多长时间才能进行下一次调用
        const timeSinceFirstCallInWindow = now - freeTierCallTimestamps[0];
        const waitTime = ONE_MINUTE_IN_MS - timeSinceFirstCallInWindow;
        if (waitTime > 0) {
            console.log(`[Rate Limiter] 免费套餐速率限制已达到。等待 ${waitTime.toFixed(0)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    // 3. 记录本次（可能等待后的）调用时间
    freeTierCallTimestamps.push(Date.now());
}
