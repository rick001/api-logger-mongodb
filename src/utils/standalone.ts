import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions, ApiLogEntry } from '../types';

/**
 * Standalone API Logger for use with axios or any HTTP client
 */
export class StandaloneApiLogger {
  private logger: ApiLogger;
  private initialized = false;

  constructor(options: ApiLoggerOptions) {
    this.logger = new ApiLogger(options);
  }

  /**
   * Initialize MongoDB connection
   */
  async init(): Promise<void> {
    if (!this.initialized) {
      await this.logger.init();
      this.initialized = true;
    }
  }

  /**
   * Log an HTTP request and response
   */
  async logRequest(
    url: string,
    method: string,
    requestData: {
      headers?: Record<string, string>;
      body?: any;
      query?: Record<string, any>;
      params?: Record<string, any>;
    },
    responseData: {
      statusCode: number;
      body?: any;
      headers?: Record<string, string>;
    },
    userInfo?: any,
    durationMs?: number
  ): Promise<void> {
    await this.init();

    const logEntry: ApiLogEntry = {
      url,
      method: method.toUpperCase(),
      request: {
        headers: requestData.headers || {},
        body: requestData.body || {},
        query: requestData.query || {},
        params: requestData.params || {}
      },
      response: {
        statusCode: responseData.statusCode,
        body: responseData.body
      },
      user: userInfo,
      createdAt: new Date(),
      durationMs: durationMs || 0,
      ip: undefined,
      userAgent: undefined
    };

    // Use the logger's collection directly
    const collection = this.logger.getCollection();
    if (collection) {
      await collection.insertOne(logEntry);
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    await this.logger.close();
  }

  /**
   * Get the underlying logger instance
   */
  getLogger(): ApiLogger {
    return this.logger;
  }
}

/**
 * Axios interceptor factory for automatic logging
 */
export function createAxiosLogger(
  logger: StandaloneApiLogger,
  getUserInfo?: () => any
) {
  return {
    request: (config: any) => {
      config.metadata = { startTime: Date.now() };
      return config;
    },
    response: async (response: any) => {
      const durationMs = Date.now() - response.config.metadata.startTime;
      
      await logger.logRequest(
        response.config.url,
        response.config.method,
        {
          headers: response.config.headers,
          body: response.config.data,
          query: response.config.params
        },
        {
          statusCode: response.status,
          body: response.data,
          headers: response.headers
        },
        getUserInfo ? getUserInfo() : undefined,
        durationMs
      );
      
      return response;
    },
    error: async (error: any) => {
      if (error.response) {
        const durationMs = Date.now() - error.config.metadata.startTime;
        
        await logger.logRequest(
          error.config.url,
          error.config.method,
          {
            headers: error.config.headers,
            body: error.config.data,
            query: error.config.params
          },
          {
            statusCode: error.response.status,
            body: error.response.data,
            headers: error.response.headers
          },
          getUserInfo ? getUserInfo() : undefined,
          durationMs
        );
      }
      
      return Promise.reject(error);
    }
  };
} 