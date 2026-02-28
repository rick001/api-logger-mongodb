"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLoggerModule = exports.ApiLoggerNestMiddleware = void 0;
exports.createApiLoggerMiddleware = createApiLoggerMiddleware;
exports.createApiLoggerModule = createApiLoggerModule;
const logger_1 = require("../core/logger");
const engine_1 = require("../waf/engine");
const config_1 = require("../waf/config");
/**
 * Factory function to create NestJS middleware
 * This avoids direct NestJS dependencies in the package
 */
function createApiLoggerMiddleware(options) {
    const logger = new logger_1.ApiLogger(options);
    const wafOptions = (0, config_1.normalizeWafOptions)(options.waf);
    const wafEngine = new engine_1.WafEngine(wafOptions);
    let initialized = false;
    let initPromise = null;
    const ensureInit = async () => {
        if (initialized) {
            return;
        }
        if (initPromise) {
            await initPromise;
            return;
        }
        initPromise = logger.init();
        try {
            await initPromise;
            initialized = true;
        }
        finally {
            initPromise = null;
        }
    };
    const middleware = async (req, res, next) => {
        try {
            await ensureInit();
        }
        catch (error) {
            console.error('API Logger middleware initialization failed:', error);
            return next();
        }
        const startTime = Date.now();
        // Patch res.send to capture response body
        const oldSend = res.send;
        let responseBody;
        res.body = undefined;
        res.send = function (body) {
            responseBody = body;
            res.body = body;
            return oldSend.call(this, body);
        };
        res.on('finish', async () => {
            res.body = responseBody;
            await logger.log(req, res, startTime);
        });
        const decision = wafEngine.evaluate(req);
        req.__apiLoggerWafDecision = decision;
        res.locals['__apiLoggerWafDecision'] = decision;
        if (!decision.allowed) {
            if (decision.retryAfterMs !== undefined) {
                const retrySeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
                res.setHeader('Retry-After', String(retrySeconds));
            }
            const blockedBody = options.waf?.blockedResponseBody ||
                {
                    error: 'Request blocked by API WAF policy',
                    action: decision.action,
                    score: decision.score
                };
            return res.status(decision.statusCode).json(blockedBody);
        }
        return next();
    };
    middleware.getWafMetrics = () => wafEngine.getMetrics();
    return middleware;
}
/**
 * Factory function to create NestJS module
 */
function createApiLoggerModule(options) {
    return {
        module: class ApiLoggerModule {
        },
        providers: [
            {
                provide: 'API_LOGGER_OPTIONS',
                useValue: options,
            },
        ],
        exports: ['API_LOGGER_OPTIONS'],
    };
}
/**
 * Legacy exports for backward compatibility
 */
exports.ApiLoggerNestMiddleware = createApiLoggerMiddleware;
exports.ApiLoggerModule = { forRoot: createApiLoggerModule };
//# sourceMappingURL=nestjs.js.map