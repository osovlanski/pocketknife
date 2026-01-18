/**
 * Feature Flag Service
 * 
 * Manages feature flags with support for:
 * - Local database storage
 * - In-memory caching
 * - Optional Flipt integration for advanced scenarios
 * - Percentage rollouts
 * - User targeting
 * - A/B testing variants
 * 
 * NOTE: Requires database migration for enhanced FeatureFlag schema.
 * Run: npx prisma migrate dev --name add_feature_flags_enhanced
 */

import { getPrisma } from '../core/databaseService';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import crypto from 'crypto';
import {
  FeatureFlag,
  FeatureVariant,
  TargetingRule,
  TargetingCondition,
  TargetingOperator,
  FlagContext,
  FlagEvaluationResult,
  EvaluationReason,
  FliptConfig
} from './types';

// =============================================================================
// CACHE KEYS
// =============================================================================

const CACHE_KEYS = {
  flag: (key: string) => `ff:${key}`,
  allFlags: 'ff:all',
  flagsList: 'ff:list'
};

// =============================================================================
// FEATURE FLAG SERVICE
// =============================================================================

class FeatureFlagService {
  private fliptClient: any = null;
  private initialized = false;

  /**
   * Initialize the service (connect to Flipt if configured)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const fliptEnabled = configService.get('feature.featureFlags.flipt.enabled', false);
    if (fliptEnabled) {
      await this.initializeFliptClient();
    }

    this.initialized = true;
    logger.init('Feature flag service initialized');
  }

  /**
   * Initialize Flipt client if configured
   */
  private async initializeFliptClient(): Promise<void> {
    const fliptUrl = configService.get('feature.featureFlags.flipt.url', 'http://localhost:8080');
    
    try {
      // Dynamic import for optional Flipt SDK
      // Note: You would need to install @flipt-io/flipt if using Flipt
      // For now, we'll use HTTP calls directly
      logger.info('Flipt integration configured', { url: fliptUrl });
      this.fliptClient = { url: fliptUrl };
    } catch (error: any) {
      logger.warn('Failed to initialize Flipt client', { error: error.message });
    }
  }

