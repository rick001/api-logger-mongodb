import { Request, Response } from 'express';
import { ApiLoggerOptions } from '../types';
/**
 * Check if a request should be logged based on configuration
 */
export declare function shouldLogRequest(req: Request, res: Response, options: ApiLoggerOptions): boolean;
/**
 * Extract user information from request
 */
export declare function extractUserInfo(req: Request, getUserInfo?: (req: Request) => any): any;
/**
 * Get client IP address
 */
export declare function getClientIP(req: Request): string | undefined;
/**
 * Get user agent
 */
export declare function getUserAgent(req: Request): string | undefined;
//# sourceMappingURL=filter.d.ts.map