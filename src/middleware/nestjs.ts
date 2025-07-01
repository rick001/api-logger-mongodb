import { Request, Response, NextFunction } from 'express';
import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';

/**
 * Factory function to create NestJS middleware
 * This avoids direct NestJS dependencies in the package
 */
export function createApiLoggerMiddleware(options: ApiLoggerOptions) {
  const logger = new ApiLogger(options);
  let initialized = false;

  const ensureInit = async () => {
    if (!initialized) {
      await logger.init();
      initialized = true;
    }
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    await ensureInit();
    const startTime = Date.now();

    // Patch res.send to capture response body
    const oldSend = res.send;
    let responseBody: any;
    (res as any).body = undefined;
    res.send = function (body?: any): Response {
      responseBody = body;
      (res as any).body = body;
      return oldSend.call(this, body);
    };

    res.on('finish', async () => {
      (res as any).body = responseBody;
      await logger.log(req, res, startTime);
    });

    next();
  };
}

/**
 * Factory function to create NestJS module
 */
export function createApiLoggerModule(options: ApiLoggerOptions) {
  return {
    module: class ApiLoggerModule {},
    providers: [
      {
        provide: 'API_LOGGER_OPTIONS',
        useValue: options,
      },
    ],
    exports: ['API_LOGGER_OPTIONS'],
  };
}

/**
 * Legacy exports for backward compatibility
 */
export const ApiLoggerNestMiddleware = createApiLoggerMiddleware;
export const ApiLoggerModule = { forRoot: createApiLoggerModule }; 