  // ===========================================================================
  // FLAG EVALUATION
  // ===========================================================================

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string, context?: FlagContext): Promise<boolean> {
    const result = await this.evaluate(key, context);
    return result.enabled;
  }

  /**
   * Get the variant for a feature flag
   */
  async getVariant(key: string, context?: FlagContext): Promise<string | undefined> {
    const result = await this.evaluate(key, context);
    return result.variant;
  }

  /**
   * Full flag evaluation with detailed result
   */
  async evaluate(key: string, context?: FlagContext): Promise<FlagEvaluationResult> {
    try {
      // Try Flipt first if enabled
      if (this.fliptClient) {
        const fliptResult = await this.evaluateWithFlipt(key, context);
        if (fliptResult) return fliptResult;
      }

      // Fall back to local database
      return await this.evaluateFromDatabase(key, context);

    } catch (error: any) {
      logger.error('Feature flag evaluation failed', { key, error: error.message });
      return {
        flagKey: key,
        enabled: false,
        reason: 'ERROR',
        metadata: { cached: false }
      };
    }
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateBatch(
    keys: string[], 
    context?: FlagContext
  ): Promise<Map<string, FlagEvaluationResult>> {
    const results = new Map<string, FlagEvaluationResult>();
    
    // Parallel evaluation
    const evaluations = await Promise.allSettled(
      keys.map(key => this.evaluate(key, context))
    );

    keys.forEach((key, index) => {
      const result = evaluations[index];
      if (result.status === 'fulfilled') {
        results.set(key, result.value);
      } else {
        results.set(key, {
          flagKey: key,
          enabled: false,
          reason: 'ERROR'
        });
      }
    });

    return results;
  }

  // ===========================================================================
  // DATABASE EVALUATION
  // ===========================================================================

  private async evaluateFromDatabase(
    key: string, 
    context?: FlagContext
  ): Promise<FlagEvaluationResult> {
    // Check cache first
    const cacheKey = CACHE_KEYS.flag(key);
    const cacheTtl = configService.get('feature.featureFlags.cacheSeconds', 60);
    const cached = await cacheService.get<FeatureFlag>(cacheKey);

    let flag: FeatureFlag | null = cached || null;

    if (!flag) {
      // Load from database
      const prisma = getPrisma();
      if (!prisma) {
        return {
          flagKey: key,
          enabled: false,
          reason: 'ERROR',
          metadata: { cached: false }
        };
      }

      const dbFlag = await (prisma as any).featureFlag.findUnique({
        where: { key }
      });

      if (!dbFlag) {
        return {
          flagKey: key,
          enabled: false,
          reason: 'FLAG_NOT_FOUND',
          metadata: { cached: false }
        };
      }

      flag = this.dbFlagToFlag(dbFlag);
      await cacheService.set(cacheKey, flag, { ttl: cacheTtl });
    }

    return this.evaluateFlag(flag, context, !!cached);
  }

  private evaluateFlag(
    flag: FeatureFlag, 
    context?: FlagContext,
    cached = false
  ): FlagEvaluationResult {
    // Check if flag is enabled
    if (!flag.enabled) {
      return {
        flagKey: flag.key,
        enabled: false,
        reason: 'FLAG_DISABLED',
        metadata: { cached }
      };
    }

    // Check schedule
    if (flag.schedule) {
      const now = new Date();
      if (flag.schedule.startDate && now < flag.schedule.startDate) {
        return {
          flagKey: flag.key,
          enabled: false,
          reason: 'SCHEDULED_OFF',
          metadata: { cached }
        };
      }
      if (flag.schedule.endDate && now > flag.schedule.endDate) {
        return {
          flagKey: flag.key,
          enabled: false,
          reason: 'SCHEDULED_OFF',
          metadata: { cached }
        };
      }
    }

    // Evaluate targeting rules
    if (flag.targetingRules && flag.targetingRules.length > 0 && context) {
      const rules = [...flag.targetingRules].sort((a, b) => a.priority - b.priority);
      
      for (const rule of rules) {
        if (this.evaluateTargetingRule(rule, context)) {
          // Check percentage rollout
          if (rule.percentage !== undefined && rule.percentage < 100) {
            const inRollout = this.isInPercentageRollout(
              context.userId || context.email || 'anonymous',
              flag.key,
              rule.percentage
            );
            if (!inRollout) continue;
          }

          const variant = rule.variant || flag.defaultVariant;
          const variantData = flag.variants?.find(v => v.key === variant);

          return {
            flagKey: flag.key,
            enabled: true,
            variant,
            payload: variantData?.payload,
            reason: 'TARGETING_MATCH',
            metadata: {
              ruleId: rule.id,
              percentage: rule.percentage,
              cached
            }
          };
        }
      }
    }

    // Default variant selection
    if (flag.variants && flag.variants.length > 0 && context?.userId) {
      const variant = this.selectVariant(flag.variants, context.userId, flag.key);
      const variantData = flag.variants.find(v => v.key === variant);
      
      return {
        flagKey: flag.key,
        enabled: true,
        variant,
        payload: variantData?.payload,
        reason: 'DEFAULT_VARIANT',
        metadata: { cached }
      };
    }

    // Simple enabled flag
    return {
      flagKey: flag.key,
      enabled: true,
      variant: flag.defaultVariant,
      reason: 'DEFAULT_VARIANT',
      metadata: { cached }
    };
  }

  private evaluateTargetingRule(rule: TargetingRule, context: FlagContext): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true; // No conditions = always match
    }

    // All conditions must match (AND logic)
    return rule.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  private evaluateCondition(condition: TargetingCondition, context: FlagContext): boolean {
    const { attribute, operator, value } = condition;
    
    // Get actual value from context
    let actualValue: unknown;
    if (attribute === 'userId') {
      actualValue = context.userId;
    } else if (attribute === 'email') {
      actualValue = context.email;
    } else {
      actualValue = context.attributes?.[attribute];
    }

    return this.compare(actualValue, operator, value);
  }

  private compare(actual: unknown, operator: TargetingOperator, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'neq':
        return actual !== expected;
      case 'contains':
        return typeof actual === 'string' && 
               typeof expected === 'string' && 
               actual.includes(expected);
      case 'starts_with':
        return typeof actual === 'string' && 
               typeof expected === 'string' && 
               actual.startsWith(expected);
      case 'ends_with':
        return typeof actual === 'string' && 
               typeof expected === 'string' && 
               actual.endsWith(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'matches':
        if (typeof actual !== 'string' || typeof expected !== 'string') return false;
        try {
          return new RegExp(expected).test(actual);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  // ===========================================================================
  // VARIANT SELECTION & PERCENTAGE ROLLOUT
  // ===========================================================================

  private selectVariant(variants: FeatureVariant[], userId: string, flagKey: string): string {
    // Consistent hashing for stable variant assignment
    const hash = this.hashString(`${userId}:${flagKey}`);
    const bucket = hash % 100;

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        return variant.key;
      }
    }

    // Fallback to first variant
    return variants[0]?.key || 'control';
  }

  private isInPercentageRollout(userId: string, flagKey: string, percentage: number): boolean {
    const hash = this.hashString(`${userId}:${flagKey}:rollout`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  private hashString(str: string): number {
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  // ===========================================================================
  // FLIPT INTEGRATION
  // ===========================================================================

  private async evaluateWithFlipt(
    key: string, 
    context?: FlagContext
  ): Promise<FlagEvaluationResult | null> {
    if (!this.fliptClient) return null;

    try {
      const response = await fetch(
        `${this.fliptClient.url}/api/v1/flags/${key}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: context?.userId || 'anonymous',
            context: context?.attributes || {}
          })
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Flag not found in Flipt, try local
        }
        throw new Error(`Flipt API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        flagKey: key,
        enabled: result.match || false,
        variant: result.variantKey,
        payload: result.variantAttachment ? JSON.parse(result.variantAttachment) : undefined,
        reason: result.match ? 'TARGETING_MATCH' : 'FLAG_DISABLED',
        metadata: {
          ruleId: result.segmentKey,
          cached: false
        }
      };
    } catch (error: any) {
      logger.warn('Flipt evaluation failed, falling back to local', { 
        key, 
        error: error.message 
      });
      return null;
    }
  }

  // ===========================================================================
  // FLAG MANAGEMENT
  // ===========================================================================

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const prisma = getPrisma();
    if (!prisma) return [];

    const flags = await (prisma as any).featureFlag.findMany({
      orderBy: { key: 'asc' }
    });

    return flags.map((f: any) => this.dbFlagToFlag(f));
  }

  /**
   * Create a new feature flag
   */
  async createFlag(flag: Omit<FeatureFlag, 'id'>): Promise<FeatureFlag> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const created = await (prisma as any).featureFlag.create({
      data: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        targetingRules: flag.targetingRules as any,
        variants: flag.variants as any,
        defaultVariant: flag.defaultVariant,
        startDate: flag.schedule?.startDate,
        endDate: flag.schedule?.endDate,
        tags: flag.metadata?.tags || [],
        createdBy: flag.metadata?.createdBy
      }
    });

    // Invalidate cache
    await this.invalidateCache(flag.key);

    return this.dbFlagToFlag(created);
  }

  /**
   * Update a feature flag
   */
  async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const updated = await (prisma as any).featureFlag.update({
      where: { key },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.targetingRules && { targetingRules: updates.targetingRules as any }),
        ...(updates.variants && { variants: updates.variants as any }),
        ...(updates.defaultVariant !== undefined && { defaultVariant: updates.defaultVariant }),
        ...(updates.schedule?.startDate !== undefined && { startDate: updates.schedule.startDate }),
        ...(updates.schedule?.endDate !== undefined && { endDate: updates.schedule.endDate }),
        ...(updates.metadata?.tags && { tags: updates.metadata.tags })
      }
    });

    // Invalidate cache
    await this.invalidateCache(key);

    return this.dbFlagToFlag(updated);
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    await (prisma as any).featureFlag.delete({ where: { key } });

    // Invalidate cache
    await this.invalidateCache(key);
  }

  /**
   * Toggle a feature flag on/off
   */
  async toggleFlag(key: string): Promise<FeatureFlag> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const current = await (prisma as any).featureFlag.findUnique({ where: { key } });
    if (!current) throw new Error(`Flag ${key} not found`);

    return this.updateFlag(key, { enabled: !current.enabled });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private dbFlagToFlag(dbFlag: any): FeatureFlag {
    return {
      id: dbFlag.id,
      key: dbFlag.key,
      name: dbFlag.name,
      description: dbFlag.description || undefined,
      enabled: dbFlag.enabled,
      targetingRules: dbFlag.targetingRules as TargetingRule[] || undefined,
      variants: dbFlag.variants as FeatureVariant[] || undefined,
      defaultVariant: dbFlag.defaultVariant || undefined,
      schedule: {
        startDate: dbFlag.startDate || undefined,
        endDate: dbFlag.endDate || undefined
      },
      metadata: {
        createdBy: dbFlag.createdBy || undefined,
        createdAt: dbFlag.createdAt,
        updatedAt: dbFlag.updatedAt,
        tags: dbFlag.tags
      }
    };
  }

  private async invalidateCache(key?: string): Promise<void> {
    if (key) {
      await cacheService.delete(CACHE_KEYS.flag(key));
    }
    await cacheService.delete(CACHE_KEYS.allFlags);
    await cacheService.delete(CACHE_KEYS.flagsList);
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
export default featureFlagService;

