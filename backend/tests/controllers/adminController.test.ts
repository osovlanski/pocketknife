/**
 * Admin Controller Tests
 * 
 * Tests for the Admin controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted to ensure mocks are available when vi.mock runs
const { mockPrisma, mockGetPrisma, mockExternalApiService } = vi.hoisted(() => {
  const prisma = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    systemSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    adminAuditLog: {
      findMany: vi.fn(),
      count: vi.fn()
    },
    task: {
      count: vi.fn()
    },
    product: {
      count: vi.fn()
    },
    savedJob: {
      count: vi.fn()
    },
    tripPlan: {
      count: vi.fn()
    },
    activityLog: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    userPreferences: {
      create: vi.fn()
    }
  };

  const externalApiService = {
    getAll: vi.fn(),
    getByName: vi.fn(),
    update: vi.fn(),
    toggle: vi.fn(),
    updateHealth: vi.fn(),
    initializeDefaults: vi.fn()
  };

  return {
    mockPrisma: prisma,
    mockGetPrisma: vi.fn(() => prisma),
    mockExternalApiService: externalApiService
  };
});

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: mockGetPrisma,
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
  default: mockExternalApiService
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

// Import controller AFTER mocks are set up
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getSettings,
  updateSetting,
  getAuditLogs,
  getStats,
  getCurrentUser,
  getExternalApis,
  getExternalApi,
  updateExternalApi,
  toggleExternalApi
} from '../../src/controllers/adminController';

describe('Admin Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
    mockPrisma.user.delete.mockResolvedValue({ id: 'user-1' });
    
    mockPrisma.systemSetting.findMany.mockResolvedValue([]);
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    mockPrisma.systemSetting.update.mockResolvedValue({});
    mockPrisma.systemSetting.upsert.mockResolvedValue({});
    
    mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
    mockPrisma.adminAuditLog.count.mockResolvedValue(0);
    
    mockPrisma.task.count.mockResolvedValue(0);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.savedJob.count.mockResolvedValue(0);
    mockPrisma.tripPlan.count.mockResolvedValue(0);
    mockPrisma.activityLog.count.mockResolvedValue(0);
    mockPrisma.activityLog.groupBy.mockResolvedValue([]);
    mockPrisma.userPreferences.create.mockResolvedValue({});
    
    mockExternalApiService.getAll.mockResolvedValue([]);
    mockExternalApiService.getByName.mockResolvedValue(null);
    mockExternalApiService.update.mockResolvedValue({});
    mockExternalApiService.toggle.mockResolvedValue({});
    
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
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@test.com', name: 'Test User' }
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      mockReq.query = { page: '1', limit: '20' };

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      mockReq.query = { role: 'ADMIN' };

      await getUsers(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User'
      });

      mockReq.params = { id: 'user-1' };

      await getUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent' };

      await getUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        name: 'New User'
      });

      mockReq.body = { email: 'new@test.com', name: 'New User' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 400 when email missing', async () => {
      mockReq.body = { name: 'New User' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'existing@test.com' });

      mockReq.body = { email: 'existing@test.com' };

      await createUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
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

      mockReq.params = { id: 'user-1' };
      mockReq.body = { name: 'Updated Name' };

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated' };

      await updateUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER'
      });

      mockReq.params = { id: 'user-1' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should prevent self-deletion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      });

      mockReq.params = { id: 'admin-1' };

      await deleteUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getSettings', () => {
    it('should return settings grouped by category', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Test' }
      ]);

      await getSettings(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('updateSetting', () => {
    it('should update setting successfully', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'test-setting',
        value: 'old-value',
        isEditable: true
      });
      mockPrisma.systemSetting.update.mockResolvedValue({
        id: 'test-setting',
        value: 'new-value'
      });

      mockReq.params = { id: 'test-setting' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when setting not found', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 400 when setting is not editable', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'readonly-setting',
        isEditable: false
      });

      mockReq.params = { id: 'readonly-setting' };
      mockReq.body = { value: 'new-value' };

      await updateSetting(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with pagination', async () => {
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'create_user', createdAt: new Date() }
      ]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(1);

      mockReq.query = { page: '1', limit: '50' };

      await getAuditLogs(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return platform statistics', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.task.count.mockResolvedValue(50);
      mockPrisma.product.count.mockResolvedValue(20);
      mockPrisma.savedJob.count.mockResolvedValue(15);
      mockPrisma.tripPlan.count.mockResolvedValue(5);
      mockPrisma.activityLog.count.mockResolvedValue(100);
      mockPrisma.activityLog.groupBy.mockResolvedValue([]);

      await getStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN'
      });

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.user = undefined;

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('getExternalApis', () => {
    it('should return external APIs grouped by category', async () => {
      mockExternalApiService.getAll.mockResolvedValue([
        { name: 'api1', category: 'jobs', displayName: 'API 1' }
      ]);

      await getExternalApis(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getExternalApi', () => {
    it('should return single API config', async () => {
      mockExternalApiService.getByName.mockResolvedValue({
        name: 'test-api',
        displayName: 'Test API'
      });

      mockReq.params = { name: 'test-api' };

      await getExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      mockExternalApiService.getByName.mockResolvedValue(null);

      mockReq.params = { name: 'nonexistent' };

      await getExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateExternalApi', () => {
    it('should update API config successfully', async () => {
      mockExternalApiService.getByName.mockResolvedValue({
        name: 'test-api',
        isEnabled: true
      });
      mockExternalApiService.update.mockResolvedValue({
        name: 'test-api',
        isEnabled: false
      });

      mockReq.params = { name: 'test-api' };
      mockReq.body = { isEnabled: false };

      await updateExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      mockExternalApiService.getByName.mockResolvedValue(null);

      mockReq.params = { name: 'nonexistent' };
      mockReq.body = { isEnabled: false };

      await updateExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('toggleExternalApi', () => {
    it('should toggle API enabled status', async () => {
      mockExternalApiService.getByName.mockResolvedValue({
        name: 'test-api',
        displayName: 'Test API',
        isEnabled: true
      });
      mockExternalApiService.toggle.mockResolvedValue({
        name: 'test-api',
        isEnabled: false
      });

      mockReq.params = { name: 'test-api' };

      await toggleExternalApi(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when API not found', async () => {
      mockExternalApiService.getByName.mockResolvedValue(null);

      mockReq.params = { name: 'nonexistent' };

      await toggleExternalApi(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });
});
