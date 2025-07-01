"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLogger = void 0;
const mongodb_1 = require("mongodb");
const mask_1 = require("../utils/mask");
const filter_1 = require("../utils/filter");
/**
 * Core API Logger class
 */
class ApiLogger {
    constructor(options) {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.options = {
            mongoUri: options.mongoUri,
            databaseName: options.databaseName || 'api_logs',
            collectionName: options.collectionName || 'api_requests',
            maskFields: options.maskFields || [],
            logResponseBody: options.logResponseBody !== false,
            logRequestBody: options.logRequestBody !== false,
            logHeaders: options.logHeaders !== false,
            logQuery: options.logQuery !== false,
            logParams: options.logParams !== false,
            getUserInfo: options.getUserInfo || (() => undefined),
            includeRoutes: options.includeRoutes || [],
            excludeRoutes: options.excludeRoutes || [],
            includeMethods: options.includeMethods || [],
            excludeMethods: options.excludeMethods || [],
            minStatusCode: options.minStatusCode ?? 0,
            maxStatusCode: options.maxStatusCode ?? 999,
            logErrorsOnly: options.logErrorsOnly || false,
            shouldLog: options.shouldLog || (() => true),
            transformLog: options.transformLog || ((entry) => entry)
        };
    }
    /**
     * Initialize MongoDB connection
     */
    async init() {
        try {
            this.client = new mongodb_1.MongoClient(this.options.mongoUri);
            await this.client.connect();
            this.db = this.client.db(this.options.databaseName);
            this.collection = this.db.collection(this.options.collectionName);
            // Create indexes for better query performance
            await this.collection.createIndex({ createdAt: -1 });
            await this.collection.createIndex({ url: 1 });
            await this.collection.createIndex({ method: 1 });
            await this.collection.createIndex({ 'user.id': 1 });
            await this.collection.createIndex({ 'response.statusCode': 1 });
            console.log(`API Logger connected to MongoDB: ${this.options.databaseName}.${this.options.collectionName}`);
        }
        catch (error) {
            console.error('Failed to initialize API Logger:', error);
            throw error;
        }
    }
    /**
     * Log API request and response
     */
    async log(req, res, startTime) {
        try {
            // Check if request should be logged
            if (this.options.shouldLog && !this.options.shouldLog(req, res)) {
                return;
            }
            if (!(0, filter_1.shouldLogRequest)(req, res, this.options)) {
                return;
            }
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            // Create log entry
            const logEntry = {
                url: req.originalUrl || req.url,
                method: req.method,
                request: {
                    headers: this.options.logHeaders ? this.maskHeaders(req.headers) : {},
                    body: this.options.logRequestBody ? this.maskBody(req.body) : {},
                    query: this.options.logQuery ? this.maskQuery(req.query) : {},
                    params: this.options.logParams ? this.maskParams(req.params) : {}
                },
                response: {
                    statusCode: res.statusCode,
                    body: this.options.logResponseBody ? this.getResponseBody(res) : undefined
                },
                user: this.options.getUserInfo ? (0, filter_1.extractUserInfo)(req, this.options.getUserInfo) : undefined,
                createdAt: new Date(),
                durationMs,
                ip: (0, filter_1.getClientIP)(req) || undefined,
                userAgent: (0, filter_1.getUserAgent)(req) || undefined
            };
            // Apply custom transformation if provided
            const finalEntry = this.options.transformLog ? this.options.transformLog(logEntry) : logEntry;
            // Save to MongoDB
            if (this.collection) {
                await this.collection.insertOne(finalEntry);
            }
        }
        catch (error) {
            console.error('Failed to log API request:', error);
            // Don't throw error to avoid breaking the application
        }
    }
    /**
     * Close MongoDB connection
     */
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.collection = null;
        }
    }
    /**
     * Mask headers
     */
    maskHeaders(headers) {
        if (!this.options.logHeaders)
            return {};
        const maskedHeaders = (0, mask_1.maskRequestData)({ headers }, this.options.maskFields || []);
        return maskedHeaders.headers || {};
    }
    /**
     * Mask request body
     */
    maskBody(body) {
        if (!this.options.logRequestBody)
            return {};
        return (0, mask_1.maskRequestData)({ body }, this.options.maskFields || []).body || {};
    }
    /**
     * Mask query parameters
     */
    maskQuery(query) {
        if (!this.options.logQuery)
            return {};
        const maskedQuery = (0, mask_1.maskRequestData)({ query }, this.options.maskFields || []);
        return maskedQuery.query || {};
    }
    /**
     * Mask URL parameters
     */
    maskParams(params) {
        if (!this.options.logParams)
            return {};
        const maskedParams = (0, mask_1.maskRequestData)({ params }, this.options.maskFields || []);
        return maskedParams.params || {};
    }
    /**
     * Get response body (if available)
     */
    getResponseBody(res) {
        if (!this.options.logResponseBody)
            return undefined;
        // Try to get response body from common patterns
        const responseBody = res.body || res.data || res.payload;
        if (responseBody) {
            return (0, mask_1.maskResponseData)(responseBody, this.options.maskFields || []);
        }
        return undefined;
    }
    /**
     * Get MongoDB collection for direct access
     */
    getCollection() {
        return this.collection;
    }
    /**
     * Get database instance for direct access
     */
    getDatabase() {
        return this.db;
    }
}
exports.ApiLogger = ApiLogger;
//# sourceMappingURL=logger.js.map