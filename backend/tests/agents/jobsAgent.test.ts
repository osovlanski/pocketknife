/**
 * JobsAgent Tests
 * 
 * Tests for the Jobs Agent that handles job search, saving, and mock interviews.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' })
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

vi.mock('../../src/services/jobs/mockInterviewService', () => ({
  default: {
    extractQuestionsFromImage: vi.fn().mockResolvedValue([
      { id: 'q1', question: 'Tell me about yourself', category: 'behavioral' }
    ]),
    generateAnswer: vi.fn().mockResolvedValue({
      answer: 'Sample answer',
      tips: ['Be specific', 'Use STAR method']
    }),
    evaluateAnswer: vi.fn().mockResolvedValue({
      score: 85,
      feedback: 'Good answer',
      improvements: ['Add more examples'],
      strengths: ['Clear communication']
    }),
    getExampleQuestions: vi.fn().mockResolvedValue([
      { id: 'q1', question: 'Tell me about yourself', category: 'behavioral' }
    ]),
    getPopularCompanyQuestions: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../src/services/jobs/systemDesignEvaluationService', () => ({
  default: {
    evaluateDesign: vi.fn().mockResolvedValue({
      score: 80,
      feedback: 'Good design',
      suggestions: ['Consider caching']
    }),
    getQuestions: vi.fn().mockResolvedValue([
      { id: 'sd1', title: 'Design a URL shortener', difficulty: 'medium' }
    ])
  }
}));

describe('JobsAgent', () => {
  let jobsAgent: any;
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      savedJob: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((args) => ({
          id: 'saved-job-123',
          ...args.data,
          savedAt: new Date()
        })),
        delete: vi.fn().mockResolvedValue({ id: 'saved-job-123' })
      },
      userPreferences: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation((args) => ({
          id: 'prefs-123',
          ...args.create
        }))
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
    
    const { JobsAgent } = await import('../../src/agents/JobsAgent');
    jobsAgent = new JobsAgent();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(jobsAgent.metadata.id).toBe('jobs');
    });
    
    it('should have correct name', () => {
      expect(jobsAgent.metadata.name).toBe('Jobs Agent');
    });
    
    it('should have correct icon', () => {
      expect(jobsAgent.metadata.icon).toBe('💼');
    });
    
    it('should have color defined', () => {
      expect(jobsAgent.metadata.color).toBeDefined();
    });
    
    it('should have description', () => {
      expect(jobsAgent.metadata.description).toBeDefined();
    });
  });

  describe('agent methods', () => {
    it('should have execute method', () => {
      expect(typeof jobsAgent.execute).toBe('function');
    });
    
    it('should have stop method', () => {
      expect(typeof jobsAgent.stop).toBe('function');
    });
    
    it('should have getState method', () => {
      expect(typeof jobsAgent.getState).toBe('function');
    });
    
    it('should have getMetrics method', () => {
      expect(typeof jobsAgent.getMetrics).toBe('function');
    });
  });

  describe('save-job action', () => {
    it('should save job successfully', async () => {
      const result = await jobsAgent.execute({
        action: 'save-job',
        userId: 'user-123',
        jobData: {
          id: 'job-1',
          title: 'Senior Developer',
          company: 'Tech Corp',
          url: 'https://example.com/job',
          location: 'Remote'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedJob).toBeDefined();
    });
    
    it('should handle database errors gracefully', async () => {
      mockPrisma.savedJob.create.mockRejectedValue(new Error('Database error'));
      
      const result = await jobsAgent.execute({
        action: 'save-job',
        userId: 'user-123',
        jobData: {
          id: 'job-1',
          title: 'Developer',
          company: 'Tech Co'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('get-saved action', () => {
    it('should return saved jobs for user', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Developer', company: 'Tech Co' },
        { id: 'job-2', title: 'Designer', company: 'Design Co' }
      ];
      mockPrisma.savedJob.findMany.mockResolvedValue(mockJobs);
      
      const result = await jobsAgent.execute({
        action: 'get-saved',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedJobs).toHaveLength(2);
    });
    
    it('should return empty array when no saved jobs', async () => {
      mockPrisma.savedJob.findMany.mockResolvedValue([]);
      
      const result = await jobsAgent.execute({
        action: 'get-saved',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedJobs).toHaveLength(0);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await jobsAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('database unavailable', () => {
    it('should handle database not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const result = await jobsAgent.execute({
        action: 'save-job',
        userId: 'user-123',
        jobData: { id: 'job-1', title: 'Dev', company: 'Co' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
    });
  });
});
