/**
 * Rule Engine Service
 * 
 * Evaluates business rules at runtime and applies actions based on conditions.
 * Rules are loaded from the database and cached for performance.
 * 
 * NOTE: Requires database migration to create BusinessRule, RuleSet, and RuleAuditLog tables.
 * Run: npx prisma migrate dev --name add_rule_engine
 */

import { getPrisma } from '../core/databaseService';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import {
  Rule,
  RuleSet,
  RuleCategory,
  RuleCondition,
  RuleConditionGroup,
  RuleAction,
  RuleContext,
  RuleEvaluationResult,
  RuleEngineResult,
  RuleOperator,
  RuleAuditLog
} from './types';

// =============================================================================
// CACHE KEYS
// =============================================================================

const CACHE_KEYS = {
  rules: (category: RuleCategory) => `rules:${category}`,
  ruleSet: (id: string) => `ruleset:${id}`,
  allRules: 'rules:all'
};

// =============================================================================
// RULE ENGINE SERVICE
// =============================================================================

class RuleEngineService {
  private rulesCache: Map<string, Rule[]> = new Map();
  private lastCacheRefresh: number = 0;

  /**
   * Evaluate rules for a given context
   */
  async evaluate(
    context: RuleContext,
    category?: RuleCategory,
    ruleSetId?: string
  ): Promise<RuleEngineResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const results: RuleEvaluationResult[] = [];
    let modifiedContext = { ...context };

