/**
 * Problem Solving Controller Tests
 * 
 * Tests for the Problem Solving controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/problemSolving/problemSolvingService', () => ({
  default: {
    searchProblems: vi.fn().mockResolvedValue([]),
    generateHints: vi.fn().mockResolvedValue([]),
    getProblemDescription: vi.fn().mockResolvedValue('Problem description'),
    evaluateCode: vi.fn().mockResolvedValue({ score: 80 }),
    generateSignature: vi.fn().mockResolvedValue('function signature'),
    generateImprovedCode: vi.fn().mockResolvedValue('improved code'),
    fixSyntaxErrors: vi.fn().mockResolvedValue('fixed code')
  }
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
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@test.com' }),
    logActivity: vi.fn().mockResolvedValue({})
  },
  getPrisma: vi.fn().mockReturnValue({
    solvedProblem: {
      upsert: vi.fn().mockResolvedValue({ id: 'solved-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      groupBy: vi.fn().mockResolvedValue([])
    }
  })
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

describe('Problem Solving Controller', () => {
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

  describe('searchProblems', () => {
    it('should search problems successfully', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.searchProblems as any).mockResolvedValue([
        { id: 'prob-1', title: 'Two Sum' }
      ]);

      const { searchProblems } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { query: 'two sum', difficulty: 'easy' };

      await searchProblems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when query missing', async () => {
      const { searchProblems } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { difficulty: 'easy' };

      await searchProblems(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateHints', () => {
    it('should generate hints successfully', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.generateHints as any).mockResolvedValue([
        'Consider using a hash map',
        'Think about the time complexity'
      ]);

      const { generateHints } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers that add up to target'
      };

      await generateHints(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when title or description missing', async () => {
      const { generateHints } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { problemTitle: 'Two Sum' }; // missing description

      await generateHints(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getProblemDescription', () => {
    it('should return problem description', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.getProblemDescription as any).mockResolvedValue('Full problem description...');

      const { getProblemDescription } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = { titleSlug: 'two-sum' };

      await getProblemDescription(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when titleSlug missing', async () => {
      const { getProblemDescription } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = {};

      await getProblemDescription(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('evaluateCode', () => {
    it('should evaluate code successfully', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.evaluateCode as any).mockResolvedValue({
        score: 85,
        feedback: 'Good solution!'
      });

      const { evaluateCode } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers...',
        code: 'function twoSum(nums, target) { }',
        language: 'javascript'
      };

      await evaluateCode(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when code is empty', async () => {
      const { evaluateCode } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers...',
        code: '   '
      };

      await evaluateCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateSignature', () => {
    it('should generate signature successfully', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.generateSignature as any).mockResolvedValue('function twoSum(nums: number[], target: number): number[]');

      const { generateSignature } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers...',
        language: 'typescript'
      };

      await generateSignature(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('generateImprovedCode', () => {
    it('should generate improved code', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.generateImprovedCode as any).mockResolvedValue('improved code');

      const { generateImprovedCode } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers...',
        currentCode: 'function twoSum() {}',
        language: 'javascript',
        suggestions: ['Use hash map']
      };

      await generateImprovedCode(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when suggestions empty', async () => {
      const { generateImprovedCode } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemTitle: 'Two Sum',
        problemDescription: 'Find...',
        currentCode: 'code',
        suggestions: []
      };

      await generateImprovedCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('fixSyntaxErrors', () => {
    it('should fix syntax errors', async () => {
      const problemSolvingService = (await import('../../src/services/problemSolving/problemSolvingService')).default;
      (problemSolvingService.fixSyntaxErrors as any).mockResolvedValue('fixed code');

      const { fixSyntaxErrors } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        code: 'function test( {}',
        language: 'javascript'
      };

      await fixSyntaxErrors(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when code missing', async () => {
      const { fixSyntaxErrors } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { language: 'javascript' };

      await fixSyntaxErrors(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompanyInterviewProfile', () => {
    it('should return company profile', async () => {
      const { getCompanyInterviewProfile } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = { companyName: 'Google' };

      await getCompanyInterviewProfile(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when company name missing', async () => {
      const { getCompanyInterviewProfile } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = {};

      await getCompanyInterviewProfile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 when company not found', async () => {
      const { getCompanyProfile } = await import('../../src/data/companyMappings');
      (getCompanyProfile as any).mockReturnValue(null);

      const { getCompanyInterviewProfile } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = { companyName: 'Unknown' };

      await getCompanyInterviewProfile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getAllCompanies', () => {
    it('should return all companies', async () => {
      const { getAllCompanies } = await import('../../src/controllers/problemSolvingController');

      await getAllCompanies(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        companies: expect.any(Array)
      }));
    });
  });

  describe('getCuratedLists', () => {
    it('should return curated problem lists', async () => {
      const { getCuratedLists } = await import('../../src/controllers/problemSolvingController');

      await getCuratedLists(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        lists: expect.objectContaining({
          blind75: expect.any(Object),
          neetcode150: expect.any(Object),
          grind75: expect.any(Object)
        })
      }));
    });
  });

  describe('saveSolvedProblem', () => {
    it('should save solved problem successfully', async () => {
      const { saveSolvedProblem } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { 
        problemId: 'two-sum',
        title: 'Two Sum',
        source: 'leetcode',
        difficulty: 'easy',
        language: 'javascript',
        code: 'function twoSum() {}',
        score: 85
      };

      await saveSolvedProblem(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when required fields missing', async () => {
      const { saveSolvedProblem } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.body = { problemId: 'two-sum' }; // missing other required fields

      await saveSolvedProblem(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getSolvedProblems', () => {
    it('should return solved problems', async () => {
      const { getSolvedProblems } = await import('../../src/controllers/problemSolvingController');

      await getSolvedProblems(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('getSolvedProblemCode', () => {
    it('should return 404 when problem not found', async () => {
      const { getSolvedProblemCode } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = { problemId: 'nonexistent' };

      await getSolvedProblemCode(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getCodingPatterns', () => {
    it('should return coding patterns', async () => {
      const { getCodingPatterns } = await import('../../src/controllers/problemSolvingController');

      await getCodingPatterns(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('getCodingPatternById', () => {
    it('should return 404 when pattern not found', async () => {
      const { getCodingPatternById } = await import('../../src/controllers/problemSolvingController');
      
      mockReq.params = { patternId: 'nonexistent' };

      await getCodingPatternById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });
});

