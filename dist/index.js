"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLoggerModule = exports.ApiLoggerNestMiddleware = exports.createApiLoggerModule = exports.createApiLoggerMiddleware = exports.ApiLogger = exports.apiLoggerExpress = void 0;
var express_1 = require("./middleware/express");
Object.defineProperty(exports, "apiLoggerExpress", { enumerable: true, get: function () { return express_1.apiLoggerExpress; } });
var logger_1 = require("./core/logger");
Object.defineProperty(exports, "ApiLogger", { enumerable: true, get: function () { return logger_1.ApiLogger; } });
__exportStar(require("./types"), exports);
var nestjs_1 = require("./middleware/nestjs");
Object.defineProperty(exports, "createApiLoggerMiddleware", { enumerable: true, get: function () { return nestjs_1.createApiLoggerMiddleware; } });
Object.defineProperty(exports, "createApiLoggerModule", { enumerable: true, get: function () { return nestjs_1.createApiLoggerModule; } });
Object.defineProperty(exports, "ApiLoggerNestMiddleware", { enumerable: true, get: function () { return nestjs_1.ApiLoggerNestMiddleware; } });
Object.defineProperty(exports, "ApiLoggerModule", { enumerable: true, get: function () { return nestjs_1.ApiLoggerModule; } });
//# sourceMappingURL=index.js.map