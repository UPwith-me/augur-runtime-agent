const timeSinceLastCall = now - lastCallTimestamp;

// 如果距离上次调用不足设定的最小间隔
if (timeSinceLastCall < MIN_INTERVAL_MS) {
    // 计算还需要等待多长时间
    const waitTime = MIN_INTERVAL_MS - timeSinceLastCall;

    console.log(`[Rate Limiter] 免费套餐速率限制已激活。为保证稳定，等待 ${waitTime.toFixed(0)}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}
    }

lastCallTimestamp = Date.now();
}