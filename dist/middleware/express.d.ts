import { Request, Response, NextFunction } from 'express';
import { ApiLoggerOptions } from '../types';
/**
 * Express middleware factory for API logging
 */
export declare function apiLoggerExpress(options: ApiLoggerOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export default apiLoggerExpress;
//# sourceMappingURL=express.d.ts.map