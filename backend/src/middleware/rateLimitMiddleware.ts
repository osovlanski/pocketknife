/**
 * Rate Limiting Middleware
 *
 * Provides configurable rate limiting for API endpoints.
 * Uses express-rate-limit with Redis store support.
 */

import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { configService } from '../services/core/configService';
import logger from '../utils/logger';

// Standard error response for rate limiting
interface RateLimitError {
  success: false;
  error: string;
  code: string;
  retryAfter?: number;
}

/**
 * Create a rate limiter with custom configuration
 */
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}): RateLimitRequestHandler => {
  const windowMs = options?.windowMs ?? configService.get('api.rateLimit.windowMs', 60000);
  const max = options?.max ?? configService.get('api.rateLimit.requests', 100);

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: options?.message ?? 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    } as RateLimitError,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipFailedRequests: options?.skipFailedRequests ?? false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests ?? false,
    // Use default key generator (handles IPv6 properly)
    // If we need user-based limiting, we can set userId on the request
    validate: { xForwardedForHeader: false },
    handler: (req: Request, res: Response, next: NextFunction, options: any) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).userId
      });
      res.status(429).json(options.message);
    }
  });
};

// Default API rate limiter (100 requests per minute)
export const apiLimiter = createRateLimiter();

// Strict rate limiter for sensitive endpoints (10 requests per minute)
export const strictLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10,
  message: 'Too many attempts, please try again later.',
  keyPrefix: 'strict'
});

// Auth endpoints rate limiter (5 attempts per 15 minutes)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  keyPrefix: 'auth',
  skipSuccessfulRequests: true // Only count failed attempts
});

// AI endpoints rate limiter (30 requests per minute - AI calls are expensive)
export const aiLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
  message: 'AI request limit exceeded, please wait before making more AI requests.',
  keyPrefix: 'ai'
});

// Search endpoints rate limiter (60 requests per minute)
export const searchLimiter = createRateLimiter({
  windowMs: 60000,
  max: 60,
  message: 'Search request limit exceeded, please wait before making more searches.',
  keyPrefix: 'search'
});

// Rami Levy endpoints rate limiter (20 requests per minute - external API calls)
export const ramiLevyLimiter = createRateLimiter({
  windowMs: 60000,
  max: 20,
  message: 'Rami Levy API request limit exceeded, please wait before making more requests.',
  keyPrefix: 'rami-levy'
});

// Export default
export default apiLimiter;
