"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandaloneApiLogger = void 0;
exports.createAxiosLogger = createAxiosLogger;
const logger_1 = require("../core/logger");
/**
 * Standalone API Logger for use with axios or any HTTP client
 */
class StandaloneApiLogger {
    constructor(options) {
        this.initialized = false;
        this.logger = new logger_1.ApiLogger(options);
    }
    /**
     * Initialize MongoDB connection
     */
    async init() {
        if (!this.initialized) {
            await this.logger.init();
            this.initialized = true;
        }
    }
    /**
     * Log an HTTP request and response
     */
    async logRequest(url, method, requestData, responseData, userInfo, durationMs) {
        await this.init();
        const logEntry = {
            url,
            method: method.toUpperCase(),
            request: {
                headers: requestData.headers || {},
                body: requestData.body || {},
                query: requestData.query || {},
                params: requestData.params || {}
            },
            response: {
                statusCode: responseData.statusCode,
                body: responseData.body
            },
            user: userInfo,
            createdAt: new Date(),
            durationMs: durationMs || 0,
            ip: undefined,
            userAgent: undefined
        };
        // Use the logger's collection directly
        const collection = this.logger.getCollection();
        if (collection) {
            await collection.insertOne(logEntry);
        }
    }
    /**
     * Close MongoDB connection
     */
    async close() {
        await this.logger.close();
    }
    /**
     * Get the underlying logger instance
     */
    getLogger() {
        return this.logger;
    }
}
exports.StandaloneApiLogger = StandaloneApiLogger;
/**
 * Axios interceptor factory for automatic logging
 */
function createAxiosLogger(logger, getUserInfo) {
    return {
        request: (config) => {
            config.metadata = { startTime: Date.now() };
            return config;
        },
        response: async (response) => {
            const durationMs = Date.now() - response.config.metadata.startTime;
            await logger.logRequest(response.config.url, response.config.method, {
                headers: response.config.headers,
                body: response.config.data,
                query: response.config.params
            }, {
                statusCode: response.status,
                body: response.data,
                headers: response.headers
            }, getUserInfo ? getUserInfo() : undefined, durationMs);
            return response;
        },
        error: async (error) => {
            if (error.response) {
                const durationMs = Date.now() - error.config.metadata.startTime;
                await logger.logRequest(error.config.url, error.config.method, {
                    headers: error.config.headers,
                    body: error.config.data,
                    query: error.config.params
                }, {
                    statusCode: error.response.status,
                    body: error.response.data,
                    headers: error.response.headers
                }, getUserInfo ? getUserInfo() : undefined, durationMs);
            }
            return Promise.reject(error);
        }
    };
}
//# sourceMappingURL=standalone.js.map