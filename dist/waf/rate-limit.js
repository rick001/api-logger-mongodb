"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryRateLimiter = void 0;
class InMemoryRateLimiter {
    constructor(windowMs, maxRequests, blockDurationMs) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.blockDurationMs = blockDurationMs;
        this.states = new Map();
    }
    check(key, now = Date.now()) {
        const existing = this.states.get(key);
        if (!existing) {
            this.states.set(key, { windowStart: now, count: 1, blockedUntil: null });
            return { limited: false };
        }
        if (existing.blockedUntil !== null && now < existing.blockedUntil) {
            return { limited: true, retryAfterMs: existing.blockedUntil - now };
        }
        if (now - existing.windowStart >= this.windowMs) {
            existing.windowStart = now;
            existing.count = 1;
            existing.blockedUntil = null;
            return { limited: false };
        }
        existing.count += 1;
        if (existing.count <= this.maxRequests) {
            return { limited: false };
        }
        existing.blockedUntil = now + this.blockDurationMs;
        return { limited: true, retryAfterMs: this.blockDurationMs };
    }
    cleanup(now = Date.now()) {
        for (const [key, state] of this.states) {
            const stale = now - state.windowStart > this.windowMs * 2 &&
                (state.blockedUntil === null || now >= state.blockedUntil);
            if (stale) {
                this.states.delete(key);
            }
        }
    }
}
exports.InMemoryRateLimiter = InMemoryRateLimiter;
//# sourceMappingURL=rate-limit.js.map