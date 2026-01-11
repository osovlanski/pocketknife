/**
 * Config Service - Dynamic Configuration Management
 * 
 * Manages application configuration from multiple sources:
 * 1. Environment variables (highest priority)
 * 2. Database (AppConfig table)
 * 3. Default values (fallback)
 * 
 * Supports runtime configuration updates without restart.
 */

import { databaseService, getPrisma } from './databaseService';
import { cacheService } from './cacheService';

// Default configuration values - organized by category
const DEFAULT_CONFIG = {
  // ==========================================================================
  // API LIMITS
  // ==========================================================================
  'api.rateLimit.requests': 100,
  'api.rateLimit.windowMs': 60000,
  'api.pagination.defaultLimit': 20,
  'api.pagination.maxLimit': 100,
  
  // ==========================================================================
  // SHOPPING AGENT
  // ==========================================================================
  'shopping.dealScore.excellent': 80,      // Green - Excellent deal
  'shopping.dealScore.good': 60,           // Yellow - Good deal
  'shopping.dealScore.fair': 40,           // Orange - Fair deal
  'shopping.dealScore.notifyThreshold': 70, // Default threshold for notifications
  'shopping.search.maxResults': 30,
  'shopping.search.maxIsraeliResults': 10,
  'shopping.ai.maxTokens': 1500,
  
  // ==========================================================================
  // JOB AGENT
  // ==========================================================================
  'job.match.excellent': 80,               // Excellent match threshold
  'job.match.good': 60,                    // Good match threshold
  'job.match.streamThreshold': 75,         // Minimum score to stream to frontend
  'job.search.maxResults': 50,
  'job.search.cacheMinutes': 30,
  'job.enrichment.enabled': true,
  'job.enrichment.batchSize': 10,
  
  // ==========================================================================
  // EMAIL AGENT
  // ==========================================================================
  'email.batch.size': 50,
  'email.classification.confidenceThreshold': 0.75,
  'email.scheduler.enabled': false,
  'email.scheduler.interval': '0 */4 * * *', // Every 4 hours
  'email.ai.maxTokens': 1500,
  
  // ==========================================================================
  // PROBLEM SOLVING AGENT
  // ==========================================================================
  'problem.search.maxResults': 100,
  'problem.search.leetcodeLimit': 50,
  'problem.evaluation.model': 'claude-sonnet-4-20250514',
  'problem.hints.maxCount': 3,
  'problem.ai.maxTokens': 2000,
  
  // ==========================================================================
  // LEARNING AGENT
  // ==========================================================================
  'learning.search.maxResults': 15,
  'learning.sources.default': ['devto', 'hackernews', 'reddit', 'newsletters'],
  'learning.ai.maxTokens': 2000,
  
  // ==========================================================================
  // TRAVEL AGENT
  // ==========================================================================
  'travel.search.maxFlights': 20,
  'travel.search.maxHotels': 20,
  'travel.search.cacheMinutes': 60,
  'travel.trip.defaultDays': 7,
  'travel.ai.maxTokens': 2000,
  
  // ==========================================================================
  // TODO AGENT
  // ==========================================================================
  'todo.task.defaultDuration': 30,         // Default task duration in minutes
  'todo.calendar.syncEnabled': true,
  'todo.ai.maxTokens': 2000,
  
  // ==========================================================================
  // COOKING AGENT
  // ==========================================================================
  'cooking.search.maxResults': 20,
  'cooking.recipe.maxResults': 10,
  'cooking.expiryWarning.daysAhead': 3,  // Days before expiry to warn
  'cooking.lowStock.threshold': 2,        // Quantity below this = low stock
  'cooking.invoice.autoDetect': true,     // Auto-detect items from invoices
  'cooking.invoice.confidenceThreshold': 0.7, // Min confidence for auto-matching
  'cooking.ai.maxTokens': 2000,
  'cooking.cache.itemsTtlSeconds': 300,   // 5 minutes for inventory items
  'cooking.cache.recipesTtlSeconds': 3600, // 1 hour for recipes
  'cooking.api.timeoutMs': 5000,          // API request timeout
  
  // ==========================================================================
  // NEWS AGENT
  // ==========================================================================
  'news.search.maxResults': 30,
  'news.sources.default': ['hackernews', 'reddit', 'newsapi'],
  'news.learning.rate': 0.1,              // Learning rate for topic weights
  'news.digest.maxArticles': 10,
  'news.cache.ttlSeconds': 900,           // 15 minutes
  'news.ai.maxTokens': 500,
  
  // ==========================================================================
  // DIY AGENT
  // ==========================================================================
  'diy.search.maxResults': 20,
  'diy.ai.maxTokens': 3000,
  'diy.cache.ttlSeconds': 86400,          // 24 hours for generated projects
  
  // ==========================================================================
  // NOTION INTEGRATION
  // ==========================================================================
  'notion.search.maxResults': 20,
  'notion.query.maxResults': 100,
  'notion.databases.learning': '',      // Database ID for learning resources
  'notion.databases.jobs': '',          // Database ID for job applications
  'notion.databases.recipes': '',       // Database ID for saved recipes
  'notion.databases.tasks': '',         // Database ID for tasks
  
  // ==========================================================================
  // MEILISEARCH (Local Search)
  // ==========================================================================
  'meilisearch.defaultLimit': 20,
  'meilisearch.timeout': 5000,
  
  // ==========================================================================
  // SERPAPI (Web Search)
  // ==========================================================================
  'serpapi.defaultResults': 10,
  'serpapi.cacheMinutes': 60,
  
  // ==========================================================================
  // GOOGLE SEARCH API
  // ==========================================================================
  'google.cse.dailyLimit': 100,
  'google.cse.maxResultsPerQuery': 10,
  
  // ==========================================================================
  // CLAUDE AI
  // ==========================================================================
  'ai.claude.defaultModel': 'claude-sonnet-4-20250514',
  'ai.claude.defaultMaxTokens': 1500,
  'ai.claude.maxTokensLimit': 4000,
  
  // ==========================================================================
  // CACHE
  // ==========================================================================
  'cache.memory.ttlSeconds': 300,
  'cache.redis.ttlSeconds': 3600,
  'cache.autocomplete.maxHistory': 100,
  
  // ==========================================================================
  // FEATURES
  // ==========================================================================
  'feature.aiGeneration': true,
  'feature.companyEnrichment': true,
  'feature.activityLogging': true,
  'feature.israeliShops': true,
  'feature.calendarSync': true
} as const;

