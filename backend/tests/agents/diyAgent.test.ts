/**
 * DIY Agent Tests
 * 
 * Tests for the DIY Agent that handles DIY project generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available when vi.mock runs
const { mockPrisma, mockGetPrisma, mockDiyService } = vi.hoisted(() => {
  const prisma = {
    diyProject: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  };

  const diyService = {
    generateProject: vi.fn(),
    getProject: vi.fn(),
    getUserProjects: vi.fn(),
    saveProject: vi.fn(),
    updateProjectStatus: vi.fn(),
    getMaterialsWithPurchaseLinks: vi.fn(),
    createShoppingList: vi.fn(),
    searchDIYIdeas: vi.fn(),
    getTemplates: vi.fn(),
    addProjectFeedback: vi.fn(),
    getCategories: vi.fn(),
    getDifficultyInfo: vi.fn(),
    getFeaturedIdeas: vi.fn(),
    getRandomInspiration: vi.fn(),
    getIdeas: vi.fn(),
    getMaterialsLinks: vi.fn(),
    getInspiration: vi.fn()
  };

  return {
    mockPrisma: prisma,
    mockGetPrisma: vi.fn(() => prisma),
    mockDiyService: diyService
  };
});

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: mockGetPrisma,
  databaseService: {
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

// Mock retry utilities to prevent async waits
vi.mock('../../src/utils/retry', () => {
  class MockRateLimiter {
    async acquire(): Promise<boolean> { return true; }
    async waitForToken(): Promise<void> { return; }
    getAvailableTokens(): number { return 60; }
  }
  
  class MockCircuitBreaker {
    async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
    getState(): string { return 'closed'; }
    reset(): void {}
  }

  return {
    withRetry: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    RateLimiter: MockRateLimiter,
    CircuitBreaker: MockCircuitBreaker,
    isDefaultRetryable: () => false
  };
});

// Mock telemetry to prevent actual telemetry calls
vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    recordRateLimitHit: vi.fn(),
    recordRetry: vi.fn(),
    recordCircuitBreakerTrip: vi.fn(),
    setAgentState: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
      // Return sensible defaults for timeout-related config
      if (key.includes('timeout') || key.includes('Timeout')) {
        return defaultValue || 5000;
      }
      return defaultValue ?? 10;
    })
  }
}));

vi.mock('../../src/services/diy', () => ({
  diyService: mockDiyService
}));

// Mock logger to prevent console noise
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    agent: vi.fn(),
    start: vi.fn(),
    api: vi.fn(),
    db: vi.fn()
  }
}));

// Import agent AFTER mocks are set up (static import - Vitest hoists mocks automatically)
import { DIYAgent } from '../../src/agents/DIYAgent';

describe('DIY Agent', () => {
  let agent: DIYAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DIYAgent();
    
    // Set up default mock implementations
    mockPrisma.diyProject.create.mockResolvedValue({ id: 'project-1', title: 'Build a Bookshelf' });
    mockPrisma.diyProject.findMany.mockResolvedValue([]);
    mockPrisma.diyProject.findUnique.mockResolvedValue(null);
    mockPrisma.diyProject.update.mockResolvedValue({});
    mockPrisma.agentActivity.create.mockResolvedValue({});

    mockDiyService.generateProject.mockResolvedValue({
      id: 'project-1',
      title: 'Build a Bookshelf',
      description: 'A simple bookshelf project',
      instructions: ['Step 1', 'Step 2'],
      steps: ['Step 1', 'Step 2'],
      materials: [],
      tools: [],
      estimatedTime: 4,
      difficulty: 'medium',
      category: 'furniture'
    });
    mockDiyService.getProject.mockResolvedValue(null);
    mockDiyService.getUserProjects.mockResolvedValue([]);
    mockDiyService.saveProject.mockResolvedValue('project-1');
    mockDiyService.updateProjectStatus.mockResolvedValue({});
    mockDiyService.getMaterialsWithPurchaseLinks.mockResolvedValue([]);
    mockDiyService.createShoppingList.mockResolvedValue('list-1');
    mockDiyService.searchDIYIdeas.mockResolvedValue([]);
    mockDiyService.getTemplates.mockResolvedValue([]);
    mockDiyService.addProjectFeedback.mockResolvedValue({});
    mockDiyService.getCategories.mockReturnValue(['furniture', 'garden', 'home-improvement']);
    mockDiyService.getDifficultyInfo.mockReturnValue({ easy: 'Easy projects', medium: 'Medium projects' });
    mockDiyService.getFeaturedIdeas.mockResolvedValue([]);
    mockDiyService.getRandomInspiration.mockResolvedValue({ ideas: [] });
    mockDiyService.getIdeas.mockResolvedValue([]);
    mockDiyService.getMaterialsLinks.mockResolvedValue([]);
    mockDiyService.getInspiration.mockResolvedValue({ ideas: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.metadata.id).toBe('diy');
      expect(agent.metadata.name).toBe('DIY Agent');
      expect(agent.metadata.icon).toBe('🔨');
    });
  });

  describe('generate action', () => {
    it('should generate a DIY project', async () => {
      const result = await agent.execute({
        action: 'generate',
        description: 'Build a simple bookshelf',
        category: 'furniture',
        budget: 100,
        skillLevel: 'beginner'
      });

      expect(result.success).toBe(true);
      expect(mockDiyService.generateProject).toHaveBeenCalled();
    });

    it('should fail without description', async () => {
      const result = await agent.execute({
        action: 'generate'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('description');
    });
  });

  describe('get-project action', () => {
    it('should get a project by ID', async () => {
      mockDiyService.getProject.mockResolvedValue({
        id: 'project-1',
        title: 'Test Project'
      });

      const result = await agent.execute({
        action: 'get-project',
        projectId: 'project-1'
      });

      expect(result.success).toBe(true);
    });

    it('should return error when project not found', async () => {
      mockDiyService.getProject.mockResolvedValue(null);

      const result = await agent.execute({
        action: 'get-project',
        projectId: 'nonexistent'
      });

      expect(result.success).toBe(false);
    });

    it('should fail without projectId', async () => {
      const result = await agent.execute({
        action: 'get-project'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project ID');
    });
  });

  describe('get-projects action', () => {
    it('should get user projects', async () => {
      mockDiyService.getUserProjects.mockResolvedValue([
        { id: 'project-1', title: 'Project 1' },
        { id: 'project-2', title: 'Project 2' }
      ]);

      const result = await agent.execute({
        action: 'get-projects',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.projects).toBeDefined();
    });

    it('should fail without userId', async () => {
      const result = await agent.execute({
        action: 'get-projects'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });
  });

  describe('save-project action', () => {
    it('should save a project', async () => {
      const result = await agent.execute({
        action: 'save-project',
        userId: 'user-123',
        project: {
          title: 'My Project',
          description: 'Test project',
          steps: [],
          materials: [],
          tools: []
        } as any
      });

      expect(result.success).toBe(true);
      expect(mockDiyService.saveProject).toHaveBeenCalled();
    });

    it('should fail without userId', async () => {
      const result = await agent.execute({
        action: 'save-project',
        project: { title: 'Test' } as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should fail without project', async () => {
      const result = await agent.execute({
        action: 'save-project',
        userId: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project data');
    });
  });

  describe('update-status action', () => {
    it('should update project status', async () => {
      const result = await agent.execute({
        action: 'update-status',
        projectId: 'project-1',
        status: 'in_progress'
      });

      expect(result.success).toBe(true);
      expect(mockDiyService.updateProjectStatus).toHaveBeenCalled();
    });

    it('should fail without projectId', async () => {
      const result = await agent.execute({
        action: 'update-status',
        status: 'in_progress'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project ID');
    });

    it('should fail without status', async () => {
      const result = await agent.execute({
        action: 'update-status',
        projectId: 'project-1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Status');
    });
  });

  describe('get-materials-links action', () => {
    it('should get materials purchase links', async () => {
      mockDiyService.getMaterialsWithPurchaseLinks.mockResolvedValue([
        { name: 'Wood', link: 'http://example.com' }
      ]);

      const result = await agent.execute({
        action: 'get-materials-links',
        materials: [
          { name: 'Wood planks', quantity: 4 } as any,
          { name: 'Screws', quantity: 20 } as any
        ],
        location: 'New York'
      });

      expect(result.success).toBe(true);
    });

    it('should fail without materials', async () => {
      const result = await agent.execute({
        action: 'get-materials-links',
        location: 'New York'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Materials');
    });
  });

  describe('search-ideas action', () => {
    it('should search for DIY ideas', async () => {
      mockDiyService.searchDIYIdeas.mockResolvedValue([
        { id: 'idea-1', title: 'Garden Table' }
      ]);

      const result = await agent.execute({
        action: 'search-ideas',
        query: 'garden furniture'
      });

      expect(result.success).toBe(true);
    });

    it('should fail without query', async () => {
      const result = await agent.execute({
        action: 'search-ideas'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('query');
    });
  });

  describe('get-templates action', () => {
    it('should get project templates', async () => {
      mockDiyService.getTemplates.mockResolvedValue([
        { id: 'template-1', title: 'Basic Table' }
      ]);

      const result = await agent.execute({
        action: 'get-templates',
        category: 'furniture'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-categories action', () => {
    it('should get available categories', async () => {
      const result = await agent.execute({
        action: 'get-categories'
      });

      expect(result.success).toBe(true);
      expect(result.data?.categories).toBeDefined();
    });
  });

  describe('get-featured-ideas action', () => {
    it('should get featured ideas', async () => {
      mockDiyService.getFeaturedIdeas.mockResolvedValue([
        { id: 'idea-1', title: 'Featured Project' }
      ]);

      const result = await agent.execute({
        action: 'get-featured-ideas',
        count: 5
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-inspiration action', () => {
    it('should get inspiration', async () => {
      mockDiyService.getRandomInspiration.mockResolvedValue({
        title: 'Random Project',
        description: 'Get inspired!'
      });

      const result = await agent.execute({
        action: 'get-inspiration',
        category: 'garden'
      });

      expect(result.success).toBe(true);
    });

    it('should handle no inspiration found', async () => {
      mockDiyService.getRandomInspiration.mockResolvedValue(null);

      const result = await agent.execute({
        action: 'get-inspiration'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('inspiration');
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
