import { MongoClient, Db, Collection } from 'mongodb';
import { Request, Response } from 'express';
import { ApiLogEntry, ApiLoggerOptions, ApiLoggerInstance } from '../types';
import { DEFAULT_MASK_FIELDS, maskRequestData, maskResponseData } from '../utils/mask';
import { shouldLogRequest, shouldLogEntry, extractUserInfo, getClientIP, getUserAgent } from '../utils/filter';
import { validateLoggerOptions } from '../utils/validate';

/**
 * Core API Logger class
 */
export class ApiLogger implements ApiLoggerInstance {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection | null = null;
  private options: ApiLoggerOptions;

  constructor(options: ApiLoggerOptions) {
    validateLoggerOptions(options);
    this.options = {
      mongoUri: options.mongoUri,
      databaseName: options.databaseName || 'api_logs',
      collectionName: options.collectionName || 'api_requests',
      maskFields: options.maskFields ?? [...DEFAULT_MASK_FIELDS],
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
      transformLog: options.transformLog || ((entry) => entry),
      ...(options.shouldLogEntry !== undefined ? { shouldLogEntry: options.shouldLogEntry } : {})
    };
  }

  /**
   * Initialize MongoDB connection
   */
  async init(): Promise<void> {
    try {
      this.client = new MongoClient(this.options.mongoUri);
      await this.client.connect();
      
      this.db = this.client.db(this.options.databaseName!);
      this.collection = this.db.collection(this.options.collectionName!);

      try {
        await this.collection.createIndex({ createdAt: -1 });
        await this.collection.createIndex({ url: 1 });
        await this.collection.createIndex({ method: 1 });
        await this.collection.createIndex({ 'user.id': 1 });
        await this.collection.createIndex({ 'response.statusCode': 1 });
      } catch (indexError) {
        console.warn('API Logger: index creation failed (continuing without indexes):', indexError);
      }

      console.log(`API Logger connected to MongoDB: ${this.options.databaseName}.${this.options.collectionName}`);
    } catch (error) {
      console.error('Failed to initialize API Logger:', error);
      throw error;
    }
  }

  /**
   * Log API request and response
   */
  async log(req: Request, res: Response, startTime: number): Promise<void> {
    try {
      // Check if request should be logged
      if (this.options.shouldLog && !this.options.shouldLog(req, res)) {
        return;
      }
      if (!shouldLogRequest(req, res, this.options)) {
        return;
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Create log entry
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
        userAgent: getUserAgent(req) || undefined
      };

      // Apply custom transformation if provided
      const finalEntry = this.options.transformLog ? this.options.transformLog(logEntry) : logEntry;

      // Save to MongoDB
      if (this.collection) {
        await this.collection.insertOne(finalEntry);
      }
    } catch (error) {
      console.error('Failed to log API request:', error);
      // Don't throw error to avoid breaking the application
    }
  }

  /**
   * Log a prebuilt entry (used by StandaloneApiLogger). Applies masking, filtering, and transformLog.
   */
  async logEntry(entry: ApiLogEntry): Promise<void> {
    try {
      const maskedEntry: ApiLogEntry = {
        ...entry,
        method: entry.method.toUpperCase(),
        request: {
          headers: this.options.logHeaders ? this.maskHeaders(entry.request?.headers ?? {}) : {},
          body: this.options.logRequestBody ? this.maskBody(entry.request?.body) : {},
          query: this.options.logQuery ? this.maskQuery(entry.request?.query ?? {}) : {},
          params: this.options.logParams ? this.maskParams(entry.request?.params ?? {}) : {}
        },
        response: {
          statusCode: entry.response.statusCode,
          body: this.options.logResponseBody && entry.response.body !== undefined
            ? maskResponseData(entry.response.body, this.options.maskFields ?? [])
            : undefined
        }
      };
      if (!shouldLogEntry(maskedEntry, this.options)) {
        return;
      }
      const finalEntry = this.options.transformLog ? this.options.transformLog(maskedEntry) : maskedEntry;
      if (this.collection) {
        await this.collection.insertOne(finalEntry);
      }
    } catch (error) {
      console.error('Failed to log API entry:', error);
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
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
  private maskHeaders(headers: any): Record<string, string> {
    if (!this.options.logHeaders) return {};
    
    const maskedHeaders = maskRequestData({ headers }, this.options.maskFields || []);
    return maskedHeaders.headers || {};
  }

  /**
   * Mask request body
   */
  private maskBody(body: any): any {
    if (!this.options.logRequestBody) return {};
    
    return maskRequestData({ body }, this.options.maskFields || []).body || {};
  }

  /**
   * Mask query parameters
   */
  private maskQuery(query: any): Record<string, any> {
    if (!this.options.logQuery) return {};
    
    const maskedQuery = maskRequestData({ query }, this.options.maskFields || []);
    return maskedQuery.query || {};
  }

  /**
   * Mask URL parameters
   */
  private maskParams(params: any): Record<string, any> {
    if (!this.options.logParams) return {};
    
    const maskedParams = maskRequestData({ params }, this.options.maskFields || []);
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
      return maskResponseData(responseBody, this.options.maskFields || []);
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