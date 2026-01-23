/**
 * Admin Controller Tests
 * 
 * Tests for administrative endpoints including:
 * - Company CRUD operations
 * - Discovery and migration
 * - Statistics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock external company service
vi.mock('../../src/services/jobs/externalCompanyService', () => ({
  externalCompanyService: {
    searchCompanies: vi.fn(),
    getCompanyById: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    deleteCompany: vi.fn(),
    verifyCompany: vi.fn(),
    enrichFromCrunchbase: vi.fn(),
    runDiscovery: vi.fn(),
    refreshCompanyData: vi.fn(),
    getStats: vi.fn()
  },
  default: {
    searchCompanies: vi.fn(),
    getCompanyById: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    deleteCompany: vi.fn(),
    verifyCompany: vi.fn(),
    enrichFromCrunchbase: vi.fn(),
    runDiscovery: vi.fn(),
    refreshCompanyData: vi.fn(),
    getStats: vi.fn()
  }
}));

// Mock comeet careers service
vi.mock('../../src/services/jobs/comeetCareersService', () => ({
  default: {
    migrateToDatabase: vi.fn()
  }
}));

import * as adminController from '../../src/controllers/adminController';
import { externalCompanyService } from '../../src/services/jobs/externalCompanyService';
import comeetCareersService from '../../src/services/jobs/comeetCareersService';

describe('Admin Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      params: {},
      query: {},
      body: {}
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listCompanies', () => {
    it('should return list of companies', async () => {
      const mockCompanies = [
        { id: '1', name: 'Company A' },
        { id: '2', name: 'Company B' }
      ];
      (externalCompanyService.searchCompanies as any).mockResolvedValue(mockCompanies);

      mockReq.query = { limit: '100', offset: '0' };

      await adminController.listCompanies(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        count: 2,
        companies: mockCompanies
      });
    });

    it('should apply filters from query params', async () => {
      (externalCompanyService.searchCompanies as any).mockResolvedValue([]);

      mockReq.query = {
        atsProvider: 'COMEET',
        status: 'ACTIVE',
        size: 'STARTUP',
        limit: '50'
      };

      await adminController.listCompanies(mockReq as Request, mockRes as Response);

      expect(externalCompanyService.searchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          atsProvider: 'COMEET',
          status: 'ACTIVE',
          size: 'STARTUP',
          limit: 50
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (externalCompanyService.searchCompanies as any).mockRejectedValue(new Error('Database error'));

      await adminController.listCompanies(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to list companies' });
    });
  });

  describe('getCompany', () => {
    it('should return company by ID', async () => {
      const mockCompany = { id: 'company-123', name: 'Test Company' };
      (externalCompanyService.getCompanyById as any).mockResolvedValue(mockCompany);

      mockReq.params = { id: 'company-123' };

      await adminController.getCompany(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true, company: mockCompany });
    });

    it('should return 404 for non-existent company', async () => {
      (externalCompanyService.getCompanyById as any).mockResolvedValue(null);

      mockReq.params = { id: 'non-existent' };

      await adminController.getCompany(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Company not found' });
    });
  });

  describe('createCompany', () => {
    it('should create a new company', async () => {
      const mockCompany = { id: 'new-123', name: 'New Company' };
      (externalCompanyService.createCompany as any).mockResolvedValue(mockCompany);

      mockReq.body = {
        name: 'New Company',
        atsProvider: 'COMEET',
        atsCompanyId: 'new-uid',
        atsToken: 'new-token'
      };

      await adminController.createCompany(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({ success: true, company: mockCompany });
    });

    it('should handle error when service fails', async () => {
      (externalCompanyService.createCompany as any).mockRejectedValue(new Error('DB Error'));
      mockReq.body = { name: 'Test', atsProvider: 'COMEET', atsCompanyId: '123' };

      await adminController.createCompany(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCompany', () => {
    it('should update company data', async () => {
      const updatedCompany = { id: 'company-123', name: 'Updated Name' };
      (externalCompanyService.updateCompany as any).mockResolvedValue(updatedCompany);

      mockReq.params = { id: 'company-123' };
      mockReq.body = { name: 'Updated Name' };

      await adminController.updateCompany(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true, company: updatedCompany });
    });
  });

  describe('deleteCompany', () => {
    it('should delete a company', async () => {
      (externalCompanyService.deleteCompany as any).mockResolvedValue(undefined);

      mockReq.params = { id: 'company-123' };

      await adminController.deleteCompany(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true, message: 'Company deleted' });
    });
  });

  describe('verifyCompany', () => {
    it('should verify and activate company', async () => {
      const result = { verified: true, status: 'ACTIVE' };
      (externalCompanyService.verifyCompany as any).mockResolvedValue(result);

      mockReq.params = { id: 'company-123' };

      await adminController.verifyCompany(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('enrichCompany', () => {
    it('should enrich company with Crunchbase data', async () => {
      const enrichedCompany = { id: 'company-123', description: 'Enriched description' };
      (externalCompanyService.enrichFromCrunchbase as any).mockResolvedValue(enrichedCompany);

      mockReq.params = { id: 'company-123' };

      await adminController.enrichCompany(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        company: enrichedCompany
      }));
    });
  });

  describe('runDiscovery', () => {
    it('should run discovery with default parameters', async () => {
      const mockResult = 5; // runDiscovery returns number of new companies
      (externalCompanyService.runDiscovery as any).mockResolvedValue(mockResult);

      mockReq.body = {};

      await adminController.runDiscovery(mockReq as Request, mockRes as Response);

      expect(externalCompanyService.runDiscovery).toHaveBeenCalledWith([
        'Israel tech startup',
        'Israel cybersecurity', 
        'Israel fintech',
        'Israel AI'
      ]);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        newCompaniesCount: 5
      }));
    });

    it('should use custom queries when provided', async () => {
      const mockResult = 5;
      (externalCompanyService.runDiscovery as any).mockResolvedValue(mockResult);

      mockReq.body = { queries: ['custom query 1', 'custom query 2'] };

      await adminController.runDiscovery(mockReq as Request, mockRes as Response);

      expect(externalCompanyService.runDiscovery).toHaveBeenCalledWith(['custom query 1', 'custom query 2']);
    });
  });

  describe('migrateHardcodedCompanies', () => {
    it('should migrate hardcoded companies', async () => {
      (comeetCareersService.migrateToDatabase as any).mockResolvedValue(50);

      await adminController.migrateHardcodedCompanies(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        migratedCount: 50
      }));
    });
  });

  describe('refreshCompanyData', () => {
    it('should refresh company data with default limit', async () => {
      (externalCompanyService.refreshCompanyData as any).mockResolvedValue(25);

      mockReq.body = {};

      await adminController.refreshCompanyData(mockReq as Request, mockRes as Response);

      expect(externalCompanyService.refreshCompanyData).toHaveBeenCalledWith(50);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Refreshed 25 companies',
        enrichedCount: 25
      });
    });

    it('should use custom max companies limit', async () => {
      (externalCompanyService.refreshCompanyData as any).mockResolvedValue(10);

      mockReq.body = { maxCompanies: 10 };

      await adminController.refreshCompanyData(mockReq as Request, mockRes as Response);

      expect(externalCompanyService.refreshCompanyData).toHaveBeenCalledWith(10);
    });
  });

  describe('getCompanyStats', () => {
    it('should return company statistics', async () => {
      const mockStats = {
        total: 100,
        byStatus: { ACTIVE: 80, PENDING: 20 },
        byProvider: { COMEET: 90 },
        bySize: { STARTUP: 50 },
        needingEnrichment: 15
      };
      (externalCompanyService.getStats as any).mockResolvedValue(mockStats);

      await adminController.getCompanyStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ success: true, stats: mockStats });
    });
  });

  describe('getATSProviders', () => {
    it('should return list of ATS providers', async () => {
      await adminController.getATSProviders(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        providers: expect.arrayContaining([
          expect.objectContaining({ id: 'COMEET', name: 'Comeet' })
        ])
      });
    });
  });

  describe('getSizeCategories', () => {
    it('should return list of size categories', async () => {
      await adminController.getSizeCategories(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        sizes: expect.arrayContaining([
          { id: 'STARTUP', name: 'Startup', range: '1-50 employees' }
        ])
      });
    });
  });
});


