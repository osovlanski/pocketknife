/**
 * DIY Agent Tests
 * 
 * Tests for the DIY Agent that handles DIY project generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  diyProject: {
    create: vi.fn().mockResolvedValue({ id: 'project-1', title: 'Build a Bookshelf' }),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({})
  },
  agentActivity: {
    create: vi.fn().mockResolvedValue({})
  }
};

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn().mockReturnValue(mockPrisma),
  databaseService: {
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn().mockReturnValue(10)
  }
}));

vi.mock('../../src/services/diy', () => ({
  diyService: {
    generateProject: vi.fn().mockResolvedValue({
      id: 'project-1',
      title: 'Build a Bookshelf',
      description: 'A simple bookshelf project',
      steps: ['Step 1', 'Step 2'],
      materials: [],
      tools: [],
      estimatedTime: 4,
      difficulty: 'medium'
    }),
    getIdeas: vi.fn().mockResolvedValue([]),
    getTemplates: vi.fn().mockResolvedValue([]),
    getMaterialsLinks: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockReturnValue(['furniture', 'garden', 'home-improvement']),
    getFeaturedIdeas: vi.fn().mockResolvedValue([]),
    getInspiration: vi.fn().mockResolvedValue({ ideas: [] })
  }
}));

describe('DIY Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata', () => {
    it('should have correct metadata', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();
      
      expect(agent.metadata.id).toBe('diy');
      expect(agent.metadata.name).toBe('DIY Agent');
      expect(agent.metadata.icon).toBe('🔨');
    });
  });

  describe('generate action', () => {
    it('should generate a DIY project', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'generate',
        description: 'Build a simple bookshelf',
        category: 'furniture',
        budget: 100,
        skillLevel: 'beginner'
      });

      expect(result.success).toBe(true);
    });

    it('should fail without description', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'generate'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('description');
    });
  });

  describe('get-project action', () => {
    it('should get a project by ID', async () => {
      mockPrisma.diyProject.findUnique.mockResolvedValue({
        id: 'project-1',
        title: 'Test Project'
      });

      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-project',
        projectId: 'project-1'
      });

      expect(result.success).toBe(true);
    });

    it('should return error when project not found', async () => {
      mockPrisma.diyProject.findUnique.mockResolvedValue(null);

      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-project',
        projectId: 'nonexistent'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('get-projects action', () => {
    it('should get user projects', async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([
        { id: 'project-1', title: 'Project 1' },
        { id: 'project-2', title: 'Project 2' }
      ]);

      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-projects',
        userId: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.data?.projects).toBeDefined();
    });
  });

  describe('save-project action', () => {
    it('should save a project', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'save-project',
        userId: 'user-123',
        project: {
          title: 'My Project',
          description: 'Test project',
          steps: [],
          materials: [],
          tools: []
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('update-status action', () => {
    it('should update project status', async () => {
      mockPrisma.diyProject.findUnique.mockResolvedValue({
        id: 'project-1',
        status: 'planning'
      });

      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'update-status',
        projectId: 'project-1',
        status: 'in_progress'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-materials-links action', () => {
    it('should get materials purchase links', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-materials-links',
        materials: [
          { name: 'Wood planks', quantity: 4 },
          { name: 'Screws', quantity: 20 }
        ],
        location: 'New York'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('search-ideas action', () => {
    it('should search for DIY ideas', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'search-ideas',
        query: 'garden furniture'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-templates action', () => {
    it('should get project templates', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-templates',
        category: 'furniture'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-categories action', () => {
    it('should get available categories', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-categories'
      });

      expect(result.success).toBe(true);
      expect(result.data?.categories).toBeDefined();
    });
  });

  describe('get-featured-ideas action', () => {
    it('should get featured ideas', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-featured-ideas',
        count: 5
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get-inspiration action', () => {
    it('should get inspiration', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'get-inspiration',
        category: 'garden'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const { DIYAgent } = await import('../../src/agents/DIYAgent');
      const agent = new DIYAgent();

      const result = await agent.execute({
        action: 'unknown-action' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

