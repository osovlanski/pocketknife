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

// Default configuration values
const DEFAULT_CONFIG = {
  // API Limits
  'api.rateLimit.requests': 100,
  'api.rateLimit.windowMs': 60000,
  
  // Job Search
  'job.search.maxResults': 50,
  'job.search.cacheMinutes': 30,
  'job.enrichment.enabled': true,
  
  // Problem Solving
  'problem.search.maxResults': 100,
  'problem.evaluation.model': 'claude-sonnet-4-20250514',
  'problem.hints.maxCount': 3,
  
  // Travel
  'travel.search.maxFlights': 20,
  'travel.search.maxHotels': 20,
  'travel.search.cacheMinutes': 60,
  
  // Email
  'email.batch.size': 50,
  'email.scheduler.enabled': false,
  'email.scheduler.interval': '0 */4 * * *', // Every 4 hours
  
  // Cache
  'cache.memory.ttlSeconds': 300,
  'cache.redis.ttlSeconds': 3600,
  
  // Features
  'feature.aiGeneration': true,
  'feature.companyEnrichment': true,
  'feature.activityLogging': true
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

