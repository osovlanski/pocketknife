/**
 * Problem Solving Controller Tests
 * 
 * Tests for the Problem Solving controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted for mocks
const { mockPrisma, mockProblemSolvingService, mockDatabaseService } = vi.hoisted(() => ({
  mockPrisma: {
    solvedProblem: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn()
    }
  },
  mockProblemSolvingService: {
    searchProblems: vi.fn(),
    generateHints: vi.fn(),
    getProblemDescription: vi.fn(),
    evaluateCode: vi.fn(),
    generateSignature: vi.fn(),
    generateImprovedCode: vi.fn(),
    fixSyntaxErrors: vi.fn()
  },
  mockDatabaseService: {
    getDefaultUser: vi.fn(),
    logActivity: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/problemSolving/problemSolvingService', () => ({
  default: mockProblemSolvingService
}));

vi.mock('../../src/data/companyMappings', () => ({
  getCompanyProfile: vi.fn().mockReturnValue({ name: 'Google', focus: ['algorithms'] }),
  getAllCompanyNames: vi.fn().mockReturnValue(['Google', 'Amazon', 'Meta'])
}));

vi.mock('../../src/data/curatedProblems', () => ({
  BLIND_75: [{ title: 'Two Sum', category: 'arrays' }],
  NEETCODE_EXTRA: [{ title: 'Valid Anagram', category: 'strings' }],
  GRIND_75: [{ title: 'Best Time to Buy', category: 'arrays' }]
}));

vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: mockDatabaseService,
  getPrisma: vi.fn(() => mockPrisma)
}));

vi.mock('../../src/data/codingPatterns', () => ({
  CODING_PATTERNS: [{ id: 'sliding-window', name: 'Sliding Window' }],
  getPatternsByCategory: vi.fn().mockReturnValue([]),
  getPatternsByDifficulty: vi.fn().mockReturnValue([]),
  searchPatterns: vi.fn().mockReturnValue([]),
  getAllCategories: vi.fn().mockReturnValue(['arrays', 'strings']),
  getRelatedPatterns: vi.fn().mockReturnValue([])
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    search: vi.fn(),
    processing: vi.fn(),
    api: vi.fn(),
    db: vi.fn(),
    success: vi.fn(),
    found: vi.fn()
  }
}));

// Static imports after mocks
import {
  getCodingPatterns,
  getAllCompanies,
  getCuratedLists,
  searchProblems,
  generateHints,
  evaluateCode,
  generateImprovedCode,
  fixSyntaxErrors,
  generateSignature,
  saveSolvedProblem,
  getSolvedProblems,
  getSolvedProblemCode
} from '../../src/controllers/problemSolvingController';

describe('Problem Solving Controller', () => {
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
      headers: { 'x-user-email': 'test@test.com' }
    };

    // Reset mock values to defaults
    mockProblemSolvingService.searchProblems.mockResolvedValue([]);
    mockProblemSolvingService.generateHints.mockResolvedValue([]);
    mockProblemSolvingService.getProblemDescription.mockResolvedValue('Problem description');
    mockProblemSolvingService.evaluateCode.mockResolvedValue({ score: 80 });
    mockProblemSolvingService.generateSignature.mockResolvedValue('function signature');
    mockProblemSolvingService.generateImprovedCode.mockResolvedValue('improved code');
    mockProblemSolvingService.fixSyntaxErrors.mockResolvedValue('fixed code');
    
    mockDatabaseService.getDefaultUser.mockResolvedValue({ id: 'user-123', email: 'test@test.com' });
    mockDatabaseService.logActivity.mockResolvedValue({});
    
    mockPrisma.solvedProblem.upsert.mockResolvedValue({ id: 'solved-1' });
    mockPrisma.solvedProblem.findMany.mockResolvedValue([]);
    mockPrisma.solvedProblem.findFirst.mockResolvedValue(null);
    mockPrisma.solvedProblem.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCodingPatterns', () => {
    it('should return coding patterns', async () => {
      await getCodingPatterns(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getCuratedLists', () => {
    it('should return curated lists', async () => {
      mockReq.query = { list: 'BLIND_75' };

      await getCuratedLists(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getAllCompanies', () => {
    it('should return all companies', async () => {
      await getAllCompanies(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('searchProblems', () => {
    it('should search problems with query', async () => {
      mockReq.query = { q: 'two sum', difficulty: 'easy' };

      await searchProblems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return empty results for empty query', async () => {
      mockReq.query = {};

      await searchProblems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('generateHints', () => {
    it('should return hints for problem', async () => {
      mockReq.body = { problem: 'Two Sum', code: 'function twoSum(){}' };

      await generateHints(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for missing problem', async () => {
      mockReq.body = { code: 'function twoSum(){}' };

      await generateHints(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('evaluateCode', () => {
    it('should evaluate code successfully', async () => {
      mockReq.body = { 
        code: 'function solve(){}', 
        problemTitle: 'Two Sum',
        language: 'javascript'
      };

      await evaluateCode(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for missing code', async () => {
      mockReq.body = { problemTitle: 'Two Sum' };

      await evaluateCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateImprovedCode', () => {
    it('should improve code', async () => {
      mockReq.body = { 
        code: 'function solve(){}',
        problemDescription: 'Find two numbers that add to target',
        requirements: 'Use O(n) time complexity'
      };

      await generateImprovedCode(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for missing code', async () => {
      mockReq.body = {};

      await generateImprovedCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('fixSyntaxErrors', () => {
    it('should fix syntax errors', async () => {
      mockReq.body = { 
        code: 'function solve({', 
        language: 'javascript',
        error: 'Unexpected end of input'
      };

      await fixSyntaxErrors(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for missing code', async () => {
      mockReq.body = {};

      await fixSyntaxErrors(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateSignature', () => {
    it('should generate function signature', async () => {
      mockReq.body = { 
        problemDescription: 'Given an array, find two numbers that add to target'
      };

      await generateSignature(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for missing description', async () => {
      mockReq.body = {};

      await generateSignature(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('saveSolvedProblem', () => {
    it('should save solved problem successfully', async () => {
      mockReq.body = { 
        problemId: 'problem-1',
        problemTitle: 'Two Sum',
        code: 'function twoSum() {}',
        language: 'javascript'
      };
      mockReq.headers = { 'x-user-email': 'test@test.com' };
      
      mockDatabaseService.getDefaultUser.mockResolvedValue({ id: 'user-123' });
      mockPrisma.solvedProblem.upsert.mockResolvedValue({ id: 'solved-1' });

      await saveSolvedProblem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSolvedProblems', () => {
    it('should return solved problems', async () => {
      mockDatabaseService.getDefaultUser.mockResolvedValue({ id: 'user-123' });
      mockPrisma.solvedProblem.findMany.mockResolvedValue([
        { id: 'solved-1', problemTitle: 'Two Sum' }
      ]);

      await getSolvedProblems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSolvedProblemCode', () => {
    it('should return solved problem code', async () => {
      mockReq.params = { id: 'solved-1' };
      mockDatabaseService.getDefaultUser.mockResolvedValue({ id: 'user-123' });
      mockPrisma.solvedProblem.findFirst.mockResolvedValue({
        id: 'solved-1',
        code: 'function twoSum() {}'
      });

      await getSolvedProblemCode(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 404 when problem not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockDatabaseService.getDefaultUser.mockResolvedValue({ id: 'user-123' });
      mockPrisma.solvedProblem.findFirst.mockResolvedValue(null);

      await getSolvedProblemCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });
});
