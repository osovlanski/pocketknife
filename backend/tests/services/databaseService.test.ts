/**
 * Database Service Tests
 * 
 * Tests the database connection and Prisma client functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPrisma', () => {
    it('should return a Prisma client or null', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      
      const prisma = getPrisma();
      // Should either be a valid client or null (if not initialized)
      expect(prisma === null || typeof prisma === 'object').toBe(true);
    });
  });

  describe('databaseService', () => {
    it('should have required methods', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      expect(typeof databaseService.isConfigured).toBe('function');
      expect(typeof databaseService.getClient).toBe('function');
    });

    it('should report configuration status', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      
      const isConfigured = databaseService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });
});
