/**
 * Feature Flag Service Tests
 * 
 * Tests for feature flag evaluation, targeting rules, and A/B testing.
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
    error: vi.fn(),
    init: vi.fn()
  }
}));

describe('FeatureFlagService', () => {
  let featureFlagService: any;
  let mockPrisma: any;
  let cacheService: any;
  let configService: any;

  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock prisma
    mockPrisma = {
      featureFlag: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
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
    const module = await import('../../src/services/featureFlags/featureFlagService');
    featureFlagService = module.featureFlagService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // isEnabled - Basic functionality
  // ===========================================================================

  describe('isEnabled', () => {
    it('should return false when flag does not exist', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await featureFlagService.isEnabled('nonexistent');

      expect(result).toBe(false);
    });

    it('should return true when flag is enabled', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'my_feature',
        name: 'My Feature',
        enabled: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.isEnabled('my_feature');

      expect(result).toBe(true);
    });

    it('should return false when flag is disabled', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'my_feature',
        name: 'My Feature',
        enabled: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.isEnabled('my_feature');

      expect(result).toBe(false);
    });

    it('should return false when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);

      const result = await featureFlagService.isEnabled('any_flag');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // evaluate - Detailed evaluation
  // ===========================================================================

  describe('evaluate', () => {
    it('should return FLAG_NOT_FOUND reason when flag does not exist', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await featureFlagService.evaluate('nonexistent');

      expect(result.flagKey).toBe('nonexistent');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('FLAG_NOT_FOUND');
    });

    it('should return FLAG_DISABLED reason when flag is disabled', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'disabled_flag',
        name: 'Disabled Flag',
        enabled: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('disabled_flag');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('FLAG_DISABLED');
    });

    it('should return DEFAULT_VARIANT reason when flag is enabled without targeting', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'simple_flag',
        name: 'Simple Flag',
        enabled: true,
        defaultVariant: 'control',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('simple_flag');

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('DEFAULT_VARIANT');
      expect(result.variant).toBe('control');
    });

    it('should handle evaluation errors gracefully', async () => {
      mockPrisma.featureFlag.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await featureFlagService.evaluate('any_flag');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('ERROR');
    });
  });

  // ===========================================================================
  // Scheduling
  // ===========================================================================

  describe('scheduling', () => {
    it('should return SCHEDULED_OFF when flag has future start date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'future_flag',
        name: 'Future Flag',
        enabled: true,
        startDate: futureDate,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('future_flag');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('SCHEDULED_OFF');
    });

    it('should return SCHEDULED_OFF when flag has past end date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'expired_flag',
        name: 'Expired Flag',
        enabled: true,
        endDate: pastDate,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('expired_flag');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('SCHEDULED_OFF');
    });

    it('should return enabled when flag is within schedule', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'active_flag',
        name: 'Active Flag',
        enabled: true,
        startDate: pastDate,
        endDate: futureDate,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('active_flag');

      expect(result.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // Targeting Rules
  // ===========================================================================

  describe('targeting rules', () => {
    it('should match targeting rule with eq operator', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'targeted_flag',
        name: 'Targeted Flag',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'userId', operator: 'eq', value: 'user-123' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('targeted_flag', { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('TARGETING_MATCH');
    });

    it('should not match targeting rule when condition fails', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'targeted_flag',
        name: 'Targeted Flag',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'userId', operator: 'eq', value: 'user-123' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('targeted_flag', { userId: 'user-456' });

      // Falls through to default variant
      expect(result.reason).toBe('DEFAULT_VARIANT');
    });

    it('should match targeting rule with ends_with operator for email', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'internal_feature',
        name: 'Internal Feature',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'email', operator: 'ends_with', value: '@company.com' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('internal_feature', { 
        email: 'user@company.com' 
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('TARGETING_MATCH');
    });

    it('should match targeting rule with in operator', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'beta_feature',
        name: 'Beta Feature',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'plan', operator: 'in', value: ['premium', 'enterprise'] }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('beta_feature', { 
        attributes: { plan: 'premium' }
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('TARGETING_MATCH');
    });

    it('should match targeting rule with contains operator', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'admin_feature',
        name: 'Admin Feature',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'email', operator: 'contains', value: 'admin' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('admin_feature', { 
        email: 'admin@example.com' 
      });

      expect(result.enabled).toBe(true);
    });

    it('should match targeting rule with matches (regex) operator', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'regex_feature',
        name: 'Regex Feature',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'email', operator: 'matches', value: '^.*@(company|corp)\\.com$' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('regex_feature', { 
        email: 'user@company.com' 
      });

      expect(result.enabled).toBe(true);
    });

    it('should evaluate rules in priority order', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'priority_flag',
        name: 'Priority Flag',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-2',
            priority: 2,
            conditions: [],
            percentage: 100,
            variant: 'default'
          },
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'userId', operator: 'eq', value: 'user-123' }
            ],
            percentage: 100,
            variant: 'special'
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('priority_flag', { userId: 'user-123' });

      expect(result.variant).toBe('special');
    });

    it('should require all conditions to match (AND logic)', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'multi_condition',
        name: 'Multi Condition',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [
              { attribute: 'plan', operator: 'eq', value: 'premium' },
              { attribute: 'country', operator: 'eq', value: 'US' }
            ],
            percentage: 100
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Both conditions match
      const result1 = await featureFlagService.evaluate('multi_condition', { 
        attributes: { plan: 'premium', country: 'US' }
      });
      expect(result1.reason).toBe('TARGETING_MATCH');

      // Only one condition matches
      const result2 = await featureFlagService.evaluate('multi_condition', { 
        attributes: { plan: 'premium', country: 'UK' }
      });
      expect(result2.reason).toBe('DEFAULT_VARIANT');
    });
  });

  // ===========================================================================
  // Percentage Rollout
  // ===========================================================================

  describe('percentage rollout', () => {
    it('should consistently assign users based on hash', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'rollout_flag',
        name: 'Rollout Flag',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [],
            percentage: 50
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Same user should always get the same result
      const result1 = await featureFlagService.evaluate('rollout_flag', { userId: 'stable-user' });
      const result2 = await featureFlagService.evaluate('rollout_flag', { userId: 'stable-user' });

      expect(result1.enabled).toBe(result2.enabled);
    });

    it('should fall through to next rule if not in rollout percentage', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'rollout_flag',
        name: 'Rollout Flag',
        enabled: true,
        targetingRules: [
          {
            id: 'rule-1',
            priority: 1,
            conditions: [],
            percentage: 0, // 0% rollout = no one gets it
            variant: 'treatment'
          }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('rollout_flag', { userId: 'any-user' });

      // Should fall through to default
      expect(result.reason).toBe('DEFAULT_VARIANT');
    });
  });

  // ===========================================================================
  // Variant Selection (A/B Testing)
  // ===========================================================================

  describe('variant selection', () => {
    it('should select variant based on user ID hash', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'ab_test',
        name: 'A/B Test',
        enabled: true,
        variants: [
          { key: 'control', name: 'Control', weight: 50 },
          { key: 'treatment', name: 'Treatment', weight: 50 }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('ab_test', { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(['control', 'treatment']).toContain(result.variant);
    });

    it('should consistently assign same variant to same user', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'ab_test',
        name: 'A/B Test',
        enabled: true,
        variants: [
          { key: 'control', name: 'Control', weight: 50 },
          { key: 'treatment', name: 'Treatment', weight: 50 }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result1 = await featureFlagService.evaluate('ab_test', { userId: 'user-stable' });
      const result2 = await featureFlagService.evaluate('ab_test', { userId: 'user-stable' });

      expect(result1.variant).toBe(result2.variant);
    });

    it('should include payload from variant', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'ab_test_payload',
        name: 'A/B Test with Payload',
        enabled: true,
        variants: [
          { key: 'control', name: 'Control', weight: 100, payload: { buttonColor: 'blue' } }
        ],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.evaluate('ab_test_payload', { userId: 'user-123' });

      expect(result.payload).toEqual({ buttonColor: 'blue' });
    });
  });

  // ===========================================================================
  // evaluateBatch
  // ===========================================================================

  describe('evaluateBatch', () => {
    it('should evaluate multiple flags at once', async () => {
      mockPrisma.featureFlag.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.key === 'flag_a') {
          return { id: '1', key: 'flag_a', enabled: true, tags: [], createdAt: new Date(), updatedAt: new Date() };
        }
        if (where.key === 'flag_b') {
          return { id: '2', key: 'flag_b', enabled: false, tags: [], createdAt: new Date(), updatedAt: new Date() };
        }
        return null;
      });

      const results = await featureFlagService.evaluateBatch(['flag_a', 'flag_b', 'flag_c']);

      expect(results.get('flag_a')?.enabled).toBe(true);
      expect(results.get('flag_b')?.enabled).toBe(false);
      expect(results.get('flag_c')?.enabled).toBe(false);
      expect(results.get('flag_c')?.reason).toBe('FLAG_NOT_FOUND');
    });
  });

  // ===========================================================================
  // getVariant
  // ===========================================================================

  describe('getVariant', () => {
    it('should return variant from evaluation', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'variant_test',
        name: 'Variant Test',
        enabled: true,
        defaultVariant: 'default_variant',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.getVariant('variant_test');

      expect(result).toBe('default_variant');
    });

    it('should return undefined when flag is disabled', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag-1',
        key: 'disabled_flag',
        name: 'Disabled Flag',
        enabled: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.getVariant('disabled_flag');

      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('getAllFlags', () => {
    it('should return all flags', async () => {
      mockPrisma.featureFlag.findMany.mockResolvedValue([
        { id: '1', key: 'flag_a', name: 'Flag A', enabled: true, tags: [], createdAt: new Date(), updatedAt: new Date() },
        { id: '2', key: 'flag_b', name: 'Flag B', enabled: false, tags: [], createdAt: new Date(), updatedAt: new Date() }
      ]);

      const flags = await featureFlagService.getAllFlags();

      expect(flags).toHaveLength(2);
      expect(flags[0].key).toBe('flag_a');
    });

    it('should return empty array when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);

      const flags = await featureFlagService.getAllFlags();

      expect(flags).toEqual([]);
    });
  });

  describe('createFlag', () => {
    it('should create a new flag', async () => {
      const newFlag = {
        key: 'new_feature',
        name: 'New Feature',
        description: 'A new feature',
        enabled: false
      };

      mockPrisma.featureFlag.create.mockResolvedValue({
        id: 'new-id',
        ...newFlag,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.createFlag(newFlag);

      expect(result.id).toBe('new-id');
      expect(result.key).toBe('new_feature');
      expect(cacheService.delete).toHaveBeenCalled();
    });

    it('should throw error when database is not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as Mock).mockReturnValue(null);

      await expect(featureFlagService.createFlag({ key: 'test', name: 'Test', enabled: false }))
        .rejects.toThrow('Database not available');
    });
  });

  describe('updateFlag', () => {
    it('should update an existing flag', async () => {
      mockPrisma.featureFlag.update.mockResolvedValue({
        id: '1',
        key: 'my_flag',
        name: 'Updated Name',
        enabled: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.updateFlag('my_flag', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(cacheService.delete).toHaveBeenCalled();
    });
  });

  describe('deleteFlag', () => {
    it('should delete a flag', async () => {
      mockPrisma.featureFlag.delete.mockResolvedValue({});

      await expect(featureFlagService.deleteFlag('my_flag')).resolves.toBeUndefined();
      expect(mockPrisma.featureFlag.delete).toHaveBeenCalledWith({ where: { key: 'my_flag' } });
      expect(cacheService.delete).toHaveBeenCalled();
    });
  });

  describe('toggleFlag', () => {
    it('should toggle flag from enabled to disabled', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: '1',
        key: 'toggle_flag',
        enabled: true
      });
      mockPrisma.featureFlag.update.mockResolvedValue({
        id: '1',
        key: 'toggle_flag',
        name: 'Toggle Flag',
        enabled: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await featureFlagService.toggleFlag('toggle_flag');

      expect(result.enabled).toBe(false);
    });

    it('should throw error when flag not found', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(featureFlagService.toggleFlag('nonexistent'))
        .rejects.toThrow('Flag nonexistent not found');
    });
  });

  // ===========================================================================
  // Caching
  // ===========================================================================

  describe('caching', () => {
    it('should use cached flag when available', async () => {
      const cachedFlag = {
        id: '1',
        key: 'cached_flag',
        name: 'Cached Flag',
        enabled: true
      };
      (cacheService.get as Mock).mockResolvedValue(cachedFlag);

      const result = await featureFlagService.evaluate('cached_flag');

      expect(result.enabled).toBe(true);
      expect(result.metadata?.cached).toBe(true);
      expect(mockPrisma.featureFlag.findUnique).not.toHaveBeenCalled();
    });

    it('should cache flag after fetching from database', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: '1',
        key: 'uncached_flag',
        name: 'Uncached Flag',
        enabled: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await featureFlagService.evaluate('uncached_flag');

      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Initialize
  // ===========================================================================

  describe('initialize', () => {
    it('should initialize service without Flipt by default', async () => {
      await featureFlagService.initialize();

      // Should complete without error
      expect(true).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      await featureFlagService.initialize();
      await featureFlagService.initialize();

      // Should complete without error (idempotent)
      expect(true).toBe(true);
    });
  });
});
