"use strict";
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
function normalizeValue(value, caseSensitive) {
    return caseSensitive ? value : value.toLowerCase();
}
function matchPathOrKey(key, path, matcher, caseSensitive) {
    const normalizedMatcher = normalizeValue(matcher, caseSensitive);
    const normalizedKey = normalizeValue(key, caseSensitive);
    const normalizedPath = normalizeValue(path, caseSensitive);
    return normalizedMatcher === normalizedKey || normalizedMatcher === normalizedPath;
}
function shouldAllow(key, path, allowList, caseSensitive) {
    return allowList.some((item) => matchPathOrKey(key, path, item, caseSensitive));
}
function shouldMaskKey(key, path, options) {
    const caseSensitive = options.maskCaseSensitive === true;
    const maskFields = options.maskFields || [];
    const allowList = options.maskAllowList || [];
    const patterns = options.maskFieldPatterns || [];
    if (shouldAllow(key, path, allowList, caseSensitive)) {
        return false;
    }
    if (maskFields.some((field) => matchPathOrKey(key, path, field, caseSensitive))) {
        return true;
    }
    return patterns.some((pattern) => pattern.test(path) || pattern.test(key));
}
function maskSensitiveData(obj, options, parentPath = '') {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const masked = deepClone(obj);
    const replacement = options.maskValue || '***MASKED***';
    if (Array.isArray(masked)) {
        return masked.map((item, index) => maskSensitiveData(item, options, `${parentPath}[${index}]`));
    }
    for (const key in masked) {
        if (!Object.prototype.hasOwnProperty.call(masked, key)) {
            continue;
        }
        const path = parentPath ? `${parentPath}.${key}` : key;
        if (shouldMaskKey(key, path, options)) {
            masked[key] = replacement;
            continue;
        }
        if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskSensitiveData(masked[key], options, path);
        }
    }
    return masked;
}
/**
 * Mask sensitive data in request/response objects
 */
function maskRequestData(req, options) {
    const hasFields = !!options.maskFields && options.maskFields.length > 0;
    const hasPatterns = !!options.maskFieldPatterns && options.maskFieldPatterns.length > 0;
    if (!hasFields && !hasPatterns) {
        return req;
    }
    const masked = {};
    if (req.body) {
        masked.body = maskSensitiveData(req.body, options, 'body');
    }
    if (req.query) {
        masked.query = maskSensitiveData(req.query, options, 'query');
    }
    if (req.params) {
        masked.params = maskSensitiveData(req.params, options, 'params');
    }
    if (req.headers) {
        masked.headers = maskSensitiveData(req.headers, options, 'headers');
    }
    return masked;
}
/**
 * Mask sensitive data in response body
 */
function maskResponseData(res, options) {
    const hasFields = !!options.maskFields && options.maskFields.length > 0;
    const hasPatterns = !!options.maskFieldPatterns && options.maskFieldPatterns.length > 0;
    if ((!hasFields && !hasPatterns) || !res) {
        return res;
    }
    return maskSensitiveData(res, options, 'response');
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