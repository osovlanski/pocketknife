/**
 * NotionService Tests
 * 
 * Tests for Notion integration service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the @notionhq/client before imports
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    databases: {
      retrieve: vi.fn(),
      query: vi.fn()
    },
    pages: {
      create: vi.fn(),
      update: vi.fn()
    }
  }))
}));

describe('NotionService', () => {
  beforeEach(() => {
    vi.resetModules();
    // Set up environment variable
    process.env.NOTION_TOKEN = 'test-notion-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NOTION_TOKEN;
  });

  describe('isConfigured', () => {
    it('should return true when NOTION_TOKEN is set', async () => {
      const { notionService } = await import('../../src/services/integrations/notionService');
      expect(notionService.isConfigured()).toBe(true);
    });

    it('should return false when NOTION_TOKEN is not set', async () => {
      delete process.env.NOTION_TOKEN;
      vi.resetModules();
      const { notionService } = await import('../../src/services/integrations/notionService');
      expect(notionService.isConfigured()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return not configured when token is missing', async () => {
      delete process.env.NOTION_TOKEN;
      vi.resetModules();
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const status = await notionService.getStatus();
      
      expect(status.configured).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.error).toContain('NOTION_TOKEN');
    });

    it('should return connected status when API call succeeds', async () => {
      const { Client } = await import('@notionhq/client');
      const mockSearch = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        search: mockSearch
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const status = await notionService.getStatus();
      
      expect(status.configured).toBe(true);
      expect(status.connected).toBe(true);
    });

    it('should return error status when API call fails', async () => {
      const { Client } = await import('@notionhq/client');
      const mockSearch = vi.fn().mockRejectedValue(new Error('API Error'));
      (Client as any).mockImplementation(() => ({
        search: mockSearch
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const status = await notionService.getStatus();
      
      expect(status.configured).toBe(true);
      expect(status.connected).toBe(false);
      expect(status.error).toBe('API Error');
    });
  });

  describe('search', () => {
    it('should search pages and return mapped results', async () => {
      const mockResults = [
        {
          id: 'page-1',
          url: 'https://notion.so/page-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-02T00:00:00Z',
          properties: {
            Name: { title: [{ text: { content: 'Test Page' } }] }
          }
        }
      ];

      const { Client } = await import('@notionhq/client');
      const mockSearch = vi.fn().mockResolvedValue({ results: mockResults });
      (Client as any).mockImplementation(() => ({
        search: mockSearch
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const results = await notionService.search('test query');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('page-1');
      expect(results[0].title).toBe('Test Page');
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query'
      }));
    });

    it('should apply filter when provided', async () => {
      const { Client } = await import('@notionhq/client');
      const mockSearch = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        search: mockSearch
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      await notionService.search('query', 'database');
      
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        filter: { property: 'object', value: 'database' }
      }));
    });

    it('should throw error when not configured', async () => {
      delete process.env.NOTION_TOKEN;
      vi.resetModules();
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      await expect(notionService.search('query')).rejects.toThrow('Notion not configured');
    });
  });

  describe('getDatabase', () => {
    it('should retrieve database by ID', async () => {
      const mockDatabase = {
        id: 'db-1',
        title: [{ text: { content: 'My Database' } }],
        properties: { Name: { type: 'title' } }
      };

      const { Client } = await import('@notionhq/client');
      const mockRetrieve = vi.fn().mockResolvedValue(mockDatabase);
      (Client as any).mockImplementation(() => ({
        databases: { retrieve: mockRetrieve }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const result = await notionService.getDatabase('db-1');
      
      expect(result.id).toBe('db-1');
      expect(result.title).toBe('My Database');
      expect(mockRetrieve).toHaveBeenCalledWith({ database_id: 'db-1' });
    });
  });

  describe('queryDatabase', () => {
    it('should query database and return mapped pages', async () => {
      const mockPages = [
        {
          id: 'page-1',
          url: 'https://notion.so/page-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-02T00:00:00Z',
          properties: { Name: { title: [{ text: { content: 'Item 1' } }] } }
        }
      ];

      const { Client } = await import('@notionhq/client');
      const mockQuery = vi.fn().mockResolvedValue({ results: mockPages });
      (Client as any).mockImplementation(() => ({
        databases: { query: mockQuery }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const results = await notionService.queryDatabase('db-1');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('page-1');
      expect(results[0].title).toBe('Item 1');
    });

    it('should apply filter and sorts when provided', async () => {
      const { Client } = await import('@notionhq/client');
      const mockQuery = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        databases: { query: mockQuery }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const filter = { property: 'Status', select: { equals: 'Done' } };
      const sorts = [{ property: 'Name', direction: 'ascending' }];
      
      await notionService.queryDatabase('db-1', filter, sorts);
      
      expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
        database_id: 'db-1',
        filter,
        sorts
      }));
    });
  });

  describe('createDatabaseEntry', () => {
    it('should create a page in a database', async () => {
      const mockResponse = {
        id: 'new-page',
        url: 'https://notion.so/new-page',
        created_time: '2026-01-01T00:00:00Z',
        last_edited_time: '2026-01-01T00:00:00Z',
        properties: { Name: { title: [{ text: { content: 'New Item' } }] } }
      };

      const { Client } = await import('@notionhq/client');
      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (Client as any).mockImplementation(() => ({
        pages: { create: mockCreate }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const properties = {
        Name: { title: [{ text: { content: 'New Item' } }] }
      };
      
      const result = await notionService.createDatabaseEntry('db-1', properties);
      
      expect(result.id).toBe('new-page');
      expect(mockCreate).toHaveBeenCalledWith({
        parent: { database_id: 'db-1' },
        properties
      });
    });
  });

  describe('updatePage', () => {
    it('should update page properties', async () => {
      const mockResponse = {
        id: 'page-1',
        url: 'https://notion.so/page-1',
        created_time: '2026-01-01T00:00:00Z',
        last_edited_time: '2026-01-02T00:00:00Z',
        properties: { Status: { select: { name: 'Done' } } }
      };

      const { Client } = await import('@notionhq/client');
      const mockUpdate = vi.fn().mockResolvedValue(mockResponse);
      (Client as any).mockImplementation(() => ({
        pages: { update: mockUpdate }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      const properties = { Status: { select: { name: 'Done' } } };
      
      const result = await notionService.updatePage('page-1', properties);
      
      expect(result.id).toBe('page-1');
      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-1',
        properties
      });
    });
  });

  describe('archivePage', () => {
    it('should archive a page', async () => {
      const { Client } = await import('@notionhq/client');
      const mockUpdate = vi.fn().mockResolvedValue({});
      (Client as any).mockImplementation(() => ({
        pages: { update: mockUpdate }
      }));

      vi.resetModules();
      process.env.NOTION_TOKEN = 'test-token';
      const { notionService } = await import('../../src/services/integrations/notionService');
      
      await notionService.archivePage('page-1');
      
      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-1',
        archived: true
      });
    });
  });

  describe('helper methods', () => {
    describe('saveLearningResource', () => {
      it('should save a learning resource with correct properties', async () => {
        const mockResponse = {
          id: 'resource-1',
          url: 'https://notion.so/resource-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-01T00:00:00Z',
          properties: {}
        };

        const { Client } = await import('@notionhq/client');
        const mockCreate = vi.fn().mockResolvedValue(mockResponse);
        (Client as any).mockImplementation(() => ({
          pages: { create: mockCreate }
        }));

        vi.resetModules();
        process.env.NOTION_TOKEN = 'test-token';
        const { notionService } = await import('../../src/services/integrations/notionService');
        
        const resource = {
          title: 'Learn TypeScript',
          url: 'https://typescript.org',
          category: 'Programming',
          tags: ['typescript', 'javascript'],
          notes: 'Great resource'
        };
        
        await notionService.saveLearningResource('db-1', resource);
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          parent: { database_id: 'db-1' },
          properties: expect.objectContaining({
            Name: { title: [{ text: { content: 'Learn TypeScript' } }] },
            URL: { url: 'https://typescript.org' },
            Category: { select: { name: 'Programming' } }
          })
        }));
      });
    });

    describe('saveJobApplication', () => {
      it('should save a job application with correct properties', async () => {
        const mockResponse = {
          id: 'job-1',
          url: 'https://notion.so/job-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-01T00:00:00Z',
          properties: {}
        };

        const { Client } = await import('@notionhq/client');
        const mockCreate = vi.fn().mockResolvedValue(mockResponse);
        (Client as any).mockImplementation(() => ({
          pages: { create: mockCreate }
        }));

        vi.resetModules();
        process.env.NOTION_TOKEN = 'test-token';
        const { notionService } = await import('../../src/services/integrations/notionService');
        
        const job = {
          company: 'TechCorp',
          position: 'Senior Developer',
          url: 'https://jobs.com/123',
          status: 'Applied',
          salary: '$150k',
          notes: 'Great company'
        };
        
        await notionService.saveJobApplication('db-1', job);
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          parent: { database_id: 'db-1' },
          properties: expect.objectContaining({
            Company: { title: [{ text: { content: 'TechCorp' } }] },
            Position: { rich_text: [{ text: { content: 'Senior Developer' } }] },
            Status: { select: { name: 'Applied' } }
          })
        }));
      });
    });

    describe('saveRecipe', () => {
      it('should save a recipe with correct properties', async () => {
        const mockResponse = {
          id: 'recipe-1',
          url: 'https://notion.so/recipe-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-01T00:00:00Z',
          properties: {}
        };

        const { Client } = await import('@notionhq/client');
        const mockCreate = vi.fn().mockResolvedValue(mockResponse);
        (Client as any).mockImplementation(() => ({
          pages: { create: mockCreate }
        }));

        vi.resetModules();
        process.env.NOTION_TOKEN = 'test-token';
        const { notionService } = await import('../../src/services/integrations/notionService');
        
        const recipe = {
          title: 'Pasta Carbonara',
          url: 'https://recipes.com/carbonara',
          ingredients: ['pasta', 'eggs', 'parmesan', 'bacon'],
          instructions: 'Cook pasta, mix eggs with cheese...',
          prepTime: 15,
          cookTime: 20
        };
        
        await notionService.saveRecipe('db-1', recipe);
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          parent: { database_id: 'db-1' },
          properties: expect.objectContaining({
            Name: { title: [{ text: { content: 'Pasta Carbonara' } }] },
            'Prep Time': { number: 15 },
            'Cook Time': { number: 20 }
          })
        }));
      });
    });

    describe('createTask', () => {
      it('should create a task with correct properties', async () => {
        const mockResponse = {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-01T00:00:00Z',
          properties: {}
        };

        const { Client } = await import('@notionhq/client');
        const mockCreate = vi.fn().mockResolvedValue(mockResponse);
        (Client as any).mockImplementation(() => ({
          pages: { create: mockCreate }
        }));

        vi.resetModules();
        process.env.NOTION_TOKEN = 'test-token';
        const { notionService } = await import('../../src/services/integrations/notionService');
        
        const task = {
          title: 'Review PR',
          dueDate: '2026-01-15',
          priority: 'High' as const,
          status: 'In Progress',
          notes: 'Important task'
        };
        
        await notionService.createTask('db-1', task);
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          parent: { database_id: 'db-1' },
          properties: expect.objectContaining({
            Name: { title: [{ text: { content: 'Review PR' } }] },
            Priority: { select: { name: 'High' } },
            Status: { select: { name: 'In Progress' } }
          })
        }));
      });

      it('should use default status when not provided', async () => {
        const mockResponse = {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          created_time: '2026-01-01T00:00:00Z',
          last_edited_time: '2026-01-01T00:00:00Z',
          properties: {}
        };

        const { Client } = await import('@notionhq/client');
        const mockCreate = vi.fn().mockResolvedValue(mockResponse);
        (Client as any).mockImplementation(() => ({
          pages: { create: mockCreate }
        }));

        vi.resetModules();
        process.env.NOTION_TOKEN = 'test-token';
        const { notionService } = await import('../../src/services/integrations/notionService');
        
        await notionService.createTask('db-1', { title: 'Simple Task' });
        
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          properties: expect.objectContaining({
            Status: { select: { name: 'Not Started' } }
          })
        }));
      });
    });
  });
});


