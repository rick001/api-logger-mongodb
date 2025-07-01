import { Request, Response } from 'express';

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
}

export interface ApiLoggerInstance {
  /** Initialize the logger and connect to MongoDB */
  init(): Promise<void>;
  /** Log an API request/response */
  log(req: Request, res: Response, startTime: number): Promise<void>;
  /** Close MongoDB connection */
  close(): Promise<void>;
} 