import { Request, Response, NextFunction } from 'express';
import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';
import { WafEngine } from '../waf/engine';
import { normalizeWafOptions } from '../waf/config';

/**
 * Factory function to create NestJS middleware
 * This avoids direct NestJS dependencies in the package
 */
export function createApiLoggerMiddleware(options: ApiLoggerOptions) {
  const logger = new ApiLogger(options);
  const wafOptions = normalizeWafOptions(options.waf);
  const wafEngine = new WafEngine(wafOptions);
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  const ensureInit = async () => {
    if (initialized) {
      return;
    }
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = logger.init();
    try {
      await initPromise;
      initialized = true;
    } finally {
      initPromise = null;
    }
  };

  const middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureInit();
    } catch (error) {
      console.error('API Logger middleware initialization failed:', error);
      return next();
    }
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

    const decision = wafEngine.evaluate(req);
    (req as any).__apiLoggerWafDecision = decision;
    res.locals['__apiLoggerWafDecision'] = decision;

    if (!decision.allowed) {
      if (decision.retryAfterMs !== undefined) {
        const retrySeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
        res.setHeader('Retry-After', String(retrySeconds));
      }

      const blockedBody =
        options.waf?.blockedResponseBody ||
        {
          error: 'Request blocked by API WAF policy',
          action: decision.action,
          score: decision.score
        };
      return res.status(decision.statusCode).json(blockedBody);
    }

    return next();
  };

  (middleware as any).getWafMetrics = () => wafEngine.getMetrics();
  return middleware;
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