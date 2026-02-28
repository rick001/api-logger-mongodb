import { Request, Response } from 'express';

export type WafEnforcementMode = 'detect' | 'soft-block' | 'block';
export type WafDecisionAction = 'allow' | 'log' | 'soft-block' | 'block';
export type WafRuleAction = 'log' | 'soft-block' | 'block';
export type WafInspectTarget =
  | 'url'
  | 'method'
  | 'headers'
  | 'query'
  | 'params'
  | 'body'
  | 'userAgent';

export interface WafRuleMatch {
  id: string;
  name: string;
  score: number;
  action: WafRuleAction;
  target: WafInspectTarget;
  valuePreview?: string;
}

export interface WafDecision {
  mode: WafEnforcementMode;
  action: WafDecisionAction;
  allowed: boolean;
  statusCode: number;
  score: number;
  reason?: string;
  matches: WafRuleMatch[];
  blockedByRateLimit?: boolean;
  rateLimitKey?: string;
  retryAfterMs?: number;
  createdAt: Date;
}

export interface WafRule {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  targets: WafInspectTarget[];
  pattern: RegExp;
  score?: number;
  action?: WafRuleAction;
  tags?: string[];
}

export interface WafRateLimitOptions {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
  blockDurationMs?: number;
  keyGenerator?: (req: Request) => string;
  statusCode?: number;
}

export interface WafSizeLimitOptions {
  maxBodyBytes?: number;
  maxHeadersBytes?: number;
  maxQueryBytes?: number;
  maxParamsBytes?: number;
  maxPreviewLength?: number;
}

export interface WafMetricsSnapshot {
  totalRequests: number;
  totalEvaluated: number;
  totalAllowed: number;
  totalLogged: number;
  totalSoftBlocked: number;
  totalBlocked: number;
  totalRateLimited: number;
  totalErrors: number;
  totalRuleMatches: number;
  averageEvaluationMs: number;
}

export interface WafOptions {
  enabled?: boolean;
  mode?: WafEnforcementMode;
  failOpen?: boolean;
  statusCode?: number;
  blockedResponseBody?: Record<string, any>;
  scoreThresholds?: {
    log?: number;
    softBlock?: number;
    block?: number;
  };
  rules?: WafRule[];
  disableManagedRules?: boolean;
  includeManagedRuleCategories?: string[];
  excludeManagedRuleIds?: string[];
  routeOverrides?: Array<{
    route: RegExp;
    mode?: WafEnforcementMode;
    scoreThresholds?: {
      log?: number;
      softBlock?: number;
      block?: number;
    };
  }>;
  rateLimit?: WafRateLimitOptions;
  sizeLimits?: WafSizeLimitOptions;
  onDecision?: (decision: WafDecision, req: Request) => void;
  onError?: (error: unknown, req: Request) => void;
}

export interface ApiLogEntry {
  url: string;
  method: string;
  request: {
    headers: Record<string, string>;
    body: any;
    query: Record<string, any>;
    params: Record<string, any>;
  };
  response: {
    statusCode: number;
    body?: any;
  };
  user?: {
    id?: string;
    email?: string;
    [key: string]: any;
  };
  createdAt: Date;
  durationMs: number;
  ip?: string | undefined;
  userAgent?: string | undefined;
  waf?: WafDecision;
}

export interface ApiLoggerOptions {
  /** MongoDB connection URI */
  mongoUri: string;
  /** Database name */
  databaseName?: string;
  /** Collection name for storing logs */
  collectionName?: string;
  /** Fields to mask in request/response bodies */
  maskFields?: string[];
  /** Optional regex patterns to mask keys or dot paths */
  maskFieldPatterns?: RegExp[];
  /** Allow-list for keys or dot paths that should not be masked */
  maskAllowList?: string[];
  /** Case-sensitive key matching for masking rules */
  maskCaseSensitive?: boolean;
  /** Replacement value used for masked fields */
  maskValue?: string;
  /** Whether to log response bodies */
  logResponseBody?: boolean;
  /** Whether to log request bodies */
  logRequestBody?: boolean;
  /** Whether to log headers */
  logHeaders?: boolean;
  /** Whether to log query parameters */
  logQuery?: boolean;
  /** Whether to log URL parameters */
  logParams?: boolean;
  /** Function to extract user info from request */
  getUserInfo?: (req: Request) => any;
  /** Routes to include (regex patterns) */
  includeRoutes?: RegExp[];
  /** Routes to exclude (regex patterns) */
  excludeRoutes?: RegExp[];
  /** HTTP methods to log */
  includeMethods?: string[];
  /** HTTP methods to exclude */
  excludeMethods?: string[];
  /** Minimum status code to log (default: 0 - log all) */
  minStatusCode?: number;
  /** Maximum status code to log (default: 999 - log all) */
  maxStatusCode?: number;
  /** Whether to log errors only (status >= 400) */
  logErrorsOnly?: boolean;
  /** Custom function to determine if request should be logged */
  shouldLog?: (req: Request, res: Response) => boolean;
  /** Custom function to transform log entry before saving */
  transformLog?: (entry: ApiLogEntry) => ApiLogEntry;
  /** Standalone mode predicate to determine if an entry should be logged */
  shouldLogEntry?: (entry: ApiLogEntry) => boolean;
  /** WAF configuration */
  waf?: WafOptions;
  /** Persistence mode for storing logs */
  persistenceMode?: 'sync' | 'async';
  /** Max queue size used when persistenceMode is async */
  maxQueueSize?: number;
  /** Flush interval used when persistenceMode is async */
  flushIntervalMs?: number;
  /** Batch size used when persistenceMode is async */
  batchSize?: number;
  /** Global callback for internal logger failures */
  onInternalError?: (error: unknown, context: string) => void;
}

export interface ApiLoggerInstance {
  /** Initialize the logger and connect to MongoDB */
  init(): Promise<void>;
  /** Log an API request/response */
  log(req: Request, res: Response, startTime: number): Promise<void>;
  /** Close MongoDB connection */
  close(): Promise<void>;
} 