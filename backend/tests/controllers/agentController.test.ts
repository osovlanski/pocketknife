/**
 * Agent Controller Tests (Email Agent)
 * 
 * Tests for the Agent (Email) controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/email/gmailService', () => ({
  default: {
    getUnprocessedEmails: vi.fn().mockResolvedValue([]),
    addLabel: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/core/claudeService', () => ({
  default: {
    classifyEmail: vi.fn().mockResolvedValue({
      category: 'INVOICE',
      confidence: 0.95,
      reasoning: 'Test classification'
    }),
    analyzeEmailPatterns: vi.fn().mockResolvedValue({
      suggestedRules: []
    })
  }
}));

vi.mock('../../src/services/email/driveService', () => ({
  default: {
    listInvoices: vi.fn().mockResolvedValue({ invoices: [], authRequired: false }),
    isAuthenticated: vi.fn().mockReturnValue(true),
    getAuthUrl: vi.fn().mockReturnValue('https://auth.url')
  }
}));

vi.mock('../../src/utils/emailProcessor', () => ({
  default: {
    handleInvoice: vi.fn().mockResolvedValue({}),
    handleJobOffer: vi.fn().mockResolvedValue({}),
    handleSpam: vi.fn().mockResolvedValue({}),
    handleOfficial: vi.fn().mockResolvedValue({}),
    setUserNotificationMethod: vi.fn()
  }
}));

vi.mock('../../src/services/email/emailSchedulerService', () => ({
  default: {
    getStatus: vi.fn().mockReturnValue({ isRunning: false }),
    start: vi.fn().mockReturnValue({ isRunning: true }),
    stop: vi.fn().mockReturnValue({ isRunning: false }),
    updateSchedule: vi.fn().mockReturnValue({ isRunning: true })
  }
}));

vi.mock('../../src/services/core/processControlService', () => ({
  default: {
    startProcess: vi.fn(),
    completeProcess: vi.fn(),
    shouldStop: vi.fn().mockReturnValue(false)
  }
}));

vi.mock('../../src/services/email/emailPatternService', () => ({
  default: {
    findMatchingPattern: vi.fn().mockResolvedValue(null),
    recordEmailForLearning: vi.fn().mockResolvedValue({}),
    learnPatternsFromBatch: vi.fn().mockResolvedValue([]),
    getLearnedPatterns: vi.fn().mockResolvedValue([]),
    approvePattern: vi.fn().mockResolvedValue(true),
    deletePattern: vi.fn().mockResolvedValue(true),
    createCustomPattern: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn().mockReturnValue({
    user: {
      findUnique: vi.fn().mockResolvedValue(null)
    }
  })
}));

vi.mock('../../src/services/email/emailNotificationService', () => ({
  default: {
    sendJobOfferAlert: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/notifications/discordNotificationService', () => ({
  default: {
    sendJobOfferAlert: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/notifications/telegramNotificationService', () => ({
  default: {
    sendJobOfferAlert: vi.fn().mockResolvedValue({})
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

describe('Agent Controller (Email)', () => {
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

  describe('classifyEmail', () => {
    it('should classify email successfully', async () => {
      const { classifyEmail } = await import('../../src/controllers/agentController');
      
      mockReq.body = {
        email: {
          id: 'email-1',
          subject: 'Invoice for services',
          from: 'billing@company.com',
          body: 'Please find attached invoice...'
        }
      };

      await classifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle classification errors', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/claudeService', () => ({
        default: {
          classifyEmail: vi.fn().mockRejectedValue(new Error('Classification failed'))
        }
      }));

      const { classifyEmail } = await import('../../src/controllers/agentController');
      
      mockReq.body = { email: { subject: 'Test' } };

      await classifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('processEmail', () => {
    it('should process email', async () => {
      const { processEmail } = await import('../../src/controllers/agentController');
      
      mockReq.body = {
        email: {
          id: 'email-1',
          subject: 'Invoice for services',
          from: 'billing@company.com',
          body: 'Please find attached invoice...'
        }
      };

      await processEmail(mockReq as Request, mockRes as Response);

      // Controller may return various status codes depending on processing result
      expect(mockStatus).toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core/claudeService', () => ({
        default: {
          classifyEmail: vi.fn().mockRejectedValue(new Error('Processing failed'))
        }
      }));

      const { processEmail } = await import('../../src/controllers/agentController');
      
      mockReq.body = { email: { subject: 'Test' } };

      await processEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getUnprocessedEmails', () => {
    it('should return unprocessed emails', async () => {
      const gmailService = (await import('../../src/services/email/gmailService')).default;
      (gmailService.getUnprocessedEmails as any).mockResolvedValue([
        { id: 'email-1', subject: 'Test Email' }
      ]);

      const { getUnprocessedEmails } = await import('../../src/controllers/agentController');

      await getUnprocessedEmails(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle fetch errors', async () => {
      const gmailService = (await import('../../src/services/email/gmailService')).default;
      (gmailService.getUnprocessedEmails as any).mockRejectedValue(new Error('Fetch failed'));

      const { getUnprocessedEmails } = await import('../../src/controllers/agentController');

      await getUnprocessedEmails(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getInvoices', () => {
    it('should return invoices list', async () => {
      const driveService = (await import('../../src/services/email/driveService')).default;
      (driveService.listInvoices as any).mockResolvedValue({
        invoices: [{ id: 'inv-1', name: 'invoice.pdf' }],
        authRequired: false
      });

      const { getInvoices } = await import('../../src/controllers/agentController');

      await getInvoices(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should indicate auth required when not authenticated', async () => {
      const driveService = (await import('../../src/services/email/driveService')).default;
      (driveService.listInvoices as any).mockResolvedValue({
        invoices: [],
        authRequired: true,
        message: 'Authentication required'
      });

      const { getInvoices } = await import('../../src/controllers/agentController');

      await getInvoices(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        authRequired: true
      }));
    });

    it('should handle fetch errors', async () => {
      const driveService = (await import('../../src/services/email/driveService')).default;
      (driveService.listInvoices as any).mockRejectedValue(new Error('Fetch failed'));

      const { getInvoices } = await import('../../src/controllers/agentController');

      await getInvoices(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getGoogleAuthStatus', () => {
    it('should return authenticated status', async () => {
      const driveService = (await import('../../src/services/email/driveService')).default;
      (driveService.isAuthenticated as any).mockReturnValue(true);

      const { getGoogleAuthStatus } = await import('../../src/controllers/agentController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: true
      }));
    });

    it('should return auth URL when not authenticated', async () => {
      const driveService = (await import('../../src/services/email/driveService')).default;
      (driveService.isAuthenticated as any).mockReturnValue(false);
      (driveService.getAuthUrl as any).mockReturnValue('https://auth.url');

      const { getGoogleAuthStatus } = await import('../../src/controllers/agentController');

      await getGoogleAuthStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: false,
        authUrl: 'https://auth.url'
      }));
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return scheduler status', async () => {
      const emailSchedulerService = (await import('../../src/services/email/emailSchedulerService')).default;
      (emailSchedulerService.getStatus as any).mockReturnValue({ isRunning: false });

      const { getSchedulerStatus } = await import('../../src/controllers/agentController');

      await getSchedulerStatus(mockReq as Request, mockRes as Response);

      // Should respond with status or json
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('startScheduler', () => {
    it('should start scheduler', async () => {
      const emailSchedulerService = (await import('../../src/services/email/emailSchedulerService')).default;
      (emailSchedulerService.start as any).mockReturnValue({ isRunning: true });

      const { startScheduler } = await import('../../src/controllers/agentController');
      
      mockReq.body = { cronExpression: '0 * * * *' };

      await startScheduler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('stopScheduler', () => {
    it('should stop scheduler', async () => {
      const emailSchedulerService = (await import('../../src/services/email/emailSchedulerService')).default;
      (emailSchedulerService.stop as any).mockReturnValue({ isRunning: false });

      const { stopScheduler } = await import('../../src/controllers/agentController');

      await stopScheduler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule', async () => {
      const emailSchedulerService = (await import('../../src/services/email/emailSchedulerService')).default;
      (emailSchedulerService.updateSchedule as any).mockReturnValue({ isRunning: true });

      const { updateSchedule } = await import('../../src/controllers/agentController');
      
      mockReq.body = { cronExpression: '0 */2 * * *' };

      await updateSchedule(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 400 when cronExpression missing', async () => {
      const { updateSchedule } = await import('../../src/controllers/agentController');
      
      mockReq.body = {};

      await updateSchedule(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getLearnedPatterns', () => {
    it('should return learned patterns', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.getLearnedPatterns as any).mockResolvedValue([
        { id: 'pattern-1', senderDomain: 'example.com', category: 'INVOICE' }
      ]);

      const { getLearnedPatterns } = await import('../../src/controllers/agentController');

      await getLearnedPatterns(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('approvePattern', () => {
    it('should approve pattern successfully', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.approvePattern as any).mockResolvedValue(true);

      const { approvePattern } = await import('../../src/controllers/agentController');
      
      mockReq.params = { id: 'pattern-1' };

      await approvePattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 404 when pattern not found', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.approvePattern as any).mockResolvedValue(false);

      const { approvePattern } = await import('../../src/controllers/agentController');
      
      mockReq.params = { id: 'nonexistent' };

      await approvePattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePattern', () => {
    it('should delete pattern successfully', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.deletePattern as any).mockResolvedValue(true);

      const { deletePattern } = await import('../../src/controllers/agentController');
      
      mockReq.params = { id: 'pattern-1' };

      await deletePattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 404 when pattern not found', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.deletePattern as any).mockResolvedValue(false);

      const { deletePattern } = await import('../../src/controllers/agentController');
      
      mockReq.params = { id: 'nonexistent' };

      await deletePattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('createCustomPattern', () => {
    it('should create custom pattern successfully', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.createCustomPattern as any).mockResolvedValue(true);

      const { createCustomPattern } = await import('../../src/controllers/agentController');
      
      mockReq.body = {
        senderDomainOrEmail: 'company.com',
        category: 'INVOICE',
        customTag: 'Company Invoices'
      };

      await createCustomPattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 400 when required fields missing', async () => {
      const { createCustomPattern } = await import('../../src/controllers/agentController');
      
      mockReq.body = { senderDomainOrEmail: 'company.com' }; // missing category

      await createCustomPattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 500 when creation fails', async () => {
      const emailPatternService = (await import('../../src/services/email/emailPatternService')).default;
      (emailPatternService.createCustomPattern as any).mockResolvedValue(false);

      const { createCustomPattern } = await import('../../src/controllers/agentController');
      
      mockReq.body = {
        senderDomainOrEmail: 'company.com',
        category: 'INVOICE'
      };

      await createCustomPattern(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('testNotification', () => {
    it('should send test notification via email', async () => {
      process.env.NOTIFICATION_METHOD = 'email';
      
      const { testNotification } = await import('../../src/controllers/agentController');

      await testNotification(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle notification errors', async () => {
      process.env.NOTIFICATION_METHOD = 'email';
      
      const emailNotificationService = (await import('../../src/services/email/emailNotificationService')).default;
      (emailNotificationService.sendJobOfferAlert as any).mockRejectedValue(new Error('Send failed'));

      const { testNotification } = await import('../../src/controllers/agentController');

      await testNotification(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});

