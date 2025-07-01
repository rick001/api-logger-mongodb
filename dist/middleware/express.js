"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLoggerExpress = apiLoggerExpress;
const logger_1 = require("../core/logger");
/**
 * Express middleware factory for API logging
 */
function apiLoggerExpress(options) {
    const logger = new logger_1.ApiLogger(options);
    let initialized = false;
    // Initialize MongoDB connection once
    async function ensureInit() {
        if (!initialized) {
            await logger.init();
            initialized = true;
        }
    }
    return async function (req, res, next) {
        await ensureInit();
        const startTime = Date.now();
        // Capture response body
        let oldSend = res.send;
        let responseBody;
        res.body = undefined;
        res.send = function (body) {
            responseBody = body;
            res.body = body;
            return oldSend.call(this, body);
        };
        // After response is finished, log the request/response
        res.on('finish', async () => {
            res.body = responseBody;
            await logger.log(req, res, startTime);
        });
        next();
    };
}
exports.default = apiLoggerExpress;
//# sourceMappingURL=express.js.map