type ConfigKey = keyof typeof DEFAULT_CONFIG;
type ConfigValue = typeof DEFAULT_CONFIG[ConfigKey];

// In-memory config cache (refreshed periodically)
let configCache: Map<string, unknown> = new Map();
let lastRefresh = 0;
const REFRESH_INTERVAL = 60000; // 1 minute

export const configService = {
  /**
   * Initialize configuration service
   * Loads all config from database into cache
   */
  init: async (): Promise<void> => {
    await configService.refresh();
    console.log('✅ Config service initialized');
  },

  /**
   * Refresh configuration from database
   */
  refresh: async (): Promise<void> => {
    // Skip if database is not configured
    const prisma = getPrisma();
    if (!prisma) {
      console.log('ℹ️ Database not configured, using default/env config only');
      lastRefresh = Date.now();
      return;
    }
    
    try {
      const configs = await prisma.appConfig.findMany();
      configCache.clear();
      
      for (const config of configs) {
        configCache.set(config.id, config.value);
      }
      
      lastRefresh = Date.now();
    } catch (error) {
      console.warn('⚠️ Failed to refresh config from database:', error);
    }
  },

  /**
   * Get configuration value
   * Priority: Environment > Database > Default
   */
  get: <T extends ConfigValue>(key: ConfigKey, defaultValue?: T): T => {
    // Check environment variable first (convert key to ENV format)
    const envKey = key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      return configService.parseValue(envValue, defaultValue) as T;
    }

    // Check database cache
    const dbValue = configCache.get(key);
    if (dbValue !== undefined) {
      return dbValue as T;
    }

    // Return default
    return (defaultValue ?? DEFAULT_CONFIG[key]) as T;
  },

  /**
   * Get configuration value (async - checks database)
   */
  getAsync: async <T extends ConfigValue>(key: ConfigKey, defaultValue?: T): Promise<T> => {
    // Refresh cache if stale
    if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
      await configService.refresh();
    }

    return configService.get(key, defaultValue);
  },

  /**
   * Set configuration value (persists to database)
   */
  set: async <T>(key: string, value: T, category?: string): Promise<void> => {
    await databaseService.setConfig(key, value, category);
    configCache.set(key, value);
    
    // Invalidate any cached data that depends on this config
    await cacheService.invalidateByTag(`config:${key}`);
  },

  /**
   * Get all configuration values
   */
  getAll: (): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    
    // Start with defaults
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      result[key] = value;
    }
    
    // Override with database values
    for (const [key, value] of configCache.entries()) {
      result[key] = value;
    }
    
    return result;
  },

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled: (feature: string): boolean => {
    const key = `feature.${feature}` as ConfigKey;
    return configService.get(key, false) as boolean;
  },

  /**
   * Get API limit configuration
   */
  getApiLimits: () => ({
    requests: configService.get('api.rateLimit.requests', 100),
    windowMs: configService.get('api.rateLimit.windowMs', 60000)
  }),

  /**
   * Get shopping deal score thresholds
   */
  getShoppingThresholds: () => ({
    excellent: configService.get('shopping.dealScore.excellent', 80),
    good: configService.get('shopping.dealScore.good', 60),
    fair: configService.get('shopping.dealScore.fair', 40),
    notifyThreshold: configService.get('shopping.dealScore.notifyThreshold', 70)
  }),

  /**
   * Get job match thresholds
   */
  getJobThresholds: () => ({
    excellent: configService.get('job.match.excellent', 80),
    good: configService.get('job.match.good', 60),
    streamThreshold: configService.get('job.match.streamThreshold', 75)
  }),

  /**
   * Get email classification settings
   */
  getEmailSettings: () => ({
    batchSize: configService.get('email.batch.size', 50),
    confidenceThreshold: configService.get('email.classification.confidenceThreshold', 0.75)
  }),

  /**
   * Get Google CSE limits
   */
  getGoogleCseLimits: () => ({
    dailyLimit: configService.get('google.cse.dailyLimit', 100),
    maxResultsPerQuery: configService.get('google.cse.maxResultsPerQuery', 10)
  }),

  /**
   * Get AI/Claude settings
   */
  getAiSettings: () => ({
    defaultModel: configService.get('ai.claude.defaultModel', 'claude-sonnet-4-20250514'),
    defaultMaxTokens: configService.get('ai.claude.defaultMaxTokens', 1500),
    maxTokensLimit: configService.get('ai.claude.maxTokensLimit', 4000)
  }),

  /**
   * Get agent-specific max tokens
   */
  getAgentMaxTokens: (agent: 'shopping' | 'job' | 'email' | 'problem' | 'learning' | 'travel' | 'todo'): number => {
    const key = `${agent}.ai.maxTokens` as ConfigKey;
    return configService.get(key, 1500);
  },

  /**
   * Parse string value to appropriate type
   */
  parseValue: (value: string, reference?: unknown): unknown => {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (!isNaN(Number(value)) && typeof reference === 'number') {
      return Number(value);
    }
    
    // JSON
    if ((value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    return value;
  },

  /**
   * Validate configuration (check required values)
   */
  validate: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check required environment variables
    const requiredEnv = [
      'ANTHROPIC_API_KEY'
    ];
    
    for (const envVar of requiredEnv) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Check optional but recommended
    const recommendedEnv = [
      'DATABASE_URL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ];
    
    for (const envVar of recommendedEnv) {
      if (!process.env[envVar]) {
        console.warn(`⚠️ Recommended environment variable not set: ${envVar}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export default configService;

