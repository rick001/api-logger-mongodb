import { Db, Collection } from 'mongodb';
import { Request, Response } from 'express';
import { ApiLogEntry, ApiLoggerOptions, ApiLoggerInstance } from '../types';
/**
 * Core API Logger class
 */
export declare class ApiLogger implements ApiLoggerInstance {
    private client;
    private db;
    private collection;
    private options;
    private initialized;
    private initPromise;
    private persistQueue;
    private queueFlushTimer;
    constructor(options: ApiLoggerOptions);
    /**
     * Initialize MongoDB connection
     */
    init(): Promise<void>;
    private initializeConnection;
    /**
     * Log API request and response
     */
    log(req: Request, res: Response, startTime: number): Promise<void>;
    /**
     * Log a standalone entry using the same filtering and masking pipeline.
     */
    logEntry(entry: ApiLogEntry): Promise<void>;
    /**
     * Close MongoDB connection
     */
    close(): Promise<void>;
    private getMaskingOptions;
    private persistEntry;
    private enqueueEntry;
    private ensureQueueFlusher;
    private flushQueue;
    private handleInternalError;
    private getWafDecision;
    /**
     * Mask headers
     */
    private maskHeaders;
    /**
     * Mask request body
     */
    private maskBody;
    /**
     * Mask query parameters
     */
    private maskQuery;
    /**
     * Mask URL parameters
     */
    private maskParams;
    /**
     * Get response body (if available)
     */
    private getResponseBody;
    /**
     * Get MongoDB collection for direct access
     */
    getCollection(): Collection | null;
    /**
     * Get database instance for direct access
     */
    getDatabase(): Db | null;
}
//# sourceMappingURL=logger.d.ts.map