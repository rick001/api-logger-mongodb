import { Request, Response } from 'express';
import { ApiLoggerOptions } from '../types';

/**
 * Check if a request should be logged based on configuration
 */
export function shouldLogRequest(
  req: Request, 
  res: Response, 
  options: ApiLoggerOptions
): boolean {
  // Check custom shouldLog function first
  if (options.shouldLog && !options.shouldLog(req, res)) {
    return false;
  }

  // Check if logging errors only
  if (options.logErrorsOnly && res.statusCode < 400) {
    return false;
  }

  // Check status code range
  if (options.minStatusCode !== undefined && res.statusCode < options.minStatusCode) {
    return false;
  }
  
  if (options.maxStatusCode !== undefined && res.statusCode > options.maxStatusCode) {
    return false;
  }

  // Check HTTP methods
  if (options.includeMethods && options.includeMethods.length > 0) {
    if (!options.includeMethods.includes(req.method.toUpperCase())) {
      return false;
    }
  }

  if (options.excludeMethods && options.excludeMethods.length > 0) {
    if (options.excludeMethods.includes(req.method.toUpperCase())) {
      return false;
    }
  }

  // Check routes
  const url = req.originalUrl || req.url;
  
  if (options.includeRoutes && options.includeRoutes.length > 0) {
    const shouldInclude = options.includeRoutes.some(pattern => pattern.test(url));
    if (!shouldInclude) {
      return false;
    }
  }

  if (options.excludeRoutes && options.excludeRoutes.length > 0) {
    const shouldExclude = options.excludeRoutes.some(pattern => pattern.test(url));
    if (shouldExclude) {
      return false;
    }
  }

  return true;
}

/**
 * Extract user information from request
 */
export function extractUserInfo(req: Request, getUserInfo?: (req: Request) => any): any {
  if (getUserInfo) {
    return getUserInfo(req);
  }

  // Default user extraction logic
  const user: any = {};
  
  // Try to get user from common authentication patterns
  if ((req as any).user) {
    const reqUser = (req as any).user;
    user.id = reqUser.id || reqUser._id || reqUser.userId;
    user.email = reqUser.email || reqUser.username;
    
    // Copy other user properties
    Object.keys(reqUser).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== 'userId' && key !== 'email' && key !== 'username') {
        user[key] = reqUser[key];
      }
    });
  }

  // Try to get user from JWT token payload
  if ((req as any).payload) {
    const payload = (req as any).payload;
    if (!user.id && (payload.id || payload.sub)) {
      user.id = payload.id || payload.sub;
    }
    if (!user.email && payload.email) {
      user.email = payload.email;
    }
  }

  return Object.keys(user).length > 0 ? user : undefined;
}

/**
 * Get client IP address
 */
export function getClientIP(req: Request): string | undefined {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    (req.socket && req.socket.remoteAddress) ||
    undefined
  );
}

/**
 * Get user agent
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'] as string;
} 