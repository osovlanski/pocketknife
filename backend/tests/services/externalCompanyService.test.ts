/**
 * External Company Service Tests
 * 
 * Tests for the external company management service including:
 * - CRUD operations
 * - Discovery
 * - Enrichment
 * - Migration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock Prisma instance
const mockPrisma = {
  externalCompany: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn()
  }
};

// Mock databaseService
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma)
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Import after mocking
import { externalCompanyService } from '../../src/services/jobs/externalCompanyService';
import axios from 'axios';

describe('ExternalCompanyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCompany', () => {
    it('should create a new company successfully', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        slug: 'test-company',
        atsProvider: 'COMEET',
        atsCompanyId: 'test-uid',
        atsToken: 'test-token',
        status: 'PENDING'
      };

      mockPrisma.externalCompany.create.mockResolvedValue(mockCompany);

      const result = await externalCompanyService.createCompany({
        name: 'Test Company',
        atsProvider: 'COMEET' as any,
        atsCompanyId: 'test-uid',
        atsToken: 'test-token'
      });

      expect(result).toBeDefined();
      expect(mockPrisma.externalCompany.create).toHaveBeenCalled();
    });

    it('should return existing company if duplicate', async () => {
      const existingCompany = {
        id: 'existing-123',
        name: 'Existing Company',
        atsProvider: 'COMEET',
        atsCompanyId: 'test-uid'
      };

      // Simulate P2002 unique constraint violation
      const error = { code: 'P2002' };
      mockPrisma.externalCompany.create.mockRejectedValue(error);
      mockPrisma.externalCompany.findFirst.mockResolvedValue(existingCompany);

      const result = await externalCompanyService.createCompany({
        name: 'Test Company',
        atsProvider: 'COMEET' as any,
        atsCompanyId: 'test-uid'
      });

      expect(result).toEqual(existingCompany);
    });
  });

  describe('updateCompany', () => {
    it('should update company data', async () => {
      const updatedCompany = {
        id: 'company-123',
        name: 'Updated Company',
        industry: 'Technology'
      };

      mockPrisma.externalCompany.update.mockResolvedValue(updatedCompany);

      const result = await externalCompanyService.updateCompany('company-123', {
        industry: 'Technology'
      });

      expect(result).toEqual(updatedCompany);
      expect(mockPrisma.externalCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: expect.objectContaining({ industry: 'Technology' })
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete a company', async () => {
      mockPrisma.externalCompany.delete.mockResolvedValue({});

      await externalCompanyService.deleteCompany('company-123');

      expect(mockPrisma.externalCompany.delete).toHaveBeenCalledWith({
        where: { id: 'company-123' }
      });
    });
  });

  describe('getCompanyById', () => {
    it('should return company with jobs', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        jobs: [{ id: 'job-1', title: 'Developer' }]
      };

      mockPrisma.externalCompany.findUnique.mockResolvedValue(mockCompany);

      const result = await externalCompanyService.getCompanyById('company-123');

      expect(result).toEqual(mockCompany);
      expect(mockPrisma.externalCompany.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        include: { jobs: expect.any(Object) }
      });
    });

    it('should return null for non-existent company', async () => {
      mockPrisma.externalCompany.findUnique.mockResolvedValue(null);

      const result = await externalCompanyService.getCompanyById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchCompanies', () => {
    it('should search companies with filters', async () => {
      const mockCompanies = [
        { id: '1', name: 'Company A', status: 'ACTIVE' },
        { id: '2', name: 'Company B', status: 'ACTIVE' }
      ];

      mockPrisma.externalCompany.findMany.mockResolvedValue(mockCompanies);

      const result = await externalCompanyService.searchCompanies({
        status: 'ACTIVE' as any,
        limit: 10
      });

      expect(result).toEqual(mockCompanies);
      expect(mockPrisma.externalCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
          take: 10
        })
      );
    });

    it('should search by term', async () => {
      mockPrisma.externalCompany.findMany.mockResolvedValue([]);

      await externalCompanyService.searchCompanies({
        searchTerm: 'tech'
      });

      expect(mockPrisma.externalCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) })
            ])
          })
        })
      );
    });
  });

  describe('getActiveCompanies', () => {
    it('should return only active companies', async () => {
      const activeCompanies = [
        { id: '1', name: 'Active Co', status: 'ACTIVE' }
      ];

      mockPrisma.externalCompany.findMany.mockResolvedValue(activeCompanies);

      const result = await externalCompanyService.getActiveCompanies();

      expect(result).toEqual(activeCompanies);
      expect(mockPrisma.externalCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' }
        })
      );
    });

    it('should filter by ATS provider', async () => {
      mockPrisma.externalCompany.findMany.mockResolvedValue([]);

      await externalCompanyService.getActiveCompanies('COMEET' as any);

      expect(mockPrisma.externalCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE', atsProvider: 'COMEET' }
        })
      );
    });
  });

  describe('discoverComeetCompanies', () => {
    it('should return empty array when Google API not configured', async () => {
      // Remove environment variables
      const originalApiKey = process.env.GOOGLE_API_KEY;
      const originalSearchId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_SEARCH_ENGINE_ID;

      const result = await externalCompanyService.discoverComeetCompanies('Israel');

      expect(result).toEqual([]);

      // Restore environment variables
      if (originalApiKey) process.env.GOOGLE_API_KEY = originalApiKey;
      if (originalSearchId) process.env.GOOGLE_SEARCH_ENGINE_ID = originalSearchId;
    });

    it('should parse Comeet URLs from search results', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-id';

      (axios.get as any).mockResolvedValue({
        data: {
          items: [
            {
              link: 'https://www.comeet.com/jobs/lightrun/Lightrun.006',
              title: 'Lightrun - Open Positions | Comeet',
              snippet: 'Join Lightrun, a developer tools company'
            }
          ]
        }
      });

      const result = await externalCompanyService.discoverComeetCompanies('Israel');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].atsProvider).toBe('COMEET');
      expect(result[0].atsCompanyId).toBe('lightrun');
      expect(result[0].atsToken).toBe('Lightrun.006');
    });
  });

  describe('verifyCompany', () => {
    it('should verify and activate company on successful API call', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        atsProvider: 'COMEET',
        atsCompanyId: 'test-uid',
        atsToken: 'test-token'
      };

      mockPrisma.externalCompany.findUnique.mockResolvedValue(mockCompany);
      mockPrisma.externalCompany.update.mockResolvedValue({ ...mockCompany, status: 'ACTIVE' });
      (axios.get as any).mockResolvedValue({ status: 200, data: [] });

      const result = await externalCompanyService.verifyCompany('company-123');

      expect(result).toBe(true);
      expect(mockPrisma.externalCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          isVerified: true
        })
      });
    });

    it('should mark company as invalid on failed verification', async () => {
      const mockCompany = {
        id: 'company-123',
        atsProvider: 'COMEET',
        atsCompanyId: 'test-uid'
      };

      mockPrisma.externalCompany.findUnique.mockResolvedValue(mockCompany);
      mockPrisma.externalCompany.update.mockResolvedValue({});
      (axios.get as any).mockRejectedValue(new Error('Connection refused'));

      const result = await externalCompanyService.verifyCompany('company-123');

      expect(result).toBe(false);
      expect(mockPrisma.externalCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: expect.objectContaining({
          status: 'INVALID'
        })
      });
    });

    it('should return false for non-existent company', async () => {
      mockPrisma.externalCompany.findUnique.mockResolvedValue(null);

      const result = await externalCompanyService.verifyCompany('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.externalCompany.count.mockResolvedValueOnce(100); // total
      mockPrisma.externalCompany.groupBy
        .mockResolvedValueOnce([
          { status: 'ACTIVE', _count: 80 },
          { status: 'PENDING', _count: 20 }
        ])
        .mockResolvedValueOnce([
          { atsProvider: 'COMEET', _count: 90 },
          { atsProvider: 'GREENHOUSE', _count: 10 }
        ])
        .mockResolvedValueOnce([
          { size: 'STARTUP', _count: 50 },
          { size: 'ENTERPRISE', _count: 50 }
        ]);
      mockPrisma.externalCompany.count.mockResolvedValueOnce(15); // needingEnrichment

      const stats = await externalCompanyService.getStats();

      expect(stats.total).toBe(100);
      expect(stats.byStatus).toHaveProperty('ACTIVE', 80);
      expect(stats.byProvider).toHaveProperty('COMEET', 90);
      expect(stats.needingEnrichment).toBe(15);
    });
  });

  describe('migrateHardcodedCompanies', () => {
    it('should migrate hardcoded companies to database', async () => {
      const hardcodedCompanies = [
        { name: 'Company A', uid: 'company-a', token: 'token-a', industry: 'tech', size: 'startup' as const },
        { name: 'Company B', uid: 'company-b', token: 'token-b', industry: 'fintech', size: 'midsize' as const }
      ];

      mockPrisma.externalCompany.create.mockResolvedValue({});

      const count = await externalCompanyService.migrateHardcodedCompanies(hardcodedCompanies);

      expect(count).toBe(2);
      expect(mockPrisma.externalCompany.create).toHaveBeenCalledTimes(2);
    });

    it('should handle migration errors gracefully', async () => {
      const hardcodedCompanies = [
        { name: 'Company A', uid: 'company-a', token: 'token-a' },
        { name: 'Company B', uid: 'company-b', token: 'token-b' }
      ];

      mockPrisma.externalCompany.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Database error'));

      const count = await externalCompanyService.migrateHardcodedCompanies(hardcodedCompanies);

      // Should count only successful migrations
      expect(count).toBe(1);
    });
  });
});
