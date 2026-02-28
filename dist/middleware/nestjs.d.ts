import { Request, Response, NextFunction } from 'express';
import { ApiLoggerOptions } from '../types';
/**
 * Factory function to create NestJS middleware
 * This avoids direct NestJS dependencies in the package
 */
export declare function createApiLoggerMiddleware(options: ApiLoggerOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Factory function to create NestJS module
 */
export declare function createApiLoggerModule(options: ApiLoggerOptions): {
    module: {
        new (): {};
    };
    providers: {
        provide: string;
        useValue: ApiLoggerOptions;
    }[];
    exports: string[];
};
/**
 * Legacy exports for backward compatibility
 */
export declare const ApiLoggerNestMiddleware: typeof createApiLoggerMiddleware;
export declare const ApiLoggerModule: {
    forRoot: typeof createApiLoggerModule;
};
//# sourceMappingURL=nestjs.d.ts.map