/**
 * Security Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  securityHeaders,
  requestValidator,
  requestId,
  responseTime,
  securityMiddleware
} from '../../src/middleware/securityMiddleware';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/test',
      headers: {},
      body: {}
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
      on: vi.fn()
    };

    mockNext = vi.fn();
  });

  describe('securityHeaders (Helmet)', () => {
    it('should be defined', () => {
      expect(securityHeaders).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof securityHeaders).toBe('function');
    });
  });

  describe('requestValidator', () => {
    it('should call next() for valid requests', () => {
      mockReq.body = { email: 'test@example.com' };

      requestValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for empty body', () => {
      mockReq.body = {};

      requestValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject extremely large payloads', () => {
      // Create a large payload (> 1MB)
      const largeData = 'x'.repeat(1000001);
      mockReq.body = { data: largeData };

      requestValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'PAYLOAD_TOO_LARGE'
        })
      );
    });

    it('should allow requests with MongoDB-like patterns through (but log them)', () => {
      // These patterns are logged but allowed through since we use PostgreSQL
      mockReq.body = { query: '$where' };

      requestValidator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requestId', () => {
    it('should add request ID to request object', () => {
      requestId(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).requestId).toBeDefined();
      expect(typeof (mockReq as any).requestId).toBe('string');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header if provided', () => {
      const existingId = 'existing-request-id-123';
      mockReq.headers = { 'x-request-id': existingId };

      requestId(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).requestId).toBe(existingId);
    });

    it('should set X-Request-ID header on response', () => {
      requestId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String)
      );
    });
  });

  describe('responseTime', () => {
    it('should call next() immediately', () => {
      responseTime(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should register finish event handler', () => {
      responseTime(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('securityMiddleware array', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(securityMiddleware)).toBe(true);
      expect(securityMiddleware.length).toBeGreaterThan(0);
    });

    it('should contain requestId middleware', () => {
      expect(securityMiddleware).toContain(requestId);
    });

    it('should contain responseTime middleware', () => {
      expect(securityMiddleware).toContain(responseTime);
    });

    it('should contain requestValidator middleware', () => {
      expect(securityMiddleware).toContain(requestValidator);
    });

    it('should contain securityHeaders (Helmet)', () => {
      expect(securityMiddleware).toContain(securityHeaders);
    });
  });
});
