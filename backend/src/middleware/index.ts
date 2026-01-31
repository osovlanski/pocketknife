/**
 * Middleware Index
 *
 * Central export for all middleware modules.
 */

// Rate limiting
export {
  apiLimiter,
  strictLimiter,
  authLimiter,
  aiLimiter,
  searchLimiter,
  ramiLevyLimiter,
  createRateLimiter
} from './rateLimitMiddleware';

// Security
export {
  securityHeaders,
  requestValidator,
  requestId,
  responseTime,
  securityMiddleware
} from './securityMiddleware';

// Error handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalApiError
} from './errorHandler';
export type { ApiErrorResponse } from './errorHandler';

// Authentication
export {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin
} from './authMiddleware';
export type { AuthenticatedRequest } from './authMiddleware';

// Admin (legacy - to be deprecated)
export {
  authenticate as adminAuthenticate,
  requireAdmin as adminRequireAdmin,
  requireSuperAdmin as adminRequireSuperAdmin,
  optionalAuth as adminOptionalAuth,
  logAdminAction
} from './adminMiddleware';
