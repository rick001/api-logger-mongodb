import { Request } from 'express';
import { WafDecision, WafMetricsSnapshot, WafOptions } from '../types';
export declare class WafEngine {
    private readonly options;
    private readonly rules;
    private readonly rateLimiter;
    private metrics;
    constructor(options: WafOptions);
    evaluate(req: Request): WafDecision;
    getMetrics(): WafMetricsSnapshot;
    private resolveEffectiveSettings;
    private evaluateRateLimit;
    private getInspectStrings;
    private stringifyWithLimit;
    private resolveAction;
    private buildDecision;
    private captureOutcome;
}
//# sourceMappingURL=engine.d.ts.map