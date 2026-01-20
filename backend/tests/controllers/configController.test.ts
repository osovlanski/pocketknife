/**
 * Config Controller Tests
 * 
 * Tests for the Config controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn().mockReturnValue({
    systemSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({})
    }
  })
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockReturnValue('test-value'),
    getShoppingThresholds: vi.fn().mockReturnValue({ excellent: 50, good: 30 }),
    getJobThresholds: vi.fn().mockReturnValue({ excellent: 85, good: 70 }),
    getEmailSettings: vi.fn().mockReturnValue({ maxProcessed: 100 }),
    getApiLimits: vi.fn().mockReturnValue({ rateLimit: 100 }),
    getAll: vi.fn().mockReturnValue({}),
    refresh: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn()
  }
}));

describe('Config Controller', () => {
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
      headers: {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConfig', () => {
    it('should return public config settings', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Pocketknife' }
      ]);

      const { getConfig } = await import('../../src/controllers/configController');

      await getConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return defaults when database not available', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/databaseService', () => ({
        getPrisma: vi.fn().mockReturnValue(null)
      }));

      const { getConfig } = await import('../../src/controllers/configController');

      await getConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      const { getConfig } = await import('../../src/controllers/configController');

      await getConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'test-setting',
        name: 'Test Setting',
        value: 'old-value',
        isEditable: true
      });
      mockPrisma.systemSetting.update.mockResolvedValue({
        id: 'test-setting',
        value: 'new-value'
      });

      const { updateConfig } = await import('../../src/controllers/configController');
      
      mockReq.body = { id: 'test-setting', value: 'new-value' };
      mockReq.headers = { 'x-user-email': 'admin@test.com' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 when id is missing', async () => {
      const { updateConfig } = await import('../../src/controllers/configController');
      
      mockReq.body = { value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when database not available', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/databaseService', () => ({
        getPrisma: vi.fn().mockReturnValue(null)
      }));

      const { updateConfig } = await import('../../src/controllers/configController');
      
      mockReq.body = { id: 'test-setting', value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 when setting not found', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const { updateConfig } = await import('../../src/controllers/configController');
      
      mockReq.body = { id: 'nonexistent', value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 403 when setting is not editable', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'readonly-setting',
        isEditable: false
      });

      const { updateConfig } = await import('../../src/controllers/configController');
      
      mockReq.body = { id: 'readonly-setting', value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getAllConfig', () => {
    it('should return all config settings grouped by category', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Pocketknife' },
        { id: 'general.mode', category: 'general', name: 'Mode', value: 'production' },
        { id: 'agents.email', category: 'agents', name: 'Email', value: true }
      ]);

      const { getAllConfig } = await import('../../src/controllers/configController');

      await getAllConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.categories).toBeDefined();
    });

    it('should return configService settings when database not available', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/databaseService', () => ({
        getPrisma: vi.fn().mockReturnValue(null)
      }));

      const { getAllConfig } = await import('../../src/controllers/configController');

      await getAllConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      const mockPrisma = (getPrisma as any)();
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      const { getAllConfig } = await import('../../src/controllers/configController');

      await getAllConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});

