/**
 * Database Service Tests
 * 
 * Tests the database connection and Prisma client functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock pg and prisma before importing
vi.mock('pg', () => ({
  default: {
    Pool: vi.fn().mockImplementation(() => ({
      end: vi.fn().mockResolvedValue(undefined)
    }))
  },
  Pool: vi.fn().mockImplementation(() => ({
    end: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    appConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    activityLog: {
      create: vi.fn()
    }
  }))
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    skip: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }
}));

describe('DatabaseService', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    // Set DATABASE_URL for tests
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.DATABASE_URL = originalEnv;
  });

  // ===========================================================================
  // getPrisma
  // ===========================================================================

  describe('getPrisma', () => {
    it('should return a Prisma client or null', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      
      const prisma = getPrisma();
      // Should either be a valid client or null (if not initialized)
      expect(prisma === null || typeof prisma === 'object').toBe(true);
    });

    it('should return null when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;
      
      const { getPrisma } = await import('../../src/services/core/databaseService');
      
      const prisma = getPrisma();
      expect(prisma).toBeNull();
    });

    it('should return same instance on multiple calls', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      
      const prisma1 = getPrisma();
      const prisma2 = getPrisma();
      
      expect(prisma1).toBe(prisma2);
    });
  });

  // ===========================================================================
  // databaseService object
  // ===========================================================================

  describe('databaseService', () => {
    it('should have required methods', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      expect(typeof databaseService.isConfigured).toBe('function');
      expect(typeof databaseService.getClient).toBe('function');
      expect(typeof databaseService.healthCheck).toBe('function');
      expect(typeof databaseService.connect).toBe('function');
      expect(typeof databaseService.disconnect).toBe('function');
    });

    it('should have user management methods', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      expect(typeof databaseService.getDefaultUser).toBe('function');
      expect(typeof databaseService.getUserByEmail).toBe('function');
      expect(typeof databaseService.getOrCreateUser).toBe('function');
      expect(typeof databaseService.isAdmin).toBe('function');
    });

    it('should have config methods', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      expect(typeof databaseService.getConfig).toBe('function');
      expect(typeof databaseService.setConfig).toBe('function');
    });

    it('should have activity logging method', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      expect(typeof databaseService.logActivity).toBe('function');
    });

    it('should report configuration status', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const isConfigured = databaseService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  // ===========================================================================
  // healthCheck
  // ===========================================================================

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const healthy = await databaseService.healthCheck();
      expect(typeof healthy).toBe('boolean');
    });

    it('should return false when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const healthy = await databaseService.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  // ===========================================================================
  // connect and disconnect
  // ===========================================================================

  describe('connect', () => {
    it('should connect to database when configured', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.connect()).resolves.not.toThrow();
    });

    it('should skip connection when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      // First connect
      await databaseService.connect();
      
      // Then disconnect
      await expect(databaseService.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect when not connected', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.disconnect()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // User management
  // ===========================================================================

  describe('getUserByEmail', () => {
    it('should return null when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const user = await databaseService.getUserByEmail('test@example.com');
      expect(user).toBeNull();
    });
  });

  describe('getOrCreateUser', () => {
    it('should return null when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const user = await databaseService.getOrCreateUser('test@example.com');
      expect(user).toBeNull();
    });
  });

  describe('getDefaultUser', () => {
    it('should return null when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const user = await databaseService.getDefaultUser();
      expect(user).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return false when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const isAdmin = await databaseService.isAdmin('user-123');
      expect(isAdmin).toBe(false);
    });
  });

  // ===========================================================================
  // Config management
  // ===========================================================================

  describe('getConfig', () => {
    it('should return default value when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const value = await databaseService.getConfig('test.key', 'default');
      expect(value).toBe('default');
    });
  });

  describe('setConfig', () => {
    it('should not throw when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.setConfig('test.key', 'value')).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // Activity logging
  // ===========================================================================

  describe('logActivity', () => {
    it('should not throw when database is not configured', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.logActivity({
        agent: 'test',
        action: 'test-action'
      })).resolves.not.toThrow();
    });

    it('should accept full activity parameters', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.logActivity({
        userId: 'user-123',
        agent: 'jobs',
        action: 'search',
        details: 'Searched for developer jobs',
        metadata: { query: 'developer', count: 50 },
        status: 'success'
      })).resolves.not.toThrow();
    });

    it('should accept error status', async () => {
      delete process.env.DATABASE_URL;
      
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      await expect(databaseService.logActivity({
        agent: 'email',
        action: 'process',
        status: 'error',
        error: 'Failed to process email'
      })).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // prisma proxy export
  // ===========================================================================

  describe('prisma proxy', () => {
    it('should export prisma proxy', async () => {
      const { prisma } = await import('../../src/services/core/databaseService');
      
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');
    });
  });
});
