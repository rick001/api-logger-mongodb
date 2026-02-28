import { MongoClient, Db, Collection } from 'mongodb';
import { Request, Response } from 'express';
import { ApiLogEntry, ApiLoggerOptions, ApiLoggerInstance, WafDecision } from '../types';
import { DEFAULT_MASK_FIELDS, maskRequestData, maskResponseData } from '../utils/mask';
import { shouldLogRequest, shouldLogEntry, extractUserInfo, getClientIP, getUserAgent } from '../utils/filter';
import { normalizeLoggerOptions, normalizeWafOptions } from '../waf/config';

/**
 * Core API Logger class
 */
export class ApiLogger implements ApiLoggerInstance {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection | null = null;
  private options: ApiLoggerOptions;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private persistQueue: ApiLogEntry[] = [];
  private queueFlushTimer: NodeJS.Timeout | null = null;

  constructor(options: ApiLoggerOptions) {
    const normalized = normalizeLoggerOptions(options);
    this.options = {
      mongoUri: normalized.mongoUri,
      databaseName: normalized.databaseName || 'api_logs',
      collectionName: normalized.collectionName || 'api_requests',
      maskFields: normalized.maskFields ?? [...DEFAULT_MASK_FIELDS],
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
      waf: normalized.waf ?? normalizeWafOptions(),
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
  async init(): Promise<void> {
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
    } finally {
      this.initPromise = null;
    }
  }

  private async initializeConnection(): Promise<void> {
    try {
      this.client = new MongoClient(this.options.mongoUri);
      await this.client.connect();
      
      this.db = this.client.db(this.options.databaseName!);
      this.collection = this.db.collection(this.options.collectionName!);
      
      // Create indexes for better query performance
      try {
        await this.collection.createIndex({ createdAt: -1 });
        await this.collection.createIndex({ url: 1 });
        await this.collection.createIndex({ method: 1 });
        await this.collection.createIndex({ 'user.id': 1 });
        await this.collection.createIndex({ 'response.statusCode': 1 });
      } catch (indexError) {
        this.handleInternalError(indexError, 'mongodb:index:create');
      }
      
      console.log(`API Logger connected to MongoDB: ${this.options.databaseName}.${this.options.collectionName}`);
      this.ensureQueueFlusher();
    } catch (error) {
      this.handleInternalError(error, 'mongodb:init');
      throw error;
    }
  }

  /**
   * Log API request and response
   */
  async log(req: Request, res: Response, startTime: number): Promise<void> {
    try {
      // Check if request should be logged
      if (!shouldLogRequest(req, res, this.options)) {
        return;
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Create log entry
      const wafDecision = this.getWafDecision(req, res);
      const logEntry: ApiLogEntry = {
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
        user: this.options.getUserInfo ? extractUserInfo(req, this.options.getUserInfo) : undefined,
        createdAt: new Date(),
        durationMs,
        ip: getClientIP(req) || undefined,
        userAgent: getUserAgent(req) || undefined,
        ...(wafDecision ? { waf: wafDecision } : {})
      };

      await this.persistEntry(logEntry);
    } catch (error) {
      this.handleInternalError(error, 'logger:request');
      // Don't throw error to avoid breaking the application
    }
  }

  /**
   * Log a standalone entry using the same filtering and masking pipeline.
   */
  async logEntry(entry: ApiLogEntry): Promise<void> {
    try {
      if (!shouldLogEntry(entry, this.options)) {
        return;
      }

      const maskedEntry: ApiLogEntry = {
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
          body: this.options.logResponseBody ? maskResponseData(entry.response.body, this.getMaskingOptions()) : undefined
        },
        ...(entry.waf ? { waf: entry.waf } : {})
      };

      await this.persistEntry(maskedEntry);
    } catch (error) {
      this.handleInternalError(error, 'logger:entry');
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
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

  private getMaskingOptions(): Pick<
    ApiLoggerOptions,
    'maskFields' | 'maskFieldPatterns' | 'maskAllowList' | 'maskCaseSensitive' | 'maskValue'
  > {
    return {
      maskFields: this.options.maskFields ?? [],
      maskFieldPatterns: this.options.maskFieldPatterns ?? [],
      maskAllowList: this.options.maskAllowList ?? [],
      maskCaseSensitive: this.options.maskCaseSensitive ?? false,
      maskValue: this.options.maskValue ?? '***MASKED***'
    };
  }

  private async persistEntry(entry: ApiLogEntry): Promise<void> {
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

  private enqueueEntry(entry: ApiLogEntry): void {
    if (this.persistQueue.length >= (this.options.maxQueueSize || 1000)) {
      this.persistQueue.shift();
    }

    this.persistQueue.push(entry);
    if (this.persistQueue.length >= (this.options.batchSize || 100)) {
      void this.flushQueue();
    }
  }

  private ensureQueueFlusher(): void {
    if (this.options.persistenceMode !== 'async' || this.queueFlushTimer) {
      return;
    }

    const interval = this.options.flushIntervalMs || 500;
    this.queueFlushTimer = setInterval(() => {
      void this.flushQueue();
    }, interval);
    this.queueFlushTimer.unref?.();
  }

  private async flushQueue(): Promise<void> {
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
    } catch (error) {
      this.handleInternalError(error, 'logger:queue:flush');
    }
  }

  private handleInternalError(error: unknown, context: string): void {
    this.options.onInternalError?.(error, context);
    console.error(`[ApiLogger:${context}]`, error);
  }

  private getWafDecision(req: Request, res: Response): WafDecision | undefined {
    const reqDecision = (req as any).__apiLoggerWafDecision as WafDecision | undefined;
    const resDecision = (res.locals as any)?.__apiLoggerWafDecision as WafDecision | undefined;
    return reqDecision || resDecision;
  }

  /**
   * Mask headers
   */
  private maskHeaders(headers: any): Record<string, string> {
    if (!this.options.logHeaders) return {};
    
    const maskedHeaders = maskRequestData({ headers }, this.getMaskingOptions());
    return maskedHeaders.headers || {};
  }

  /**
   * Mask request body
   */
  private maskBody(body: any): any {
    if (!this.options.logRequestBody) return {};
    
    return maskRequestData({ body }, this.getMaskingOptions()).body || {};
  }

  /**
   * Mask query parameters
   */
  private maskQuery(query: any): Record<string, any> {
    if (!this.options.logQuery) return {};
    
    const maskedQuery = maskRequestData({ query }, this.getMaskingOptions());
    return maskedQuery.query || {};
  }

  /**
   * Mask URL parameters
   */
  private maskParams(params: any): Record<string, any> {
    if (!this.options.logParams) return {};
    
    const maskedParams = maskRequestData({ params }, this.getMaskingOptions());
    return maskedParams.params || {};
  }

  /**
   * Get response body (if available)
   */
  private getResponseBody(res: Response): any {
    if (!this.options.logResponseBody) return undefined;
    
    // Try to get response body from common patterns
    const responseBody = (res as any).body || (res as any).data || (res as any).payload;
    
    if (responseBody) {
      return maskResponseData(responseBody, this.getMaskingOptions());
    }
    
    return undefined;
  }

  /**
   * Get MongoDB collection for direct access
   */
  getCollection(): Collection | null {
    return this.collection;
  }

  /**
   * Get database instance for direct access
   */
  getDatabase(): Db | null {
    return this.db;
  }
} 