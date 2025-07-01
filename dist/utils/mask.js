"use strict";
/**
 * Utility functions for masking sensitive data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MASK_FIELDS = void 0;
exports.maskRequestData = maskRequestData;
exports.maskResponseData = maskResponseData;
/**
 * Deep clone an object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}
/**
 * Recursively mask sensitive fields in an object
 */
function maskSensitiveData(obj, maskFields) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const masked = deepClone(obj);
    if (Array.isArray(masked)) {
        return masked.map(item => maskSensitiveData(item, maskFields));
    }
    for (const field of maskFields) {
        if (masked.hasOwnProperty(field)) {
            masked[field] = '***MASKED***';
        }
    }
    // Recursively mask nested objects
    for (const key in masked) {
        if (masked.hasOwnProperty(key) && typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskSensitiveData(masked[key], maskFields);
        }
    }
    return masked;
}
/**
 * Mask sensitive data in request/response objects
 */
function maskRequestData(req, maskFields) {
    if (!maskFields || maskFields.length === 0) {
        return req;
    }
    const masked = {};
    if (req.body) {
        masked.body = maskSensitiveData(req.body, maskFields);
    }
    if (req.query) {
        masked.query = maskSensitiveData(req.query, maskFields);
    }
    if (req.params) {
        masked.params = maskSensitiveData(req.params, maskFields);
    }
    if (req.headers) {
        masked.headers = maskSensitiveData(req.headers, maskFields);
    }
    return masked;
}
/**
 * Mask sensitive data in response body
 */
function maskResponseData(res, maskFields) {
    if (!maskFields || maskFields.length === 0 || !res) {
        return res;
    }
    return maskSensitiveData(res, maskFields);
}
/**
 * Default sensitive fields to mask
 */
exports.DEFAULT_MASK_FIELDS = [
    'password',
    'token',
    'authorization',
    'apiKey',
    'secret',
    'key',
    'credential',
    'auth',
    'session',
    'cookie',
    'jwt',
    'access_token',
    'refresh_token',
    'private_key',
    'public_key',
    'ssn',
    'credit_card',
    'card_number',
    'cvv',
    'pin'
];
//# sourceMappingURL=mask.js.map