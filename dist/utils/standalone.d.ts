import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';
/**
 * Standalone API Logger for use with axios or any HTTP client
 */
export declare class StandaloneApiLogger {
    private logger;
    private initPromise;
    constructor(options: ApiLoggerOptions);
    /**
     * Initialize MongoDB connection
     */
    init(): Promise<void>;
    /**
     * Log an HTTP request and response
     */
    logRequest(url: string, method: string, requestData: {
        headers?: Record<string, string>;
        body?: any;
        query?: Record<string, any>;
        params?: Record<string, any>;
    }, responseData: {
        statusCode: number;
        body?: any;
        headers?: Record<string, string>;
    }, userInfo?: any, durationMs?: number): Promise<void>;
    /**
     * Close MongoDB connection
     */
    close(): Promise<void>;
    /**
     * Get the underlying logger instance
     */
    getLogger(): ApiLogger;
}
/**
 * Axios interceptor factory for automatic logging
 */
export declare function createAxiosLogger(logger: StandaloneApiLogger, getUserInfo?: () => any): {
    request: (config: any) => any;
    response: (response: any) => Promise<any>;
    error: (error: any) => Promise<never>;
};
//# sourceMappingURL=standalone.d.ts.map