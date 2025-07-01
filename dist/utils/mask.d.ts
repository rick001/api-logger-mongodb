/**
 * Utility functions for masking sensitive data
 */
/**
 * Mask sensitive data in request/response objects
 */
export declare function maskRequestData(req: any, maskFields: string[]): any;
/**
 * Mask sensitive data in response body
 */
export declare function maskResponseData(res: any, maskFields: string[]): any;
/**
 * Default sensitive fields to mask
 */
export declare const DEFAULT_MASK_FIELDS: string[];
//# sourceMappingURL=mask.d.ts.map