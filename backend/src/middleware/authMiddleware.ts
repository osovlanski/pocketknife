/**
 * Authentication Middleware
 *
 * Provides authentication protection for API routes.
 * Uses Google OAuth session validation.
 */

import { Request, Response, NextFunction } from 'express';
import { databaseService, getPrisma } from '../services/core/databaseService';
import googleAuthService from '../services/email/googleAuthService';
import logger from '../utils/logger';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isAuthenticated: boolean;
}

// =============================================================================
// PUBLIC ROUTES (no auth required)
// =============================================================================

const PUBLIC_ROUTES = [
  // Health check
  '/health',
  // Auth routes (OAuth flow)
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/google/callback-page',
  '/api/auth/status',
  '/api/auth/logout',
  // Public config (non-sensitive)
  '/api/config/public'
];

const PUBLIC_ROUTE_PREFIXES = [
  '/api/auth/'
];

/**
 * Check if route is public (doesn't require authentication)
 */
const isPublicRoute = (path: string, method: string): boolean => {
  // Exact matches
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }

  // Prefix matches
  for (const prefix of PUBLIC_ROUTE_PREFIXES) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  // Health check with any path
  if (path === '/health' || path.startsWith('/health')) {
    return true;
  }

  return false;
};

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Main authentication middleware
 * Validates user session and attaches user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip auth for public routes
    if (isPublicRoute(req.path, req.method)) {
      return next();
    }

    // Check for session/token in multiple places
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      // For development, check if Google OAuth is authenticated
      if (googleAuthService.isAuthenticated()) {
        // Get or create default user
        const defaultUser = await databaseService.getDefaultUser();
        if (defaultUser) {
          (req as AuthenticatedRequest).userId = defaultUser.id;
          (req as AuthenticatedRequest).userEmail = defaultUser.email;
          (req as AuthenticatedRequest).userRole = defaultUser.role as any;
          (req as AuthenticatedRequest).isAuthenticated = true;
          return next();
        }
      }

      throw new UnauthorizedError('Authentication required');
    }

    // Validate session token (for future JWT implementation)
    const user = await validateSession(sessionToken);

    if (!user) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is not active');
    }

    // Attach user info to request
    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).userEmail = user.email;
    (req as AuthenticatedRequest).userRole = user.role as any;
    (req as AuthenticatedRequest).isAuthenticated = true;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

/**
 * Optional authentication - doesn't fail if not authenticated
 * Useful for routes that work with or without auth
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionToken = extractSessionToken(req);

    if (sessionToken) {
      const user = await validateSession(sessionToken);
      if (user && user.status === 'ACTIVE') {
        (req as AuthenticatedRequest).userId = user.id;
        (req as AuthenticatedRequest).userEmail = user.email;
        (req as AuthenticatedRequest).userRole = user.role as any;
        (req as AuthenticatedRequest).isAuthenticated = true;
      }
    } else if (googleAuthService.isAuthenticated()) {
      // Fallback to default user if Google OAuth is authenticated
      const defaultUser = await databaseService.getDefaultUser();
      if (defaultUser) {
        (req as AuthenticatedRequest).userId = defaultUser.id;
        (req as AuthenticatedRequest).userEmail = defaultUser.email;
        (req as AuthenticatedRequest).userRole = defaultUser.role as any;
        (req as AuthenticatedRequest).isAuthenticated = true;
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    logger.debug('Optional auth failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Mark as not authenticated if we didn't set user
  if (!(req as AuthenticatedRequest).userId) {
    (req as AuthenticatedRequest).isAuthenticated = false;
  }

  next();
};

/**
 * Require specific role
 */
export const requireRole = (...roles: Array<'USER' | 'ADMIN' | 'SUPER_ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.isAuthenticated) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(authReq.userRole)) {
      return next(new ForbiddenError(`This action requires one of these roles: ${roles.join(', ')}`));
    }

    next();
  };
};

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 */
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');

/**
 * Require super admin role
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract session token from request
 */
const extractSessionToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    return sessionCookie;
  }

  // Check query parameter (for WebSocket upgrades)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }

  return null;
};

/**
 * Validate session token and return user
 */
const validateSession = async (token: string): Promise<any | null> => {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    // For now, treat token as user email (simple session)
    // In production, implement proper JWT validation
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: token },
          { id: token }
        ]
      }
    });

    return user;
  } catch (error) {
    logger.error('Session validation error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

export default authenticate;
