/**
 * Rate Limit Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createRateLimiter,
  apiLimiter,
  strictLimiter,
  authLimiter,
  aiLimiter,
  searchLimiter
} from '../../src/middleware/rateLimitMiddleware';

// Mock configService
vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Rate Limit Middleware', () => {
  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create a rate limiter with custom options', () => {
      const limiter = createRateLimiter({
        windowMs: 30000,
        max: 50,
        message: 'Custom limit exceeded',
        keyPrefix: 'custom'
      });
      expect(limiter).toBeDefined();
    });
  });

  describe('Pre-configured limiters', () => {
    it('should export apiLimiter', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should export strictLimiter', () => {
      expect(strictLimiter).toBeDefined();
      expect(typeof strictLimiter).toBe('function');
    });

    it('should export authLimiter', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should export aiLimiter', () => {
      expect(aiLimiter).toBeDefined();
      expect(typeof aiLimiter).toBe('function');
    });

    it('should export searchLimiter', () => {
      expect(searchLimiter).toBeDefined();
      expect(typeof searchLimiter).toBe('function');
    });
  });

  describe('Rate limiter behavior', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        ip: '127.0.0.1',
        path: '/api/test',
        socket: { remoteAddress: '127.0.0.1' } as any
      };

      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
        getHeader: vi.fn()
      };

      mockNext = vi.fn();
    });

    it('should call next() when under limit', async () => {
      const limiter = createRateLimiter({ max: 100 });

      // First request should pass
      await new Promise<void>((resolve) => {
        limiter(mockReq as Request, mockRes as Response, () => {
          mockNext();
          resolve();
        });
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
