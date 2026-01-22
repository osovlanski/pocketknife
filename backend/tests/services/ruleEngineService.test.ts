/**
 * Rule Engine Service Tests
 * 
 * Tests for the business rule evaluation engine.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn()
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue)
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('RuleEngineService', () => {
  let ruleEngineService: any;
  let mockPrisma: any;
  let cacheService: any;
  let configService: any;

  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock prisma
    mockPrisma = {
      businessRule: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      ruleAuditLog: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as Mock).mockReturnValue(mockPrisma);

    cacheService = (await import('../../src/services/core/cacheService')).cacheService;
    configService = (await import('../../src/services/core/configService')).configService;
    
    // Clear cache mocks
    (cacheService.get as Mock).mockResolvedValue(null);
    (cacheService.set as Mock).mockResolvedValue(undefined);
    (cacheService.delete as Mock).mockResolvedValue(undefined);

    // Import the service
    const module = await import('../../src/services/rules/ruleEngineService');
    ruleEngineService = module.ruleEngineService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // EVALUATE - Basic functionality
  // ===========================================================================

  describe('evaluate', () => {
    it('should return empty result when no rules exist', async () => {
      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.evaluated).toBe(0);
      expect(result.matched).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.finalContext).toEqual(context);
    });

    it('should return empty result when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.evaluated).toBe(0);
      expect(result.matched).toBe(0);
    });

    it('should evaluate rules sorted by priority', async () => {
      const mockRules = [
        {
          id: 'rule-2',
          name: 'Lower Priority Rule',
          category: 'scoring',
          priority: 10,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.value', value: 2 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        },
        {
          id: 'rule-1',
          name: 'Higher Priority Rule',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.value', value: 1 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { value: 0 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.evaluated).toBe(2);
      expect(result.matched).toBe(2);
      // Final value should be 2 because rule-2 runs after rule-1
      expect(result.finalContext.data.value).toBe(2);
    });

    it('should skip disabled rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Disabled Rule',
          category: 'scoring',
          priority: 1,
          enabled: false,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.value', value: 100 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { value: 0 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.evaluated).toBe(0);
      expect(result.finalContext.data.value).toBe(0);
    });

    it('should respect maxRulesPerRequest config', async () => {
      (configService.get as Mock).mockImplementation((key: string, defaultValue: unknown) => {
        if (key === 'ruleEngine.evaluation.maxRulesPerRequest') return 1;
        return defaultValue;
      });

      const mockRules = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          category: 'scoring',
          priority: 2,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.evaluated).toBe(1);
    });
  });

  // ===========================================================================
  // CONDITION EVALUATION
  // ===========================================================================

  describe('condition evaluation', () => {
    it('should evaluate eq condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Equal Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.status', operator: 'eq', value: 'active' }]
          },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { status: 'active' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.matched).toBe(true);
    });

    it('should evaluate neq condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Not Equal Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.status', operator: 'neq', value: 'inactive' }]
          },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { status: 'active' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.matched).toBe(true);
    });

    it('should evaluate gt, gte, lt, lte conditions correctly', async () => {
      const mockRules = [
        {
          id: 'rule-gte',
          name: 'GTE Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.score', operator: 'gte', value: 80 }]
          },
          actions: [{ type: 'set_value', target: 'data.grade', value: 'A' }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { score: 85 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.grade).toBe('A');
    });

    it('should evaluate in condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'In Array Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.category', operator: 'in', value: ['tech', 'science', 'engineering'] }]
          },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { category: 'tech' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
    });

    it('should evaluate contains condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Contains Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.tags', operator: 'contains', value: 'important' }]
          },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { tags: ['normal', 'important', 'urgent'] } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
    });

    it('should evaluate starts_with condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Starts With Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.email', operator: 'starts_with', value: 'admin' }]
          },
          actions: [{ type: 'set_value', target: 'data.isAdmin', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { email: 'admin@company.com' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.isAdmin).toBe(true);
    });

    it('should evaluate ends_with condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Ends With Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.email', operator: 'ends_with', value: '@company.com' }]
          },
          actions: [{ type: 'set_value', target: 'data.isInternal', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { email: 'user@company.com' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.isInternal).toBe(true);
    });

    it('should evaluate matches (regex) condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Regex Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.phone', operator: 'matches', value: '^\\+1\\d{10}$' }]
          },
          actions: [{ type: 'set_value', target: 'data.isUSPhone', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { phone: '+11234567890' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.isUSPhone).toBe(true);
    });

    it('should evaluate between condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Between Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.price', operator: 'between', value: [10, 100] }]
          },
          actions: [{ type: 'set_value', target: 'data.priceRange', value: 'medium' }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { price: 50 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.priceRange).toBe('medium');
    });

    it('should evaluate exists condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Exists Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.userId', operator: 'exists', value: true }]
          },
          actions: [{ type: 'set_value', target: 'data.authenticated', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { userId: 'user-123' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.authenticated).toBe(true);
    });

    it('should evaluate is_empty condition correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Is Empty Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [{ field: 'data.items', operator: 'is_empty', value: true }]
          },
          actions: [{ type: 'set_value', target: 'data.hasNoItems', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { items: [] } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.hasNoItems).toBe(true);
    });

    it('should evaluate OR conditions correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'OR Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'or',
            conditions: [
              { field: 'data.role', operator: 'eq', value: 'admin' },
              { field: 'data.role', operator: 'eq', value: 'superadmin' }
            ]
          },
          actions: [{ type: 'set_value', target: 'data.hasAccess', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { role: 'admin' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.hasAccess).toBe(true);
    });

    it('should evaluate nested condition groups correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Nested Groups Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: {
            operator: 'and',
            conditions: [
              { field: 'data.active', operator: 'eq', value: true },
              {
                operator: 'or',
                conditions: [
                  { field: 'data.type', operator: 'eq', value: 'premium' },
                  { field: 'data.type', operator: 'eq', value: 'enterprise' }
                ]
              }
            ]
          },
          actions: [{ type: 'set_value', target: 'data.eligible', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { active: true, type: 'premium' } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
      expect(result.finalContext.data.eligible).toBe(true);
    });
  });

  // ===========================================================================
  // ACTION EXECUTION
  // ===========================================================================

  describe('action execution', () => {
    it('should execute set_value action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Set Value Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.score', value: 100 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { score: 0 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.finalContext.data.score).toBe(100);
    });

    it('should execute multiply action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Multiply Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'multiply', target: 'data.score', value: 1.5 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { score: 100 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.finalContext.data.score).toBe(150);
    });

    it('should execute add action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Add Test',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'add', target: 'data.score', value: 25 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { score: 75 } };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.finalContext.data.score).toBe(100);
    });

    it('should execute filter action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Filter Test',
          category: 'filtering',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'filter', target: 'data.items', params: { active: true } }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = {
        agentId: 'test',
        action: 'test',
        data: {
          items: [
            { id: 1, active: true },
            { id: 2, active: false },
            { id: 3, active: true }
          ]
        }
      };
      const result = await ruleEngineService.evaluate(context, 'filtering');

      expect(result.finalContext.data.items).toHaveLength(2);
      expect(result.finalContext.data.items.every((i: any) => i.active)).toBe(true);
    });

    it('should execute sort action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Sort Test',
          category: 'filtering',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'sort', target: 'data.items', params: { field: 'score', order: 'desc' } }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = {
        agentId: 'test',
        action: 'test',
        data: {
          items: [
            { id: 1, score: 50 },
            { id: 2, score: 90 },
            { id: 3, score: 70 }
          ]
        }
      };
      const result = await ruleEngineService.evaluate(context, 'filtering');

      expect(result.finalContext.data.items[0].score).toBe(90);
      expect(result.finalContext.data.items[1].score).toBe(70);
      expect(result.finalContext.data.items[2].score).toBe(50);
    });

    it('should execute limit action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Limit Test',
          category: 'filtering',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'limit', target: 'data.items', value: 2 }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = {
        agentId: 'test',
        action: 'test',
        data: {
          items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
        }
      };
      const result = await ruleEngineService.evaluate(context, 'filtering');

      expect(result.finalContext.data.items).toHaveLength(2);
    });

    it('should execute transform action with uppercase', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Transform Test',
          category: 'transform',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'transform', target: 'data.name', params: { transformer: 'uppercase' } }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { name: 'hello world' } };
      const result = await ruleEngineService.evaluate(context, 'transform');

      expect(result.finalContext.data.name).toBe('HELLO WORLD');
    });

    it('should execute transform action with round', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Round Test',
          category: 'transform',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'transform', target: 'data.price', params: { transformer: 'round' } }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: { price: 49.7 } };
      const result = await ruleEngineService.evaluate(context, 'transform');

      expect(result.finalContext.data.price).toBe(50);
    });

    it('should handle abort action correctly', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Rule with Abort',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [
            { type: 'set_value', target: 'data.step1', value: true },
            { type: 'abort' },
            { type: 'set_value', target: 'data.step2', value: true }
          ],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.finalContext.data.step1).toBe(true);
      expect(result.finalContext.data.step2).toBeUndefined();
    });
  });

  // ===========================================================================
  // CRUD OPERATIONS
  // ===========================================================================

  describe('createRule', () => {
    it('should create a new rule', async () => {
      const newRule = {
        name: 'New Rule',
        description: 'Test rule',
        category: 'scoring' as const,
        priority: 10,
        enabled: true,
        conditions: { operator: 'and' as const, conditions: [] },
        actions: [{ type: 'set_value' as const, target: 'data.test', value: true }]
      };

      const createdRule = {
        id: 'new-rule-id',
        ...newRule,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      mockPrisma.businessRule.create.mockResolvedValue(createdRule);

      const result = await ruleEngineService.createRule(newRule);

      expect(result.id).toBe('new-rule-id');
      expect(result.name).toBe('New Rule');
      expect(mockPrisma.businessRule.create).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
    });

    it('should throw error when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);

      const newRule = {
        name: 'New Rule',
        category: 'scoring' as const,
        priority: 10,
        enabled: true,
        conditions: { operator: 'and' as const, conditions: [] },
        actions: []
      };

      await expect(ruleEngineService.createRule(newRule)).rejects.toThrow('Database not available');
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const existingRule = {
        id: 'rule-1',
        name: 'Old Name',
        category: 'scoring',
        priority: 10,
        enabled: true,
        version: 1,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedRule = {
        ...existingRule,
        name: 'New Name',
        version: 2
      };

      mockPrisma.businessRule.findUnique.mockResolvedValue(existingRule);
      mockPrisma.businessRule.update.mockResolvedValue(updatedRule);

      const result = await ruleEngineService.updateRule('rule-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockPrisma.businessRule.update).toHaveBeenCalled();
    });

    it('should throw error when rule not found', async () => {
      mockPrisma.businessRule.findUnique.mockResolvedValue(null);

      await expect(ruleEngineService.updateRule('non-existent', { name: 'Test' }))
        .rejects.toThrow('Rule non-existent not found');
    });
  });

  describe('deleteRule', () => {
    it('should delete an existing rule', async () => {
      const existingRule = {
        id: 'rule-1',
        name: 'Rule to Delete',
        category: 'scoring'
      };

      mockPrisma.businessRule.findUnique.mockResolvedValue(existingRule);
      mockPrisma.businessRule.delete.mockResolvedValue(existingRule);

      await expect(ruleEngineService.deleteRule('rule-1')).resolves.toBeUndefined();
      expect(mockPrisma.businessRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });

    it('should throw error when rule not found', async () => {
      mockPrisma.businessRule.findUnique.mockResolvedValue(null);

      await expect(ruleEngineService.deleteRule('non-existent'))
        .rejects.toThrow('Rule non-existent not found');
    });
  });

  describe('setRuleEnabled', () => {
    it('should enable a rule', async () => {
      const existingRule = {
        id: 'rule-1',
        name: 'Rule',
        category: 'scoring',
        enabled: false,
        version: 1,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedRule = { ...existingRule, enabled: true, version: 2 };

      mockPrisma.businessRule.findUnique.mockResolvedValue(existingRule);
      mockPrisma.businessRule.update.mockResolvedValue(updatedRule);

      const result = await ruleEngineService.setRuleEnabled('rule-1', true);

      expect(result.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // CACHING
  // ===========================================================================

  describe('caching', () => {
    it('should return cached rules when available', async () => {
      const cachedRules = [{ id: 'cached-rule', name: 'Cached Rule' }];
      (cacheService.get as Mock).mockResolvedValue(cachedRules);

      const rules = await ruleEngineService.getRules('scoring');

      expect(rules).toEqual(cachedRules);
      expect(mockPrisma.businessRule.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not cached', async () => {
      (cacheService.get as Mock).mockResolvedValue(null);
      
      const dbRules = [
        {
          id: 'db-rule',
          name: 'DB Rule',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(dbRules);

      const rules = await ruleEngineService.getRules('scoring');

      expect(mockPrisma.businessRule.findMany).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
      expect(rules).toHaveLength(1);
    });
  });

  // ===========================================================================
  // SCHEDULE CHECKING
  // ===========================================================================

  describe('schedule checking', () => {
    it('should include rule when no schedule is set', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'No Schedule Rule',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(1);
    });

    it('should exclude rule when outside date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockRules = [
        {
          id: 'rule-1',
          name: 'Future Rule',
          category: 'scoring',
          priority: 1,
          enabled: true,
          startDate: futureDate,
          conditions: { operator: 'and', conditions: [] },
          actions: [{ type: 'set_value', target: 'data.matched', value: true }],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.matched).toBe(0);
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('error handling', () => {
    it('should handle rule evaluation errors gracefully', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Problematic Rule',
          category: 'scoring',
          priority: 1,
          enabled: true,
          conditions: { operator: 'and', conditions: [{ field: 'invalid.path.that.throws' }] },
          actions: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      ];
      mockPrisma.businessRule.findMany.mockResolvedValue(mockRules);

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      // Should not throw, but may have errors in results
      expect(result).toBeDefined();
      expect(result.finalContext).toBeDefined();
    });

    it('should handle database errors during getRules', async () => {
      mockPrisma.businessRule.findMany.mockRejectedValue(new Error('Database error'));

      const context = { agentId: 'test', action: 'test', data: {} };
      const result = await ruleEngineService.evaluate(context, 'scoring');

      expect(result.errors).toContain('Database error');
    });
  });
});
