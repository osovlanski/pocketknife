/**
 * Admin Controller Tests
 * 
 * Tests for the Admin controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn().mockReturnValue({
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' }),
      update: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' }),
      delete: vi.fn().mockResolvedValue({ id: 'user-1' })
    },
    systemSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({})
    },
    adminAuditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0)
    },
    task: {
      count: vi.fn().mockResolvedValue(0)
    },
    product: {
      count: vi.fn().mockResolvedValue(0)
    },
    savedJob: {
      count: vi.fn().mockResolvedValue(0)
    },
    tripPlan: {
      count: vi.fn().mockResolvedValue(0)
    },
    activityLog: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([])
    },
    userPreferences: {
      create: vi.fn().mockResolvedValue({})
    }
  }),
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'user-123' })
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockReturnValue('test-value')
  }
}));

vi.mock('../../src/middleware/adminMiddleware', () => ({
  logAdminAction: vi.fn().mockResolvedValue({})
}));

vi.mock('../../src/services/core/externalApiService', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getByName: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    toggle: vi.fn().mockResolvedValue({}),
    updateHealth: vi.fn().mockResolvedValue({}),
    initializeDefaults: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    api: vi.fn(),
    found: vi.fn(),
    init: vi.fn(),
    start: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Admin Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: { id: 'admin-1', email: 'admin@test.com', role: 'SUPER_ADMIN' }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUsers', () => {
    it('should return users with pagination', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@test.com', name: 'Test User' }
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const { getUsers } = await import('../../src/controllers/adminController');
      
      mockReq.query = { page: '1', limit: '20' };

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 503 when database not available', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/databaseService', () => ({
        getPrisma: vi.fn().mockReturnValue(null)
      }));

      const { getUsers } = await import('../../src/controllers/adminController');

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(503);
    });

    it('should filter users by role', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const { getUsers } = await import('../../src/controllers/adminController');
      
      mockReq.query = { role: 'ADMIN' };

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User'
      });

      const { getUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'user-1' };

      await getUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { getUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'nonexistent' };

      await getUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        name: 'New User'
      });

      const { createUser } = await import('../../src/controllers/adminController');
      
      mockReq.body = { email: 'new@test.com', name: 'New User' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 400 when email missing', async () => {
      const { createUser } = await import('../../src/controllers/adminController');
      
      mockReq.body = { name: 'New User' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when user already exists', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'existing@test.com' });

      const { createUser } = await import('../../src/controllers/adminController');
      
      mockReq.body = { email: 'existing@test.com' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER'
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Updated Name'
      });

      const { updateUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'user-1' };
      mockReq.body = { name: 'Updated Name' };

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { updateUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated' };

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER'
      });

      const { deleteUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'user-1' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('should return 404 when user not found', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { deleteUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'nonexistent' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should prevent self-deletion', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      });

      const { deleteUser } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'admin-1' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getSettings', () => {
    it('should return settings grouped by category', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Test' }
      ]);

      const { getSettings } = await import('../../src/controllers/adminController');

      await getSettings(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('updateSetting', () => {
    it('should update setting successfully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'test-setting',
        value: 'old-value',
        isEditable: true
      });
      mockPrisma.systemSetting.update.mockResolvedValue({
        id: 'test-setting',
        value: 'new-value'
      });

      const { updateSetting } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'test-setting' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when setting not found', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const { updateSetting } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 400 when setting is not editable', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'readonly-setting',
        isEditable: false
      });

      const { updateSetting } = await import('../../src/controllers/adminController');
      
      mockReq.params = { id: 'readonly-setting' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with pagination', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'create_user', createdAt: new Date() }
      ]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(1);

      const { getAuditLogs } = await import('../../src/controllers/adminController');
      
      mockReq.query = { page: '1', limit: '50' };

      await getAuditLogs(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return platform statistics', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.task.count.mockResolvedValue(50);
      mockPrisma.product.count.mockResolvedValue(20);
      mockPrisma.savedJob.count.mockResolvedValue(15);
      mockPrisma.tripPlan.count.mockResolvedValue(5);
      mockPrisma.activityLog.count.mockResolvedValue(100);
      mockPrisma.activityLog.groupBy.mockResolvedValue([]);

      const { getStats } = await import('../../src/controllers/adminController');

      await getStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      });

      const { getCurrentUser } = await import('../../src/controllers/adminController');

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { getCurrentUser } = await import('../../src/controllers/adminController');
      
      mockReq.user = undefined;

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getExternalApis', () => {
    it('should return external APIs grouped by category', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getAll as any).mockResolvedValue([
        { name: 'api1', category: 'jobs', displayName: 'API 1' }
      ]);

      const { getExternalApis } = await import('../../src/controllers/adminController');

      await getExternalApis(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getExternalApi', () => {
    it('should return single API config', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue({
        name: 'test-api',
        displayName: 'Test API'
      });

      const { getExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'test-api' };

      await getExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue(null);

      const { getExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'nonexistent' };

      await getExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateExternalApi', () => {
    it('should update API config successfully', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue({
        name: 'test-api',
        isEnabled: true
      });
      (externalApiService.update as any).mockResolvedValue({
        name: 'test-api',
        isEnabled: false
      });

      const { updateExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'test-api' };
      mockReq.body = { isEnabled: false };

      await updateExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue(null);

      const { updateExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'nonexistent' };
      mockReq.body = { isEnabled: false };

      await updateExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('toggleExternalApi', () => {
    it('should toggle API enabled status', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue({
        name: 'test-api',
        displayName: 'Test API',
        isEnabled: true
      });
      (externalApiService.toggle as any).mockResolvedValue({
        name: 'test-api',
        isEnabled: false
      });

      const { toggleExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'test-api' };

      await toggleExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      const externalApiService = (await import('../../src/services/core/externalApiService')).default;
      (externalApiService.getByName as any).mockResolvedValue(null);

      const { toggleExternalApi } = await import('../../src/controllers/adminController');
      
      mockReq.params = { name: 'nonexistent' };

      await toggleExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });
});

