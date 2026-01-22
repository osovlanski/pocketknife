/**
 * Config Controller Tests
 * 
 * Tests for the Config controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted for Prisma mocks
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    systemSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma)
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
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocks
import { getConfig, updateConfig, getAllConfig } from '../../src/controllers/configController';

describe('Config Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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

    // Reset mock return values
    mockPrisma.systemSetting.findMany.mockResolvedValue([]);
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    mockPrisma.systemSetting.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConfig', () => {
    it('should return public config settings', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Pocketknife' }
      ]);

      await getConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      await getConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
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

      mockReq.body = { id: 'test-setting', value: 'new-value' };
      mockReq.headers = { 'x-user-email': 'admin@test.com' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.body = { value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 when setting not found', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      mockReq.body = { id: 'nonexistent', value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 403 when setting is not editable', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'readonly-setting',
        isEditable: false
      });

      mockReq.body = { id: 'readonly-setting', value: 'new-value' };

      await updateConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getAllConfig', () => {
    it('should return all config settings grouped by category', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { id: 'general.name', category: 'general', name: 'Name', value: 'Pocketknife' },
        { id: 'general.mode', category: 'general', name: 'Mode', value: 'production' },
        { id: 'agents.email', category: 'agents', name: 'Email', value: true }
      ]);

      await getAllConfig(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.categories).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      await getAllConfig(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});
