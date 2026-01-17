/**
 * Admin Middleware
 * 
 * Provides authentication and authorization middleware for admin routes.
 * Uses email-based authentication for simplicity (can be upgraded to JWT later).
 */

import { Request, Response, NextFunction } from 'express';
import { getPrisma } from '../services/core/databaseService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        status: string;
      };
    }
  }
}

/**
 * Authenticate user from request headers or query params
 * Looks for X-User-Email header or userEmail query param
 * Auto-creates user if they don't exist (for easy onboarding)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get email from header or query
    const email = req.headers['x-user-email'] as string || 
                  req.query.userEmail as string ||
                  req.body?.userEmail;

    if (!email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide X-User-Email header or userEmail parameter'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'itayosov@gmail.com').toLowerCase();
    const isAdminEmail = normalizedEmail === adminEmail;
    
    console.log(`🔐 Auth: Processing user ${normalizedEmail}, isAdminEmail=${isAdminEmail}`);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Auto-create user - give SUPER_ADMIN role to the primary admin email
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: isAdminEmail ? 'Admin' : normalizedEmail.split('@')[0],
          role: isAdminEmail ? 'SUPER_ADMIN' : 'USER',
          status: 'ACTIVE',
          isVerified: isAdminEmail
        }
      });
      console.log(`✅ Auto-created user: ${normalizedEmail} (role: ${user.role})`);
    } else {
      console.log(`🔐 Auth: Found existing user, role=${user.role}, status=${user.status}`);
      if (isAdminEmail && user.role !== 'SUPER_ADMIN') {
        // Upgrade existing admin email user to SUPER_ADMIN if not already
        user = await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            isVerified: true
          }
        });
        console.log(`✅ Upgraded user to SUPER_ADMIN: ${normalizedEmail}`);
      }
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: 'Account inactive',
        message: `Your account status is: ${user.status}`
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    };

    // Update last login (don't block on this)
    prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      }
    }).catch((err: Error) => {
      // Silently fail - login stats update is non-critical
    });

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 * Must be used after authenticate middleware
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'This action requires admin privileges'
    });
  }

  next();
};

/**
 * Require super admin role
 * Must be used after authenticate middleware
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Super admin access required',
      message: 'This action requires super admin privileges'
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no user
 * Useful for routes that work differently for authenticated users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return next();
    }

    const email = req.headers['x-user-email'] as string || 
                  req.query.userEmail as string;

    if (!email) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      };
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

/**
 * Log admin action to audit log
 */
export const logAdminAction = async (
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  targetEmail?: string,
  previousValue?: unknown,
  newValue?: unknown,
  reason?: string,
  req?: Request
) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return;

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        targetEmail,
        previousValue: previousValue as any,
        newValue: newValue as any,
        reason,
        ipAddress: req?.ip || req?.headers['x-forwarded-for'] as string,
        userAgent: req?.headers['user-agent']
      }
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

