"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafEngine = void 0;
const managed_rules_1 = require("./managed-rules");
const rate_limit_1 = require("./rate-limit");
class WafEngine {
    constructor(options) {
        this.options = options;
        this.metrics = {
            totalRequests: 0,
            totalEvaluated: 0,
            totalAllowed: 0,
            totalLogged: 0,
            totalSoftBlocked: 0,
            totalBlocked: 0,
            totalRateLimited: 0,
            totalErrors: 0,
            totalRuleMatches: 0,
            totalEvaluationMs: 0
        };
        const managedRules = this.options.disableManagedRules
            ? []
            : (0, managed_rules_1.getManagedRules)({
                ...(this.options.includeManagedRuleCategories
                    ? { includeCategories: this.options.includeManagedRuleCategories }
                    : {}),
                ...(this.options.excludeManagedRuleIds
                    ? { excludeRuleIds: this.options.excludeManagedRuleIds }
                    : {})
            });
        this.rules = [...managedRules, ...(this.options.rules || [])].filter((rule) => rule.enabled !== false);
        const rateLimit = this.options.rateLimit;
        this.rateLimiter =
            rateLimit?.enabled === true
                ? new rate_limit_1.InMemoryRateLimiter(rateLimit.windowMs || 60000, rateLimit.maxRequests || 120, rateLimit.blockDurationMs || 60000)
                : null;
    }
    evaluate(req) {
        const startedAt = Date.now();
        this.metrics.totalRequests += 1;
        try {
            if (this.options.enabled !== true) {
                return this.buildDecision('allow', true, 200, 0, [], 'WAF disabled');
            }
            this.metrics.totalEvaluated += 1;
            this.rateLimiter?.cleanup(startedAt);
            const effective = this.resolveEffectiveSettings(req);
            const rateLimitDecision = this.evaluateRateLimit(req, effective);
            if (rateLimitDecision) {
                return rateLimitDecision;
            }
            const inspectTargets = this.getInspectStrings(req);
            const matches = [];
            let score = 0;
            const explicitActions = [];
            for (const rule of this.rules) {
                for (const target of rule.targets) {
                    const input = inspectTargets[target];
                    if (!input) {
                        continue;
                    }
                    const pattern = getNonGlobalRegex(rule.pattern);
                    if (!pattern.test(input)) {
                        continue;
                    }
                    const action = rule.action || 'log';
                    const ruleScore = rule.score ?? 10;
                    score += ruleScore;
                    explicitActions.push(action);
                    matches.push({
                        id: rule.id,
                        name: rule.name,
                        score: ruleScore,
                        action,
                        target,
                        valuePreview: input.slice(0, this.options.sizeLimits?.maxPreviewLength || 120)
                    });
                    break;
                }
            }
            this.metrics.totalRuleMatches += matches.length;
            const action = this.resolveAction(score, explicitActions, matches.length, effective.mode, {
                log: effective.logThreshold,
                softBlock: effective.softBlockThreshold,
                block: effective.blockThreshold
            });
            const decision = this.buildDecision(action, action === 'allow' || action === 'log', action === 'allow' || action === 'log' ? 200 : this.options.statusCode || 403, score, matches);
            this.captureOutcome(decision, Date.now() - startedAt);
            this.options.onDecision?.(decision, req);
            return decision;
        }
        catch (error) {
            this.metrics.totalErrors += 1;
            this.options.onError?.(error, req);
            const failOpen = this.options.failOpen !== false;
            const decision = this.buildDecision(failOpen ? 'allow' : 'block', failOpen, failOpen ? 200 : this.options.statusCode || 403, 0, [], 'WAF evaluation error');
            this.captureOutcome(decision, Date.now() - startedAt);
            return decision;
        }
    }
    getMetrics() {
        const averageEvaluationMs = this.metrics.totalEvaluated === 0
            ? 0
            : this.metrics.totalEvaluationMs / this.metrics.totalEvaluated;
        return {
            totalRequests: this.metrics.totalRequests,
            totalEvaluated: this.metrics.totalEvaluated,
            totalAllowed: this.metrics.totalAllowed,
            totalLogged: this.metrics.totalLogged,
            totalSoftBlocked: this.metrics.totalSoftBlocked,
            totalBlocked: this.metrics.totalBlocked,
            totalRateLimited: this.metrics.totalRateLimited,
            totalErrors: this.metrics.totalErrors,
            totalRuleMatches: this.metrics.totalRuleMatches,
            averageEvaluationMs
        };
    }
    resolveEffectiveSettings(req) {
        const url = req.originalUrl || req.url;
        const matchOverride = this.options.routeOverrides?.find((item) => item.route.test(url));
        return {
            mode: matchOverride?.mode || this.options.mode || 'detect',
            logThreshold: matchOverride?.scoreThresholds?.log ?? this.options.scoreThresholds?.log ?? 15,
            softBlockThreshold: matchOverride?.scoreThresholds?.softBlock ?? this.options.scoreThresholds?.softBlock ?? 50,
            blockThreshold: matchOverride?.scoreThresholds?.block ?? this.options.scoreThresholds?.block ?? 80
        };
    }
    evaluateRateLimit(req, effective) {
        if (!this.rateLimiter || this.options.rateLimit?.enabled !== true) {
            return null;
        }
        const key = this.options.rateLimit.keyGenerator
            ? this.options.rateLimit.keyGenerator(req)
            : getDefaultRateLimitKey(req);
        const result = this.rateLimiter.check(key);
        if (!result.limited) {
            return null;
        }
        this.metrics.totalRateLimited += 1;
        const action = effective.mode === 'block' ? 'block' : effective.mode === 'soft-block' ? 'soft-block' : 'log';
        const isAllowed = action === 'log';
        const decision = this.buildDecision(action, isAllowed, isAllowed ? 200 : this.options.rateLimit?.statusCode || 429, 100, [], 'Rate limit exceeded');
        decision.blockedByRateLimit = true;
        decision.rateLimitKey = key;
        if (result.retryAfterMs !== undefined) {
            decision.retryAfterMs = result.retryAfterMs;
        }
        this.captureOutcome(decision, 0);
        return decision;
    }
    getInspectStrings(req) {
        return {
            url: this.stringifyWithLimit(req.originalUrl || req.url, this.options.sizeLimits?.maxQueryBytes),
            method: this.stringifyWithLimit(req.method, 64),
            headers: this.stringifyWithLimit(req.headers, this.options.sizeLimits?.maxHeadersBytes),
            query: this.stringifyWithLimit(req.query, this.options.sizeLimits?.maxQueryBytes),
            params: this.stringifyWithLimit(req.params, this.options.sizeLimits?.maxParamsBytes),
            body: this.stringifyWithLimit(req.body, this.options.sizeLimits?.maxBodyBytes),
            userAgent: this.stringifyWithLimit(req.headers['user-agent'], 1024)
        };
    }
    stringifyWithLimit(value, maxBytes = 16 * 1024) {
        try {
            const raw = typeof value === 'string' ? value : JSON.stringify(value ?? '');
            const bytes = Buffer.byteLength(raw, 'utf8');
            if (bytes <= maxBytes) {
                return raw;
            }
            const truncated = truncateToByteLength(raw, maxBytes);
            return `${truncated}...[TRUNCATED]`;
        }
        catch {
            return '';
        }
    }
    resolveAction(score, explicitActions, matchCount, mode, thresholds) {
        let baseAction = 'allow';
        if (explicitActions.includes('block') || score >= thresholds.block) {
            baseAction = 'block';
        }
        else if (explicitActions.includes('soft-block') || score >= thresholds.softBlock) {
            baseAction = 'soft-block';
        }
        else if (matchCount > 0 || score >= thresholds.log || explicitActions.includes('log')) {
            baseAction = 'log';
        }
        if (mode === 'detect') {
            return baseAction === 'allow' ? 'allow' : 'log';
        }
        if (mode === 'soft-block' && baseAction === 'block') {
            return 'soft-block';
        }
        return baseAction;
    }
    buildDecision(action, allowed, statusCode, score, matches, reason) {
        return {
            mode: this.options.mode || 'detect',
            action,
            allowed,
            statusCode,
            score,
            ...(reason ? { reason } : {}),
            matches,
            createdAt: new Date()
        };
    }
    captureOutcome(decision, elapsedMs) {
        this.metrics.totalEvaluationMs += elapsedMs;
        if (decision.action === 'allow') {
            this.metrics.totalAllowed += 1;
            return;
        }
        if (decision.action === 'log') {
            this.metrics.totalLogged += 1;
            return;
        }
        if (decision.action === 'soft-block') {
            this.metrics.totalSoftBlocked += 1;
            return;
        }
        this.metrics.totalBlocked += 1;
    }
}
exports.WafEngine = WafEngine;
function getNonGlobalRegex(pattern) {
    const flags = pattern.flags.replace('g', '');
    return new RegExp(pattern.source, flags);
}
function getDefaultRateLimitKey(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = ipFromHeader || req.socket.remoteAddress || 'unknown-ip';
    return `${req.method}:${ip}`;
}
function truncateToByteLength(value, maxBytes) {
    if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
        return value;
    }
    let output = '';
    for (const char of value) {
        const next = output + char;
        if (Buffer.byteLength(next, 'utf8') > maxBytes) {
            break;
        }
        output = next;
    }
    return output;
}
//# sourceMappingURL=engine.js.map