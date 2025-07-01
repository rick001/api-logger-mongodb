import { Injectable, NestMiddleware, Module, DynamicModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiLogger } from '../core/logger';
import { ApiLoggerOptions } from '../types';

@Injectable()
export class ApiLoggerNestMiddleware implements NestMiddleware {
  private logger: ApiLogger;
  private initialized = false;

  constructor(private options: ApiLoggerOptions) {
    this.logger = new ApiLogger(options);
  }

  private async ensureInit() {
    if (!this.initialized) {
      await this.logger.init();
      this.initialized = true;
    }
  }

  use = async (req: Request, res: Response, next: NextFunction) => {
    await this.ensureInit();
    const startTime = Date.now();

    // Patch res.send to capture response body
    let oldSend = res.send;
    let responseBody: any;
    (res as any).body = undefined;
    res.send = function (body?: any): Response {
      responseBody = body;
      (res as any).body = body;
      return oldSend.call(this, body);
    };

    res.on('finish', async () => {
      (res as any).body = responseBody;
      await this.logger.log(req, res, startTime);
    });

    next();
  };
}

@Module({})
export class ApiLoggerModule {
  static forRoot(options: ApiLoggerOptions): DynamicModule {
    return {
      module: ApiLoggerModule,
      providers: [
        {
          provide: ApiLoggerNestMiddleware,
          useFactory: () => new ApiLoggerNestMiddleware(options),
        },
      ],
      exports: [ApiLoggerNestMiddleware],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    // This is a placeholder. Users should apply the middleware in their AppModule.
  }
} 