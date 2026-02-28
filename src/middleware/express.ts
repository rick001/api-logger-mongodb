import { Request, Response, NextFunction } from 'express';
import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';
import { WafEngine } from '../waf/engine';
import { normalizeWafOptions } from '../waf/config';

/**
 * Express middleware factory for API logging
 */
export function apiLoggerExpress(options: ApiLoggerOptions) {
  const logger = new ApiLogger(options);
  const wafOptions = normalizeWafOptions(options.waf);
  const wafEngine = new WafEngine(wafOptions);
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  // Initialize MongoDB connection once
  async function ensureInit() {
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
  }

  const middleware = async function (req: Request, res: Response, next: NextFunction) {
    try {
      await ensureInit();
    } catch (error) {
      console.error('API Logger middleware initialization failed:', error);
      return next();
    }
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

export default apiLoggerExpress; 