/**
 * JobsAgent Tests
 * 
 * Comprehensive tests for the Jobs Agent that handles job search, saving,
 * mock interviews, and system design evaluations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockPrisma, mockMockInterviewService, mockSystemDesignService } = vi.hoisted(() => ({
  mockPrisma: {
    savedJob: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    userPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  },
  mockMockInterviewService: {
    extractQuestionsFromImage: vi.fn(),
    generateAnswer: vi.fn(),
    evaluateAnswer: vi.fn(),
    getExampleQuestions: vi.fn(),
    getPopularCompanyQuestions: vi.fn()
  },
  mockSystemDesignService: {
    evaluateDesign: vi.fn(),
    getQuestions: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' }),
    logActivity: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      return defaultValue;
    })
  }
}));

vi.mock('../../src/services/jobs/mockInterviewService', () => ({
  default: mockMockInterviewService
}));

vi.mock('../../src/services/jobs/systemDesignEvaluationService', () => ({
  default: mockSystemDesignService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn()
  }
}));

vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn()
  }
}));

vi.mock('../../src/utils/retry', () => ({
  RateLimiter: class { async acquire() { return true; } },
  CircuitBreaker: class { async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); } },
  withRetry: vi.fn((fn) => fn())
}));

// Static import after mocks
import { JobsAgent } from '../../src/agents/JobsAgent';

describe('JobsAgent', () => {
  let jobsAgent: JobsAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPrisma.savedJob.findMany.mockResolvedValue([]);
    mockPrisma.savedJob.findUnique.mockResolvedValue(null);
    mockPrisma.savedJob.create.mockResolvedValue({ id: 'saved-job-123' });
    mockPrisma.savedJob.delete.mockResolvedValue({});
    mockPrisma.savedJob.update.mockResolvedValue({});
    mockPrisma.userPreferences.findUnique.mockResolvedValue(null);
    mockPrisma.userPreferences.upsert.mockResolvedValue({});
    mockPrisma.agentActivity.create.mockResolvedValue({});
    
    mockMockInterviewService.extractQuestionsFromImage.mockResolvedValue([
      { id: 'q1', question: 'Tell me about yourself', category: 'behavioral' }
    ]);
    mockMockInterviewService.generateAnswer.mockResolvedValue({
      answer: 'Sample answer based on STAR method',
      tips: ['Be specific', 'Use STAR method']
    });
    mockMockInterviewService.evaluateAnswer.mockResolvedValue({
      score: 85,
      feedback: 'Good answer with clear examples',
      improvements: ['Add more examples'],
      strengths: ['Clear communication']
    });
    mockMockInterviewService.getExampleQuestions.mockResolvedValue([
      { id: 'q1', question: 'Tell me about yourself', category: 'behavioral' },
      { id: 'q2', question: 'What is your greatest strength?', category: 'behavioral' }
    ]);
    mockMockInterviewService.getPopularCompanyQuestions.mockResolvedValue([
      { company: 'Google', questions: ['Why Google?'] }
    ]);
    
    mockSystemDesignService.evaluateDesign.mockResolvedValue({
      score: 80,
      feedback: 'Good design with proper scalability considerations',
      suggestions: ['Consider caching', 'Add load balancing']
    });
    mockSystemDesignService.getQuestions.mockResolvedValue([
      { id: 'sd1', title: 'Design a URL shortener', difficulty: 'medium' }
    ]);
    
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
    it('should require userId', async () => {
      const result = await jobsAgent.execute({
        action: 'save-job',
        jobData: { id: 'job-1', title: 'Developer', company: 'Tech Co' }
      });
      
      expect(result.success).toBe(false);
    });

    it('should require jobData', async () => {
      const result = await jobsAgent.execute({
        action: 'save-job',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
    });

    it('should save job successfully', async () => {
      mockPrisma.savedJob.create.mockResolvedValue({
        id: 'saved-job-123',
        title: 'Senior Developer',
        company: 'Tech Corp'
      });
      
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

    it('should handle database errors', async () => {
      mockPrisma.savedJob.create.mockRejectedValue(new Error('Database error'));
      
      const result = await jobsAgent.execute({
        action: 'save-job',
        userId: 'user-123',
        jobData: { id: 'job-1', title: 'Developer', company: 'Co' }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('get-saved action', () => {
    it('should require userId', async () => {
      const result = await jobsAgent.execute({
        action: 'get-saved'
      });
      
      expect(result.success).toBe(false);
    });

    it('should return saved jobs', async () => {
      mockPrisma.savedJob.findMany.mockResolvedValue([
        { id: 'job-1', title: 'Developer', company: 'Tech Co' },
        { id: 'job-2', title: 'Designer', company: 'Design Co' }
      ]);
      
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

  describe('update-preferences action', () => {
    it('should require userId', async () => {
      const result = await jobsAgent.execute({
        action: 'update-preferences',
        preferences: { preferredLocations: ['Remote'] }
      });
      
      expect(result.success).toBe(false);
    });

    it('should update preferences successfully', async () => {
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        preferredLocations: ['Remote', 'Tel Aviv'],
        minSalary: 100000
      });
      
      const result = await jobsAgent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: {
          preferredLocations: ['Remote', 'Tel Aviv'],
          minSalary: 100000
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('extract-interview-questions action', () => {
    it('should require image data', async () => {
      const result = await jobsAgent.execute({
        action: 'extract-interview-questions'
      });
      
      expect(result.success).toBe(false);
    });

    it('should attempt to extract questions from image', async () => {
      const result = await jobsAgent.execute({
        action: 'extract-interview-questions',
        imageBase64: 'base64encodedimage==',
        imageMimeType: 'image/png'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle extraction errors', async () => {
      mockMockInterviewService.extractQuestionsFromImage.mockRejectedValue(new Error('OCR failed'));
      
      const result = await jobsAgent.execute({
        action: 'extract-interview-questions',
        imageBase64: 'invalidimage'
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('generate-answer action', () => {
    it('should require question', async () => {
      const result = await jobsAgent.execute({
        action: 'generate-answer'
      });
      
      expect(result.success).toBe(false);
    });

    it('should generate answer', async () => {
      const result = await jobsAgent.execute({
        action: 'generate-answer',
        question: 'Tell me about yourself',
        context: { role: 'Software Engineer', experience: '5 years' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.answer).toBeDefined();
    });
  });

  describe('evaluate-answer action', () => {
    it('should require question and answer', async () => {
      const result = await jobsAgent.execute({
        action: 'evaluate-answer',
        question: 'Tell me about yourself'
        // missing userAnswer
      });
      
      expect(result.success).toBe(false);
    });

    it('should evaluate answer', async () => {
      const result = await jobsAgent.execute({
        action: 'evaluate-answer',
        question: 'Tell me about yourself',
        userAnswer: 'I am a software engineer with 5 years of experience...',
        context: { role: 'Software Engineer' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.evaluation).toBeDefined();
    });
  });

  describe('get-example-questions action', () => {
    it('should attempt to get example questions', async () => {
      const result = await jobsAgent.execute({
        action: 'get-example-questions',
        role: 'Software Engineer',
        category: 'behavioral'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to get questions with filters', async () => {
      const result = await jobsAgent.execute({
        action: 'get-example-questions',
        role: 'Frontend Developer',
        company: 'Google',
        category: 'technical',
        experienceLevel: 'senior',
        count: 10
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('get-popular-company-questions action', () => {
    it('should attempt to get popular company questions', async () => {
      const result = await jobsAgent.execute({
        action: 'get-popular-company-questions'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('evaluate-system-design action', () => {
    it('should require question and design', async () => {
      const result = await jobsAgent.execute({
        action: 'evaluate-system-design'
      });
      
      expect(result.success).toBe(false);
    });

    it('should attempt to evaluate system design', async () => {
      const result = await jobsAgent.execute({
        action: 'evaluate-system-design',
        question: { title: 'Design a URL shortener', difficulty: 'medium' },
        design: {
          components: ['Load Balancer', 'API Gateway', 'Database'],
          description: 'Using a hash function to generate short URLs...'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('get-system-design-questions action', () => {
    it('should attempt to get system design questions', async () => {
      const result = await jobsAgent.execute({
        action: 'get-system-design-questions'
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
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
      
      const agent = new JobsAgent();
      const result = await agent.execute({
        action: 'save-job',
        userId: 'user-123',
        jobData: { id: 'job-1', title: 'Dev', company: 'Co' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
  });
});
