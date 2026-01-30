/**
 * Global Error Handler Middleware
 *
 * Provides standardized error responses across all API endpoints.
 * Handles different error types and formats them consistently.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
}

/**
 * Custom application error with status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class ExternalApiError extends AppError {
  constructor(service: string, message: string = 'External API error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_API_ERROR', { service });
  }
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Format Zod validation errors into readable messages
 */
const formatZodError = (error: ZodError): string => {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
};

/**
 * Determine if error should be logged at error level
 */
const shouldLogAsError = (statusCode: number): boolean => {
  return statusCode >= 500;
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default values
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = formatZodError(err);
    details = err.issues;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else if (err.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'External service is unavailable';
  } else if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
    statusCode = 504;
    errorCode = 'GATEWAY_TIMEOUT';
    message = 'Request timed out';
  }

  // Log the error
  const logData = {
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message,
    ip: req.ip,
    userId: (req as any).userId,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  };

  if (shouldLogAsError(statusCode)) {
    logger.error('Request error', logData);
  } else {
    logger.warn('Request warning', logData);
  }

  // Build response
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    code: errorCode,
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString()
  };

  // Only include details in non-production or for validation errors
  if (details && (process.env.NODE_ENV !== 'production' || errorCode === 'VALIDATION_ERROR')) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  const response: ApiErrorResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
