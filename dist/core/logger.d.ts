import { Db, Collection } from 'mongodb';
import { Request, Response } from 'express';
import { ApiLoggerOptions, ApiLoggerInstance } from '../types';
/**
 * Core API Logger class
 */
export declare class ApiLogger implements ApiLoggerInstance {
    private client;
    private db;
    private collection;
    private options;
    constructor(options: ApiLoggerOptions);
    /**
     * Initialize MongoDB connection
     */
    init(): Promise<void>;
    /**
     * Log API request and response
     */
    log(req: Request, res: Response, startTime: number): Promise<void>;
    /**
     * Close MongoDB connection
     */
    close(): Promise<void>;
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