/**
 * Error Handler Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalApiError
} from '../../src/middleware/errorHandler';
import { ZodError, z } from 'zod';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();

    mockReq = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };

    mockNext = vi.fn();
  });

  describe('AppError classes', () => {
    it('should create BadRequestError with correct properties', () => {
      const error = new BadRequestError('Invalid input', { field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.isOperational).toBe(true);
    });

    it('should create UnauthorizedError with correct properties', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
    });

    it('should create ForbiddenError with correct properties', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed', ['field required']);
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(['field required']);
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should create ServiceUnavailableError with correct properties', () => {
      const error = new ServiceUnavailableError();
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should create ExternalApiError with service name', () => {
      const error = new ExternalApiError('Amadeus', 'Connection timeout');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_API_ERROR');
      expect(error.message).toBe('Amadeus: Connection timeout');
      expect(error.details).toEqual({ service: 'Amadeus' });
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError correctly', () => {
      const error = new BadRequestError('Invalid email');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid email',
          code: 'BAD_REQUEST'
        })
      );
    });

    it('should handle ZodError correctly', () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError | null = null;

      try {
        schema.parse({ email: 'invalid' });
      } catch (e) {
        zodError = e as ZodError;
      }

      if (zodError) {
        errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(422);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'VALIDATION_ERROR'
          })
        );
      }
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_ERROR'
        })
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(504);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'GATEWAY_TIMEOUT'
        })
      );
    });

    it('should handle connection refused errors', () => {
      const error = new Error('connect ECONNREFUSED');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SERVICE_UNAVAILABLE'
        })
      );
    });

    it('should include timestamp in response', () => {
      const error = new BadRequestError('Test');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('notFoundHandler middleware', () => {
    it('should return 404 for unmatched routes', () => {
      mockReq.path = '/api/unknown';
      mockReq.method = 'POST';

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Route POST /api/unknown not found',
          code: 'ROUTE_NOT_FOUND'
        })
      );
    });
  });
});
