/**
 * Interview Controller Tests
 * 
 * Tests for the Interview controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents/JobsAgent', () => ({
  jobsAgent: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: {}
    })
  }
}));

vi.mock('../../src/services/jobs/diagramGenerationService', () => ({
  diagramGenerationService: {
    generateDiagram: vi.fn().mockResolvedValue({
      components: [],
      connections: []
    })
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

describe('Interview Controller', () => {
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
      headers: {},
      app: {
        get: vi.fn().mockReturnValue(null)
      } as any
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractInterviewQuestions', () => {
    it('should extract questions from image', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          questions: [
            { text: 'What is your experience with React?', type: 'technical' }
          ] 
        }
      });

      const { extractInterviewQuestions } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        imageBase64: 'base64encodedimage',
        imageMimeType: 'image/jpeg'
      };

      await extractInterviewQuestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when image missing', async () => {
      const { extractInterviewQuestions } = await import('../../src/controllers/interviewController');
      
      mockReq.body = {};

      await extractInterviewQuestions(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when extraction fails', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Extraction failed'
      });

      const { extractInterviewQuestions } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { imageBase64: 'base64encodedimage' };

      await extractInterviewQuestions(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('generateInterviewAnswer', () => {
    it('should generate answer successfully', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          answer: 'Here is a sample answer...'
        }
      });

      const { generateInterviewAnswer } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        question: 'What is your experience with React?',
        role: 'Senior Developer',
        experience: 5
      };

      await generateInterviewAnswer(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when question missing', async () => {
      const { generateInterviewAnswer } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { role: 'Developer' };

      await generateInterviewAnswer(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('evaluateInterviewAnswer', () => {
    it('should evaluate answer successfully', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          evaluation: {
            score: 8,
            feedback: 'Good answer!'
          }
        }
      });

      const { evaluateInterviewAnswer } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        question: 'What is your experience with React?',
        userAnswer: 'I have 5 years of React experience...'
      };

      await evaluateInterviewAnswer(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when question or answer missing', async () => {
      const { evaluateInterviewAnswer } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { question: 'Test question' }; // missing userAnswer

      await evaluateInterviewAnswer(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getExampleQuestions', () => {
    it('should return example questions', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          questions: [
            { text: 'Tell me about yourself', category: 'behavioral' }
          ],
          tips: ['Be specific'],
          source: 'ai-generated'
        }
      });

      const { getExampleQuestions } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        company: 'Google',
        role: 'Software Engineer',
        category: 'technical'
      };

      await getExampleQuestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when agent fails', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Failed to generate questions'
      });

      const { getExampleQuestions } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { company: 'Google' };

      await getExampleQuestions(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getPopularCompanyQuestions', () => {
    it('should return popular company questions', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          companies: [
            { name: 'Google', questions: [] },
            { name: 'Amazon', questions: [] }
          ]
        }
      });

      const { getPopularCompanyQuestions } = await import('../../src/controllers/interviewController');

      await getPopularCompanyQuestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('evaluateSystemDesign', () => {
    it('should evaluate system design successfully', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          evaluation: {
            score: 85,
            feedback: 'Good design!'
          }
        }
      });

      const { evaluateSystemDesign } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        question: 'Design a URL shortener',
        imageBase64: 'base64encodedimage',
        elapsedTime: 1800
      };

      await evaluateSystemDesign(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when question missing', async () => {
      const { evaluateSystemDesign } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { imageBase64: 'base64encodedimage' };

      await evaluateSystemDesign(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getSystemDesignQuestions', () => {
    it('should return system design questions', async () => {
      const { jobsAgent } = await import('../../src/agents/JobsAgent');
      (jobsAgent.execute as any).mockResolvedValue({
        success: true,
        data: { 
          questions: [
            { title: 'Design a URL shortener', difficulty: 'medium' }
          ]
        }
      });

      const { getSystemDesignQuestions } = await import('../../src/controllers/interviewController');

      await getSystemDesignQuestions(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('generateSystemDesignDiagram', () => {
    it('should generate diagram successfully', async () => {
      const { diagramGenerationService } = await import('../../src/services/jobs/diagramGenerationService');
      (diagramGenerationService.generateDiagram as any).mockResolvedValue({
        components: [{ id: 'comp-1', type: 'server' }],
        connections: [{ from: 'comp-1', to: 'comp-2' }]
      });

      const { generateSystemDesignDiagram } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { 
        prompt: 'Create a load balancer architecture',
        questionTitle: 'Design a URL shortener'
      };

      await generateSystemDesignDiagram(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        diagram: expect.objectContaining({
          components: expect.any(Array),
          connections: expect.any(Array)
        })
      }));
    });

    it('should return 400 when prompt missing', async () => {
      const { generateSystemDesignDiagram } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { questionTitle: 'Design a URL shortener' };

      await generateSystemDesignDiagram(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when prompt is empty', async () => {
      const { generateSystemDesignDiagram } = await import('../../src/controllers/interviewController');
      
      mockReq.body = { prompt: '   ' };

      await generateSystemDesignDiagram(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });
});

