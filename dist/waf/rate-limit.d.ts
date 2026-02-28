export interface RateLimitResult {
    limited: boolean;
    retryAfterMs?: number;
}
export declare class InMemoryRateLimiter {
    private readonly windowMs;
    private readonly maxRequests;
    private readonly blockDurationMs;
    private states;
    constructor(windowMs: number, maxRequests: number, blockDurationMs: number);
    check(key: string, now?: number): RateLimitResult;
    cleanup(now?: number): void;
}
//# sourceMappingURL=rate-limit.d.ts.map