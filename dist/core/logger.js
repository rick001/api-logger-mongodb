"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLogger = void 0;
const mongodb_1 = require("mongodb");
const mask_1 = require("../utils/mask");
const filter_1 = require("../utils/filter");
const config_1 = require("../waf/config");
/**
 * Core API Logger class
 */
class ApiLogger {
    constructor(options) {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.initialized = false;
        this.initPromise = null;
        this.persistQueue = [];
        this.queueFlushTimer = null;
        const normalized = (0, config_1.normalizeLoggerOptions)(options);
        this.options = {
            mongoUri: normalized.mongoUri,
            databaseName: normalized.databaseName || 'api_logs',
            collectionName: normalized.collectionName || 'api_requests',
            maskFields: normalized.maskFields ?? [...mask_1.DEFAULT_MASK_FIELDS],
            maskFieldPatterns: normalized.maskFieldPatterns ?? [],
            maskAllowList: normalized.maskAllowList ?? [],
            maskCaseSensitive: normalized.maskCaseSensitive ?? false,
            maskValue: normalized.maskValue ?? '***MASKED***',
            logResponseBody: normalized.logResponseBody !== false,
            logRequestBody: normalized.logRequestBody !== false,
            logHeaders: normalized.logHeaders !== false,
            logQuery: normalized.logQuery !== false,
            logParams: normalized.logParams !== false,
            getUserInfo: normalized.getUserInfo || (() => undefined),
            includeRoutes: normalized.includeRoutes || [],
            excludeRoutes: normalized.excludeRoutes || [],
            includeMethods: normalized.includeMethods || [],
            excludeMethods: normalized.excludeMethods || [],
            minStatusCode: normalized.minStatusCode ?? 0,
            maxStatusCode: normalized.maxStatusCode ?? 999,
            logErrorsOnly: normalized.logErrorsOnly || false,
            shouldLog: normalized.shouldLog || (() => true),
            transformLog: normalized.transformLog || ((entry) => entry),
            shouldLogEntry: normalized.shouldLogEntry || (() => true),
            waf: normalized.waf ?? (0, config_1.normalizeWafOptions)(),
            persistenceMode: normalized.persistenceMode ?? 'sync',
            maxQueueSize: normalized.maxQueueSize ?? 1000,
            flushIntervalMs: normalized.flushIntervalMs ?? 500,
            batchSize: normalized.batchSize ?? 100,
            onInternalError: normalized.onInternalError || (() => undefined)
        };
    }
    /**
     * Initialize MongoDB connection
     */
    async init() {
        if (this.initialized && this.collection) {
            return;
        }
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        this.initPromise = this.initializeConnection();
        try {
            await this.initPromise;
            this.initialized = true;
        }
        finally {
            this.initPromise = null;
        }
    }
    async initializeConnection() {
        try {
            this.client = new mongodb_1.MongoClient(this.options.mongoUri);
            await this.client.connect();
            this.db = this.client.db(this.options.databaseName);
            this.collection = this.db.collection(this.options.collectionName);
            // Create indexes for better query performance
            try {
                await this.collection.createIndex({ createdAt: -1 });
                await this.collection.createIndex({ url: 1 });
                await this.collection.createIndex({ method: 1 });
                await this.collection.createIndex({ 'user.id': 1 });
                await this.collection.createIndex({ 'response.statusCode': 1 });
            }
            catch (indexError) {
                this.handleInternalError(indexError, 'mongodb:index:create');
            }
            console.log(`API Logger connected to MongoDB: ${this.options.databaseName}.${this.options.collectionName}`);
            this.ensureQueueFlusher();
        }
        catch (error) {
            this.handleInternalError(error, 'mongodb:init');
            throw error;
        }
    }
    /**
     * Log API request and response
     */
    async log(req, res, startTime) {
        try {
            // Check if request should be logged
            if (!(0, filter_1.shouldLogRequest)(req, res, this.options)) {
                return;
            }
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            // Create log entry
            const wafDecision = this.getWafDecision(req, res);
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
                userAgent: (0, filter_1.getUserAgent)(req) || undefined,
                ...(wafDecision ? { waf: wafDecision } : {})
            };
            await this.persistEntry(logEntry);
        }
        catch (error) {
            this.handleInternalError(error, 'logger:request');
            // Don't throw error to avoid breaking the application
        }
    }
    /**
     * Log a standalone entry using the same filtering and masking pipeline.
     */
    async logEntry(entry) {
        try {
            if (!(0, filter_1.shouldLogEntry)(entry, this.options)) {
                return;
            }
            const maskedEntry = {
                ...entry,
                method: entry.method.toUpperCase(),
                request: {
                    headers: this.options.logHeaders ? this.maskHeaders(entry.request?.headers || {}) : {},
                    body: this.options.logRequestBody ? this.maskBody(entry.request?.body) : {},
                    query: this.options.logQuery ? this.maskQuery(entry.request?.query || {}) : {},
                    params: this.options.logParams ? this.maskParams(entry.request?.params || {}) : {}
                },
                response: {
                    statusCode: entry.response.statusCode,
                    body: this.options.logResponseBody ? (0, mask_1.maskResponseData)(entry.response.body, this.getMaskingOptions()) : undefined
                },
                ...(entry.waf ? { waf: entry.waf } : {})
            };
            await this.persistEntry(maskedEntry);
        }
        catch (error) {
            this.handleInternalError(error, 'logger:entry');
        }
    }
    /**
     * Close MongoDB connection
     */
    async close() {
        await this.flushQueue();
        if (this.queueFlushTimer) {
            clearInterval(this.queueFlushTimer);
            this.queueFlushTimer = null;
        }
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.collection = null;
            this.initialized = false;
            this.initPromise = null;
        }
    }
    getMaskingOptions() {
        return {
            maskFields: this.options.maskFields ?? [],
            maskFieldPatterns: this.options.maskFieldPatterns ?? [],
            maskAllowList: this.options.maskAllowList ?? [],
            maskCaseSensitive: this.options.maskCaseSensitive ?? false,
            maskValue: this.options.maskValue ?? '***MASKED***'
        };
    }
    async persistEntry(entry) {
        const finalEntry = this.options.transformLog ? this.options.transformLog(entry) : entry;
        if (!this.collection) {
            return;
        }
        if (this.options.persistenceMode === 'async') {
            this.enqueueEntry(finalEntry);
            return;
        }
        await this.collection.insertOne(finalEntry);
    }
    enqueueEntry(entry) {
        if (this.persistQueue.length >= (this.options.maxQueueSize || 1000)) {
            this.persistQueue.shift();
        }
        this.persistQueue.push(entry);
        if (this.persistQueue.length >= (this.options.batchSize || 100)) {
            void this.flushQueue();
        }
    }
    ensureQueueFlusher() {
        if (this.options.persistenceMode !== 'async' || this.queueFlushTimer) {
            return;
        }
        const interval = this.options.flushIntervalMs || 500;
        this.queueFlushTimer = setInterval(() => {
            void this.flushQueue();
        }, interval);
        this.queueFlushTimer.unref?.();
    }
    async flushQueue() {
        if (!this.collection || this.persistQueue.length === 0) {
            return;
        }
        const batchSize = this.options.batchSize || 100;
        const batch = this.persistQueue.splice(0, batchSize);
        if (batch.length === 0) {
            return;
        }
        try {
            await this.collection.insertMany(batch, { ordered: false });
        }
        catch (error) {
            this.handleInternalError(error, 'logger:queue:flush');
        }
    }
    handleInternalError(error, context) {
        this.options.onInternalError?.(error, context);
        console.error(`[ApiLogger:${context}]`, error);
    }
    getWafDecision(req, res) {
        const reqDecision = req.__apiLoggerWafDecision;
        const resDecision = res.locals?.__apiLoggerWafDecision;
        return reqDecision || resDecision;
    }
    /**
     * Mask headers
     */
    maskHeaders(headers) {
        if (!this.options.logHeaders)
            return {};
        const maskedHeaders = (0, mask_1.maskRequestData)({ headers }, this.getMaskingOptions());
        return maskedHeaders.headers || {};
    }
    /**
     * Mask request body
     */
    maskBody(body) {
        if (!this.options.logRequestBody)
            return {};
        return (0, mask_1.maskRequestData)({ body }, this.getMaskingOptions()).body || {};
    }
    /**
     * Mask query parameters
     */
    maskQuery(query) {
        if (!this.options.logQuery)
            return {};
        const maskedQuery = (0, mask_1.maskRequestData)({ query }, this.getMaskingOptions());
        return maskedQuery.query || {};
    }
    /**
     * Mask URL parameters
     */
    maskParams(params) {
        if (!this.options.logParams)
            return {};
        const maskedParams = (0, mask_1.maskRequestData)({ params }, this.getMaskingOptions());
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
            return (0, mask_1.maskResponseData)(responseBody, this.getMaskingOptions());
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