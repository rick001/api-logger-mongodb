"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLoggerModule = exports.ApiLoggerNestMiddleware = void 0;
exports.createApiLoggerMiddleware = createApiLoggerMiddleware;
exports.createApiLoggerModule = createApiLoggerModule;
const logger_1 = require("../core/logger");
/**
 * Factory function to create NestJS middleware
 * This avoids direct NestJS dependencies in the package
 */
function createApiLoggerMiddleware(options) {
    const logger = new logger_1.ApiLogger(options);
    let initialized = false;
    const ensureInit = async () => {
        if (!initialized) {
            await logger.init();
            initialized = true;
        }
    };
    return async (req, res, next) => {
        await ensureInit();
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
        next();
    };
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