    try {
      // Get rules to evaluate
      const rules = await this.getRules(category, ruleSetId);
      const enabledRules = rules.filter(r => r.enabled && this.isRuleInSchedule(r));
      
      // Sort by priority (lower = higher priority)
      enabledRules.sort((a, b) => a.priority - b.priority);

      const maxRules = configService.get('ruleEngine.evaluation.maxRulesPerRequest', 100);
      const rulesToEvaluate = enabledRules.slice(0, maxRules);

      // Evaluate each rule
      for (const rule of rulesToEvaluate) {
        const ruleStart = Date.now();
        
        try {
          const matched = this.evaluateConditions(rule.conditions, modifiedContext);
          const executedActions: RuleAction[] = [];

          if (matched) {
            // Execute actions
            for (const action of rule.actions) {
              modifiedContext = this.executeAction(action, modifiedContext);
              executedActions.push(action);
              
              // Check for abort action
              if (action.type === 'abort') {
                break;
              }
            }
          }

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matched,
            executedActions,
            modifications: matched ? this.getModifications(context, modifiedContext) : undefined,
            duration: Date.now() - ruleStart
          });

          // Audit logging if enabled
          if (configService.get('ruleEngine.audit.enabled', true)) {
            await this.logEvaluation(rule, matched, context, executedActions);
          }

        } catch (error: any) {
          errors.push(`Rule ${rule.id}: ${error.message}`);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matched: false,
            executedActions: [],
            duration: Date.now() - ruleStart,
            error: error.message
          });
        }
      }

      return {
        evaluated: rulesToEvaluate.length,
        matched: results.filter(r => r.matched).length,
        results,
        finalContext: modifiedContext,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error: any) {
      logger.error('Rule engine evaluation failed', { error: error.message });
      return {
        evaluated: 0,
        matched: 0,
        results: [],
        finalContext: context,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get rules from cache or database
   */
  async getRules(category?: RuleCategory, ruleSetId?: string): Promise<Rule[]> {
    const cacheKey = ruleSetId 
      ? CACHE_KEYS.ruleSet(ruleSetId)
      : category 
        ? CACHE_KEYS.rules(category)
        : CACHE_KEYS.allRules;

    // Check cache
    const cacheTtl = configService.get('ruleEngine.cache.ttlSeconds', 300);
    const cached = await cacheService.get<Rule[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load from database
    const prisma = getPrisma();
    if (!prisma) {
      logger.warn('Database not available for rule engine');
      return [];
    }

    const where: any = {};
    if (category) where.category = category;
    if (ruleSetId) where.ruleSetId = ruleSetId;

    // Note: businessRule table requires migration. Cast to any to handle pre-migration state.
    const dbRules = await (prisma as any).businessRule.findMany({
      where,
      orderBy: { priority: 'asc' }
    });

    const rules: Rule[] = dbRules.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      category: r.category as RuleCategory,
      priority: r.priority,
      enabled: r.enabled,
      conditions: r.conditions as unknown as RuleConditionGroup,
      actions: r.actions as unknown as RuleAction[],
      metadata: {
        createdBy: r.createdBy || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        version: r.version,
        tags: r.tags
      },
      schedule: {
        startDate: r.startDate || undefined,
        endDate: r.endDate || undefined,
        daysOfWeek: r.daysOfWeek,
        timezone: r.timezone || undefined
      }
    }));

    // Cache the results
    await cacheService.set(cacheKey, rules, { ttl: cacheTtl });

    return rules;
  }

  /**
   * Create a new rule
   */
  async createRule(rule: Omit<Rule, 'id'>): Promise<Rule> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const created = await (prisma as any).businessRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        category: rule.category,
        priority: rule.priority,
        enabled: rule.enabled,
        conditions: rule.conditions as any,
        actions: rule.actions as any,
        startDate: rule.schedule?.startDate,
        endDate: rule.schedule?.endDate,
        daysOfWeek: rule.schedule?.daysOfWeek || [],
        timezone: rule.schedule?.timezone,
        tags: rule.metadata?.tags || [],
        createdBy: rule.metadata?.createdBy
      }
    });

    // Invalidate cache
    await this.invalidateCache(rule.category);

    // Audit log
    await this.logMutation('create', created.id, null, created);

    return this.dbRuleToRule(created);
  }

  /**
   * Update an existing rule
   */
  async updateRule(id: string, updates: Partial<Rule>): Promise<Rule> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const existing = await (prisma as any).businessRule.findUnique({ where: { id } });
    if (!existing) throw new Error(`Rule ${id} not found`);

    const updated = await (prisma as any).businessRule.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category && { category: updates.category }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.conditions && { conditions: updates.conditions as any }),
        ...(updates.actions && { actions: updates.actions as any }),
        ...(updates.schedule?.startDate !== undefined && { startDate: updates.schedule.startDate }),
        ...(updates.schedule?.endDate !== undefined && { endDate: updates.schedule.endDate }),
        ...(updates.schedule?.daysOfWeek && { daysOfWeek: updates.schedule.daysOfWeek }),
        ...(updates.schedule?.timezone !== undefined && { timezone: updates.schedule.timezone }),
        ...(updates.metadata?.tags && { tags: updates.metadata.tags }),
        version: existing.version + 1
      }
    });

    // Invalidate cache
    await this.invalidateCache(existing.category as RuleCategory);
    if (updates.category && updates.category !== existing.category) {
      await this.invalidateCache(updates.category);
    }

    // Audit log
    await this.logMutation('update', id, existing, updated);

    return this.dbRuleToRule(updated);
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const existing = await (prisma as any).businessRule.findUnique({ where: { id } });
    if (!existing) throw new Error(`Rule ${id} not found`);

    await (prisma as any).businessRule.delete({ where: { id } });

    // Invalidate cache
    await this.invalidateCache(existing.category as RuleCategory);

    // Audit log
    await this.logMutation('delete', id, existing, null);
  }

  /**
   * Enable or disable a rule
   */
  async setRuleEnabled(id: string, enabled: boolean): Promise<Rule> {
    return this.updateRule(id, { enabled });
  }

  // ===========================================================================
  // CONDITION EVALUATION
  // ===========================================================================

  private evaluateConditions(group: RuleConditionGroup, context: RuleContext): boolean {
    const { operator, conditions } = group;

    for (const condition of conditions) {
      const isGroup = 'operator' in condition && 'conditions' in condition;
      const result = isGroup
        ? this.evaluateConditions(condition as RuleConditionGroup, context)
        : this.evaluateCondition(condition as RuleCondition, context);

      if (operator === 'or' && result) return true;
      if (operator === 'and' && !result) return false;
    }

    return operator === 'and';
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const { field, operator, value, caseSensitive = false } = condition;
    const actualValue = this.getFieldValue(field, context);

    return this.compare(actualValue, operator, value, caseSensitive);
  }

  private getFieldValue(field: string, context: RuleContext): unknown {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  private compare(
    actual: unknown, 
    operator: RuleOperator, 
    expected: unknown,
    caseSensitive: boolean
  ): boolean {
    // Normalize strings if case-insensitive
    const normalize = (v: unknown) => {
      if (!caseSensitive && typeof v === 'string') {
        return v.toLowerCase();
      }
      return v;
    };

    const a = normalize(actual);
    const e = normalize(expected);

    switch (operator) {
      case 'eq':
        return a === e;
      case 'neq':
        return a !== e;
      case 'gt':
        return typeof a === 'number' && typeof e === 'number' && a > e;
      case 'gte':
        return typeof a === 'number' && typeof e === 'number' && a >= e;
      case 'lt':
        return typeof a === 'number' && typeof e === 'number' && a < e;
      case 'lte':
        return typeof a === 'number' && typeof e === 'number' && a <= e;
      case 'in':
        return Array.isArray(e) && e.some(v => normalize(v) === a);
      case 'nin':
        return Array.isArray(e) && !e.some(v => normalize(v) === a);
      case 'contains':
        if (Array.isArray(a)) return a.some(v => normalize(v) === e);
        if (typeof a === 'string' && typeof e === 'string') return a.includes(e);
        return false;
      case 'not_contains':
        if (Array.isArray(a)) return !a.some(v => normalize(v) === e);
        if (typeof a === 'string' && typeof e === 'string') return !a.includes(e);
        return true;
      case 'starts_with':
        return typeof a === 'string' && typeof e === 'string' && a.startsWith(e);
      case 'ends_with':
        return typeof a === 'string' && typeof e === 'string' && a.endsWith(e);
      case 'matches':
        if (typeof a !== 'string' || typeof expected !== 'string') return false;
        try {
          const regex = new RegExp(expected, caseSensitive ? '' : 'i');
          return regex.test(a as string);
        } catch {
          return false;
        }
      case 'between':
        if (!Array.isArray(e) || e.length !== 2) return false;
        const [min, max] = e;
        return typeof a === 'number' && a >= min && a <= max;
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      case 'is_empty':
        if (actual === null || actual === undefined) return true;
        if (typeof actual === 'string') return actual.length === 0;
        if (Array.isArray(actual)) return actual.length === 0;
        return false;
      case 'is_not_empty':
        if (actual === null || actual === undefined) return false;
        if (typeof actual === 'string') return actual.length > 0;
        if (Array.isArray(actual)) return actual.length > 0;
        return true;
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  // ===========================================================================
  // ACTION EXECUTION
  // ===========================================================================

  private executeAction(action: RuleAction, context: RuleContext): RuleContext {
    const { type, target, value, params } = action;
    const newContext = JSON.parse(JSON.stringify(context)); // Deep clone

    switch (type) {
      case 'set_value':
        if (target) this.setFieldValue(target, value, newContext);
        break;

      case 'multiply':
        if (target) {
          const current = this.getFieldValue(target, newContext);
          if (typeof current === 'number' && typeof value === 'number') {
            this.setFieldValue(target, current * value, newContext);
          }
        }
        break;

      case 'add':
        if (target) {
          const current = this.getFieldValue(target, newContext);
          if (typeof current === 'number' && typeof value === 'number') {
            this.setFieldValue(target, current + value, newContext);
          }
        }
        break;

      case 'filter':
        // Filter arrays based on params
        if (target && params) {
          const arr = this.getFieldValue(target, newContext);
          if (Array.isArray(arr)) {
            const filtered = arr.filter((item: any) => {
              for (const [key, val] of Object.entries(params)) {
                if (item[key] !== val) return false;
              }
              return true;
            });
            this.setFieldValue(target, filtered, newContext);
          }
        }
        break;

      case 'sort':
        if (target && params?.field) {
          const arr = this.getFieldValue(target, newContext);
          if (Array.isArray(arr)) {
            const order = params.order === 'desc' ? -1 : 1;
            const sorted = [...arr].sort((a: any, b: any) => {
              const aVal = a[params.field as string];
              const bVal = b[params.field as string];
              if (aVal < bVal) return -1 * order;
              if (aVal > bVal) return 1 * order;
              return 0;
            });
            this.setFieldValue(target, sorted, newContext);
          }
        }
        break;

      case 'limit':
        if (target && typeof value === 'number') {
          const arr = this.getFieldValue(target, newContext);
          if (Array.isArray(arr)) {
            this.setFieldValue(target, arr.slice(0, value), newContext);
          }
        }
        break;

      case 'log':
        logger.info(`Rule action log: ${value}`, { context: newContext.data });
        break;

      case 'abort':
        // Abort is handled by the caller
        break;

      case 'skip':
        // Skip is handled by the caller
        break;

      case 'notify':
        // Notification would be handled by a separate notification service
        logger.info('Notification action triggered', { value, params });
        break;

      case 'transform':
        // Custom transformation based on params
        if (target && params?.transformer) {
          const current = this.getFieldValue(target, newContext);
          const transformed = this.applyTransformation(current, params.transformer as string, params);
          this.setFieldValue(target, transformed, newContext);
        }
        break;

      default:
        logger.warn(`Unknown action type: ${type}`);
    }

    return newContext;
  }

  private setFieldValue(field: string, value: unknown, context: RuleContext): void {
    const parts = field.split('.');
    let current: any = context;

    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  private applyTransformation(value: unknown, transformer: string, params: Record<string, unknown>): unknown {
    switch (transformer) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'round':
        return typeof value === 'number' ? Math.round(value) : value;
      case 'floor':
        return typeof value === 'number' ? Math.floor(value) : value;
      case 'ceil':
        return typeof value === 'number' ? Math.ceil(value) : value;
      case 'abs':
        return typeof value === 'number' ? Math.abs(value) : value;
      default:
        return value;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private isRuleInSchedule(rule: Rule): boolean {
    if (!rule.schedule) return true;

    const now = new Date();
    const { startDate, endDate, daysOfWeek } = rule.schedule;

    // Check date range
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    // Check day of week
    if (daysOfWeek && daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!daysOfWeek.includes(currentDay)) return false;
    }

    return true;
  }

  private getModifications(original: RuleContext, modified: RuleContext): Record<string, unknown> {
    const mods: Record<string, unknown> = {};
    
    const compare = (path: string, orig: any, mod: any) => {
      if (typeof orig !== typeof mod) {
        mods[path] = { from: orig, to: mod };
        return;
      }

      if (typeof orig === 'object' && orig !== null) {
        for (const key of new Set([...Object.keys(orig), ...Object.keys(mod)])) {
          compare(path ? `${path}.${key}` : key, orig[key], mod[key]);
        }
      } else if (orig !== mod) {
        mods[path] = { from: orig, to: mod };
      }
    };

    compare('', original.data, modified.data);
    return mods;
  }

  private async invalidateCache(category?: RuleCategory): Promise<void> {
    if (category) {
      await cacheService.delete(CACHE_KEYS.rules(category));
    }
    await cacheService.delete(CACHE_KEYS.allRules);
    this.rulesCache.clear();
  }

  private dbRuleToRule(dbRule: any): Rule {
    return {
      id: dbRule.id,
      name: dbRule.name,
      description: dbRule.description || undefined,
      category: dbRule.category as RuleCategory,
      priority: dbRule.priority,
      enabled: dbRule.enabled,
      conditions: dbRule.conditions as unknown as RuleConditionGroup,
      actions: dbRule.actions as unknown as RuleAction[],
      metadata: {
        createdBy: dbRule.createdBy || undefined,
        createdAt: dbRule.createdAt,
        updatedAt: dbRule.updatedAt,
        version: dbRule.version,
        tags: dbRule.tags
      },
      schedule: {
        startDate: dbRule.startDate || undefined,
        endDate: dbRule.endDate || undefined,
        daysOfWeek: dbRule.daysOfWeek,
        timezone: dbRule.timezone || undefined
      }
    };
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  private async logEvaluation(
    rule: Rule, 
    matched: boolean, 
    context: RuleContext,
    executedActions: RuleAction[]
  ): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) return;

    try {
      await (prisma as any).ruleAuditLog.create({
        data: {
          ruleId: rule.id,
          action: 'evaluate',
          userId: context.userId,
          context: context as any,
          result: { matched, executedActions } as any
        }
      });
    } catch (error: any) {
      logger.warn('Failed to log rule evaluation', { error: error.message });
    }
  }

  private async logMutation(
    action: 'create' | 'update' | 'delete',
    ruleId: string,
    previousState: any,
    newState: any
  ): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) return;

    try {
      await (prisma as any).ruleAuditLog.create({
        data: {
          ruleId: action === 'delete' ? null : ruleId,
          action,
          previousState: previousState as any,
          newState: newState as any
        }
      });
    } catch (error: any) {
      logger.warn('Failed to log rule mutation', { error: error.message });
    }
  }
}

// Export singleton instance
export const ruleEngineService = new RuleEngineService();
export default ruleEngineService;

