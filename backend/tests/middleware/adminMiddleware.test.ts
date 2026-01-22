/**
 * Admin Middleware Tests
 * 
 * Tests for authentication and authorization middleware.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock dependencies before importing middleware
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn()
}));

describe('Admin Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(async () => {
    vi.resetModules();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnThis();
    
    mockReq = {
      headers: {},
      query: {},
      body: {},
      ip: '127.0.0.1'
    };
    
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    
    mockNext = vi.fn();

    // Setup mock prisma
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      adminAuditLog: {
        create: vi.fn()
      }
    };

    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as Mock).mockReturnValue(mockPrisma);

    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // authenticate middleware
  // ===========================================================================

  describe('authenticate', () => {
    it('should return 503 when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Database not available' });
    });

    it('should return 401 when no email is provided', async () => {
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Authentication required'
      }));
    });

    it('should authenticate user from X-User-Email header', async () => {
      mockReq.headers = { 'x-user-email': 'user@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.email).toBe('user@example.com');
    });

    it('should authenticate user from query parameter', async () => {
      mockReq.query = { userEmail: 'user@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.email).toBe('user@example.com');
    });

    it('should authenticate user from request body', async () => {
      mockReq.body = { userEmail: 'user@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should auto-create user if not exists', async () => {
      mockReq.headers = { 'x-user-email': 'newuser@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'newuser@example.com',
        name: 'newuser',
        role: 'USER',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create admin email user with SUPER_ADMIN role', async () => {
      const originalEnv = process.env.ADMIN_EMAIL;
      process.env.ADMIN_EMAIL = 'admin@example.com';
      
      mockReq.headers = { 'x-user-email': 'admin@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'SUPER_ADMIN'
        })
      }));
      
      process.env.ADMIN_EMAIL = originalEnv;
    });

    it('should upgrade existing admin email user to SUPER_ADMIN', async () => {
      const originalEnv = process.env.ADMIN_EMAIL;
      process.env.ADMIN_EMAIL = 'admin@example.com';
      
      mockReq.headers = { 'x-user-email': 'admin@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'USER', // Not yet admin
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      });
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'SUPER_ADMIN'
        })
      }));
      
      process.env.ADMIN_EMAIL = originalEnv;
    });

    it('should return 403 when user account is inactive', async () => {
      mockReq.headers = { 'x-user-email': 'inactive@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@example.com',
        name: 'Inactive User',
        role: 'USER',
        status: 'SUSPENDED'
      });
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Account inactive'
      }));
    });

    it('should handle database errors gracefully', async () => {
      mockReq.headers = { 'x-user-email': 'user@example.com' };
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });

    it('should normalize email to lowercase', async () => {
      mockReq.headers = { 'x-user-email': 'USER@EXAMPLE.COM' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      });
      mockPrisma.user.update.mockResolvedValue({});
      
      const { authenticate } = await import('../../src/middleware/adminMiddleware');
      
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
    });
  });

  // ===========================================================================
  // requireAdmin middleware
  // ===========================================================================

  describe('requireAdmin', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { requireAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 403 when user is not an admin', async () => {
      mockReq.user = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
        status: 'ACTIVE'
      };
      
      const { requireAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Admin access required'
      }));
    });

    it('should allow ADMIN role', async () => {
      mockReq.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE'
      };
      
      const { requireAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN role', async () => {
      mockReq.user = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      };
      
      const { requireAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // requireSuperAdmin middleware
  // ===========================================================================

  describe('requireSuperAdmin', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { requireSuperAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 403 when user is regular ADMIN', async () => {
      mockReq.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE'
      };
      
      const { requireSuperAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Super admin access required'
      }));
    });

    it('should return 403 when user is regular USER', async () => {
      mockReq.user = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
        status: 'ACTIVE'
      };
      
      const { requireSuperAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });

    it('should allow SUPER_ADMIN role', async () => {
      mockReq.user = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      };
      
      const { requireSuperAdmin } = await import('../../src/middleware/adminMiddleware');
      
      await requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // optionalAuth middleware
  // ===========================================================================

  describe('optionalAuth', () => {
    it('should proceed without user when no email provided', async () => {
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should proceed without user when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);
      
      mockReq.headers = { 'x-user-email': 'user@example.com' };
      
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user when valid email is provided', async () => {
      mockReq.headers = { 'x-user-email': 'user@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      });
      
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.email).toBe('user@example.com');
    });

    it('should not attach user when user is not found', async () => {
      mockReq.headers = { 'x-user-email': 'unknown@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should not attach user when user is inactive', async () => {
      mockReq.headers = { 'x-user-email': 'inactive@example.com' };
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@example.com',
        name: 'Inactive User',
        role: 'USER',
        status: 'SUSPENDED'
      });
      
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      mockReq.headers = { 'x-user-email': 'user@example.com' };
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));
      
      const { optionalAuth } = await import('../../src/middleware/adminMiddleware');
      
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // logAdminAction
  // ===========================================================================

  describe('logAdminAction', () => {
    it('should log admin action to audit log', async () => {
      mockPrisma.adminAuditLog.create.mockResolvedValue({});
      
      const { logAdminAction } = await import('../../src/middleware/adminMiddleware');
      
      await logAdminAction(
        'admin-1',
        'UPDATE_USER',
        'USER',
        'user-123',
        'user@example.com',
        { role: 'USER' },
        { role: 'ADMIN' },
        'Promoted user',
        mockReq as Request
      );

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 'admin-1',
          action: 'UPDATE_USER',
          targetType: 'USER',
          targetId: 'user-123',
          targetEmail: 'user@example.com'
        })
      });
    });

    it('should handle missing database gracefully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);
      
      const { logAdminAction } = await import('../../src/middleware/adminMiddleware');
      
      // Should not throw
      await logAdminAction('admin-1', 'TEST', 'TEST');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.adminAuditLog.create.mockRejectedValue(new Error('Database error'));
      
      const { logAdminAction } = await import('../../src/middleware/adminMiddleware');
      
      // Should not throw
      await logAdminAction('admin-1', 'TEST', 'TEST');
    });

    it('should include IP address and user agent from request', async () => {
      mockReq.ip = '192.168.1.1';
      mockReq.headers = { 'user-agent': 'Test Browser' };
      mockPrisma.adminAuditLog.create.mockResolvedValue({});
      
      const { logAdminAction } = await import('../../src/middleware/adminMiddleware');
      
      await logAdminAction(
        'admin-1',
        'TEST',
        'TEST',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockReq as Request
      );

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        })
      });
    });
  });
});
