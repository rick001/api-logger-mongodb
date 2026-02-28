/**
 * Utility functions for masking sensitive data
 */
import { ApiLoggerOptions } from '../types';
/**
 * Mask sensitive data in request/response objects
 */
export declare function maskRequestData(req: any, options: Pick<ApiLoggerOptions, 'maskFields' | 'maskFieldPatterns' | 'maskAllowList' | 'maskCaseSensitive' | 'maskValue'>): any;
/**
 * Mask sensitive data in response body
 */
export declare function maskResponseData(res: any, options: Pick<ApiLoggerOptions, 'maskFields' | 'maskFieldPatterns' | 'maskAllowList' | 'maskCaseSensitive' | 'maskValue'>): any;
/**
 * Default sensitive fields to mask
 */
export declare const DEFAULT_MASK_FIELDS: string[];
//# sourceMappingURL=mask.d.ts.map