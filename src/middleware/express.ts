import { Request, Response, NextFunction } from 'express';
import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';

/**
 * Express middleware factory for API logging
 */
export function apiLoggerExpress(options: ApiLoggerOptions) {
  const logger = new ApiLogger(options);
  let initialized = false;

  // Initialize MongoDB connection once
  async function ensureInit() {
    if (!initialized) {
      await logger.init();
      initialized = true;
    }
  }

  return async function (req: Request, res: Response, next: NextFunction) {
    await ensureInit();
    const startTime = Date.now();

    // Capture response body
    let oldSend = res.send;
    let responseBody: any;
    (res as any).body = undefined;
    res.send = function (body?: any): Response {
      responseBody = body;
      (res as any).body = body;
      return oldSend.call(this, body);
    };

    // After response is finished, log the request/response
    res.on('finish', async () => {
      (res as any).body = responseBody;
      await logger.log(req, res, startTime);
    });

    next();
  };
}

export default apiLoggerExpress; 