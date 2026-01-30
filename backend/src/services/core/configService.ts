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
import logger from '../../utils/logger';

// Default configuration values - organized by category
const DEFAULT_CONFIG = {
  // ==========================================================================
  // AGENT DEFAULTS (used by AbstractAgent)
  // ==========================================================================
  'agent.default.rateLimit': 60,
  'agent.default.timeoutMs': 30000,
  'agent.default.retryMaxAttempts': 3,
  'agent.default.retryInitialDelayMs': 1000,
  'agent.default.retryMaxDelayMs': 30000,
  'agent.default.retryBackoffMultiplier': 2,
  'agent.default.circuitBreakerThreshold': 5,
  'agent.default.circuitBreakerResetMs': 60000,
  'agent.default.historyLimit': 50,

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
  'shopping.dealScore.excellent': 80,
  'shopping.dealScore.good': 60,
  'shopping.dealScore.fair': 40,
  'shopping.dealScore.notifyThreshold': 70,
  'shopping.dealScore.minDefault': 70,
  'shopping.search.maxResults': 30,
  'shopping.search.maxIsraeliResults': 10,
  'shopping.search.defaultSources': ['ebay', 'aliexpress', 'amazon'],
  'shopping.search.productLimit': 15,
  'shopping.ai.maxTokens': 1500,
  'shopping.ai.hobbyMaxTokens': 2000,
  'shopping.ai.suggestionMaxTokens': 1500,
  'shopping.ai.dealScoringMaxTokens': 1500,
  'shopping.api.timeoutMs': 10000,
  'shopping.saved.maxResults': 100,
  'shopping.deals.maxResults': 20,
  'shopping.interests.maxResults': 10,
  'shopping.searches.maxResults': 5,
  'shopping.suggestions.maxPerSource': 3,
  'shopping.hobby.maxSuggestions': 5,
  'shopping.ai.filterRelevance': false,
  'shopping.feature.israeliShopsDefault': true,
  
  // ==========================================================================
  // CACHE TTL (seconds)
  // ==========================================================================
  'cache.flights.ttlSeconds': 1800,
  'cache.locations.ttlSeconds': 86400,
  'cache.routes.ttlSeconds': 3600,
  'cache.products.ttlSeconds': 1800,
  'cache.productDetails.ttlSeconds': 3600,
  'cache.leetcode.problemTtlSeconds': 86400,
  'cache.leetcode.listTtlSeconds': 3600,
  'cache.glassdoor.companyTtlSeconds': 86400,
  'cache.glassdoor.reviewsTtlSeconds': 43200,
  'cache.youtube.videosTtlSeconds': 3600,
  'cache.youtube.detailsTtlSeconds': 86400,
  'cache.recipes.ttlSeconds': 7200,
  'cache.recipeDetails.ttlSeconds': 86400,
  'cache.ingredients.ttlSeconds': 86400,
  
  // ==========================================================================
  // JOB AGENT
  // ==========================================================================
  'job.match.excellent': 80,
  'job.match.good': 60,
  'job.match.streamThreshold': 75,
  'job.search.maxResults': 50,
  'job.search.cacheMinutes': 30,
  'job.enrichment.enabled': true,
  'job.enrichment.batchSize': 10,
  'job.comeet.enabled': true,
  'job.comeet.timeoutMs': 10000,
  'job.comeet.maxConcurrentRequests': 5,
  'job.community.enabled': true,
  'job.community.timeoutMs': 10000,
  'job.community.telegramEnabled': true,
  'job.community.startupNationEnabled': true,
  'job.startups.enabled': true,
  'job.startups.geektimeEnabled': true,
  'job.startups.allJobsEnabled': true,
  'job.startups.goozaliEnabled': true,
  'job.startups.drushimEnabled': true,
  'job.startups.f6sEnabled': true,
  'job.startups.maxResultsPerSource': 50,
  'jobs.glassdoor.timeoutMs': 10000,
  'jobs.glassdoor.enabled': true,
  // Jobs Agent specific
  'jobs.agent.rateLimit': 30,
  'jobs.agent.timeoutMs': 60000,
  'jobs.action.extractQuestions.timeoutMs': 120000,
  'jobs.action.evaluateDesign.timeoutMs': 90000,
  'jobs.action.generateAnswer.timeoutMs': 45000,
  'jobs.agent.circuitBreakerThreshold': 3,
  'jobs.saved.maxResults': 100,
  'jobs.sources.apiTimeoutMs': 15000,
  'jobs.sources.longTimeoutMs': 20000,
  
  // ==========================================================================
  // MOCK INTERVIEW
  // ==========================================================================
  'mockInterview.ai.answerMaxTokens': 2000,
  'mockInterview.ai.evaluationMaxTokens': 1500,
  'mockInterview.ai.exampleQuestionsMaxTokens': 3000,
  'mockInterview.ai.translationMaxTokens': 500,
  'mockInterview.ai.systemDesignMaxTokens': 2000,
  
  // ==========================================================================
  // EMAIL AGENT
  // ==========================================================================
  'email.batch.size': 50,
  'email.classification.confidenceThreshold': 0.75,
  'email.scheduler.enabled': false,
  'email.scheduler.interval': '0 */4 * * *',
  'email.ai.maxTokens': 1500,
  
  // ==========================================================================
  // PROBLEM SOLVING AGENT
  // ==========================================================================
  'problem.search.maxResults': 100,
  'problem.search.leetcodeLimit': 50,
  'problem.evaluation.model': 'claude-sonnet-4-20250514',
  'problem.hints.maxCount': 3,
  'problem.ai.maxTokens': 2000,
  'problems.judge0.timeoutMs': 10000,
  'problems.leetcode.timeoutMs': 10000,
  'problems.leetcode.graphqlUrl': 'https://leetcode.com/graphql',
  
  // ==========================================================================
  // LEARNING AGENT
  // ==========================================================================
  'learning.search.maxResults': 15,
  'learning.sources.default': ['devto', 'hackernews', 'reddit', 'newsletters'],
  'learning.ai.maxTokens': 2000,
  'learning.youtube.timeoutMs': 10000,
  'learning.youtube.enabled': true,
  
  // ==========================================================================
  // TRAVEL AGENT
  // ==========================================================================
  'travel.search.maxFlights': 20,
  'travel.search.maxHotels': 20,
  'travel.search.cacheMinutes': 60,
  'travel.trip.defaultDays': 7,
  'travel.ai.maxTokens': 2000,
  'travel.israel.maxResults': 10,
  'travel.israel.cacheTTL': 3600,
  'travel.israel.aiEnabled': true,
  'travel.israel.defaultRegions': ['center', 'north', 'jerusalem'],
  'travel.api.timeoutMs': 10000,
  
  // ==========================================================================
  // TODO AGENT
  // ==========================================================================
  'todo.task.defaultDuration': 30,
  'todo.calendar.syncEnabled': true,
  'todo.ai.maxTokens': 2000,
  
  // ==========================================================================
  // COOKING AGENT
  // ==========================================================================
  'cooking.search.maxResults': 20,
  'cooking.recipe.maxResults': 10,
  'cooking.expiryWarning.daysAhead': 3,
  'cooking.lowStock.threshold': 2,
  'cooking.invoice.autoDetect': true,
  'cooking.invoice.confidenceThreshold': 0.7,
  'cooking.ai.maxTokens': 2000,
  'cooking.cache.itemsTtlSeconds': 300,
  'cooking.cache.recipesTtlSeconds': 3600,
  'cooking.api.timeoutMs': 5000,
  
  // ==========================================================================
  // RAMI LEVY INTEGRATION
  // ==========================================================================
  'ramiLevy.enabled': true,
  'ramiLevy.api.timeoutMs': 15000,
  'ramiLevy.api.baseUrl': 'https://www.rami-levy.co.il',
  'ramiLevy.api.maxRetries': 3,
  'ramiLevy.api.retryDelayMs': 1000,
  'ramiLevy.defaultStoreId': '331',
  'ramiLevy.cache.searchTtlSeconds': 1800,
  'ramiLevy.cache.cartTtlSeconds': 300,
  'ramiLevy.search.maxResults': 20,
  'ramiLevy.autoSelectFirstProduct': true,
  'ramiLevy.circuitBreaker.threshold': 5,
  'ramiLevy.circuitBreaker.resetMs': 60000,
  
  // ==========================================================================
  // DELIVERY SERVICE
  // ==========================================================================
  'delivery.mock.enabled': true,
  'delivery.mock.baseUrl': 'https://wolt.com',
  'delivery.mock.deliveryFee': 9.90,
  'delivery.defaultProvider': 'mock-wolt',
  'delivery.order.expiryMinutes': 30,
  'delivery.search.maxResults': 5,
  
  // Wolt Drive API Configuration
  'delivery.wolt.enabled': false,
  'delivery.wolt.apiBaseUrl': 'https://daas-public-api.wolt.com/v1',
  'delivery.wolt.venueId': '', // Set via environment variable
  'delivery.wolt.merchantId': '', // Set via environment variable
  'delivery.wolt.minPreparationMinutes': 15,
  'delivery.wolt.defaultParcelType': 'bag',
  'delivery.wolt.timeoutMs': 30000,
  
  // ==========================================================================
  // ASSISTANT AGENT
  // ==========================================================================
  'assistant.agent.rateLimit': 30,
  'assistant.agent.timeoutMs': 120000,
  'assistant.ai.maxTokens': 4000,
  'assistant.ai.planningMaxTokens': 2000,
  'assistant.ai.responseMaxTokens': 2000,
  'assistant.ai.knowledgeMaxTokens': 2000,
  'assistant.workflow.maxSteps': 10,
  'assistant.workflow.stepTimeoutMs': 30000,
  'assistant.conversation.maxHistory': 20,
  'assistant.cache.conversationTtlSeconds': 3600,
  // Multi-source aggregation
  'assistant.webSearch.enabled': true,
  'assistant.webSearch.timeoutMs': 10000,
  'assistant.webSearch.maxResults': 5,
  'assistant.aggregation.useWebFallback': true,
  'assistant.aggregation.useAIKnowledge': true,
  
  // ==========================================================================
  // NEWS AGENT
  // ==========================================================================
  'news.search.maxResults': 30,
  'news.sources.default': ['hackernews', 'reddit', 'lobsters', 'devto', 'gnews', 'mediastack'],
  'news.topics.default': ['tech', 'business', 'science'],
  'news.learning.rate': 0.1,
  'news.digest.maxArticles': 10,
  'news.cache.ttlSeconds': 900,
  'news.ai.maxTokens': 500,
  'news.ai.summaryMaxChars': 3000,
  'news.api.timeoutMs': 5000,
  'news.api.longTimeoutMs': 10000,
  'news.hackernews.fetchLimit': 50,
  'news.lobsters.fetchLimit': 30,
  'news.devto.fetchLimit': 30,
  'news.api.newsapi.baseUrl': 'https://newsapi.org/v2',
  'news.api.gnews.baseUrl': 'https://gnews.io/api/v4',
  'news.api.hackernews.baseUrl': 'https://hacker-news.firebaseio.com/v0',
  'news.api.reddit.baseUrl': 'https://www.reddit.com',
  'news.api.mediastack.baseUrl': 'http://api.mediastack.com/v1',
  'news.api.lobsters.baseUrl': 'https://lobste.rs',
  'news.api.devto.baseUrl': 'https://dev.to/api',
  'news.api.currentsapi.baseUrl': 'https://api.currentsapi.services/v1',
  'news.reddit.subreddits': ['technology', 'worldnews', 'science', 'programming', 'business', 'sports'],
  // News Agent specific
  'news.feed.defaultMaxResults': 20,
  'news.saved.maxResults': 50,
  'news.preferences.minWeightThreshold': 0.4,
  'news.preferences.maxTopicsToUse': 5,
  'news.trends.maxResults': 10,
  
  // ==========================================================================
  // DIY AGENT
  // ==========================================================================
  'diy.agent.timeoutMs': 120000, // 2 minutes for AI project generation
  'diy.agent.generateTimeoutMs': 180000, // 3 minutes for complex projects
  'diy.search.maxResults': 20,
  'diy.ai.maxTokens': 3000,
  'diy.cache.ttlSeconds': 86400,
  'diy.cache.featuredTtlSeconds': 3600,
  'diy.ideas.aiTokens': 800,
  'diy.ideas.featuredTokens': 1500,
  'diy.ideas.inspirationTokens': 500,
  'diy.ideas.featuredCount': 8,
  'diy.images.unsplashBaseUrl': 'https://source.unsplash.com',
  
  // ==========================================================================
  // NOTION INTEGRATION
  // ==========================================================================
  'notion.search.maxResults': 20,
  'notion.query.maxResults': 100,
  'notion.databases.learning': '',
  'notion.databases.jobs': '',
  'notion.databases.recipes': '',
  'notion.databases.tasks': '',
  
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
  'ai.claude.zapScraper.extractInfoMaxTokens': 2500,
  'ai.claude.israeliShops.extractInfoMaxTokens': 2000,
  'ai.claude.cooking.generateListMaxTokens': 2000,
  'ai.claude.email.patternRecognitionMaxTokens': 1500,
  'ai.claude.googleSearch.summarizeMaxTokens': 2000,
  'ai.claude.shopping.dealScoringMaxTokens': 1500,
  
  // ==========================================================================
  // CACHE
  // ==========================================================================
  'cache.memory.ttlSeconds': 300,
  'cache.redis.ttlSeconds': 3600,
  'cache.autocomplete.maxHistory': 100,
  
  // ==========================================================================
  // FEATURES (Global Feature Toggles)
  // ==========================================================================
  'feature.aiGeneration': true,
  'feature.companyEnrichment': true,
  'feature.activityLogging': true,
  'feature.israeliShops': true,
  'feature.calendarSync': true,
  'feature.ruleEngine.enabled': true,
  'feature.featureFlags.enabled': true,
  'feature.featureFlags.flipt.enabled': false,
  'feature.featureFlags.flipt.url': process.env.FLIPT_URL || 'http://localhost:8080',
  'feature.featureFlags.cacheSeconds': 60,
  
  // ==========================================================================
  // RULE ENGINE
  // ==========================================================================
  'ruleEngine.evaluation.maxRulesPerRequest': 100,
  'ruleEngine.evaluation.timeoutMs': 5000,
  'ruleEngine.cache.ttlSeconds': 300,
  'ruleEngine.audit.enabled': true,
  
  // ==========================================================================
  // EXTERNAL API TIMEOUTS (Phase 1 Migration)
  // ==========================================================================
  'api.default.timeoutMs': 10000,
  'api.longOperation.timeoutMs': 30000,
  
  // Jobs API timeouts
  'jobs.api.timeoutMs': 15000,
  'jobs.scraper.timeoutMs': 15000,
  'jobs.company.timeoutMs': 10000,
  'jobs.enrichment.timeoutMs': 10000,
  'jobs.community.timeoutMs': 10000,
  'jobs.filter.maxAgeDays': 30,
  'jobs.search.maxResults': 20,
  'jobs.community.limit': 20,
  'jobs.scraper.limit': 50,
  'jobs.company.take': 50,
  
  // Job Matching Weights (Phase 1 Migration)
  'jobs.matching.skillWeight': 50,
  'jobs.matching.roleBonus': 25,
  'jobs.matching.seniorityBonus': 15,
  'jobs.matching.techIndicatorBonus': 10,
  'jobs.matching.maxScore': 100,
  'jobs.matching.defaultThreshold': 75,
  'jobs.matching.maxMatchedSkills': 10,
  'jobs.matching.maxMissingSkills': 5,
  
  // Company Scoring (Phase 1 Migration)
  'company.scoring.startupMaxEmployees': 50,
  'company.scoring.midsizeMaxEmployees': 500,
  'company.scoring.baseScore': 50,
  
  // Problems API (Phase 1 Migration)
  'problems.codeforces.timeoutMs': 10000,
  'problems.codeforces.url': 'https://codeforces.com/api/problemset.problems',
  'problems.difficulty.thresholds.easy': 1200,
  'problems.difficulty.thresholds.medium': 1800,
  
  // Learning API (Phase 1 Migration)
  'learning.api.timeoutMs': 10000,
  'learning.search.limit': 15,
  
  // Travel API (Phase 1 Migration)
  'travel.flights.limit': 20,
  
  // Notifications (Phase 1 Migration)
  'notifications.telegram.timeoutMs': 5000,
  'notifications.discord.timeoutMs': 5000,
  'notifications.facebook.timeoutMs': 5000,
  
  // Google Search (Phase 1 Migration)
  'google.search.timeoutMs': 10000,
  
  // Cache (Phase 1 Migration)
  'cache.apiConfig.ttl': 300,
  
  // External URLs (Phase 1 Migration)
  'urls.leetcode.base': 'https://leetcode.com',
  'urls.leetcode.graphql': 'https://leetcode.com/graphql',
  'urls.codeforces.api': 'https://codeforces.com/api',
  'urls.crunchbase.base': 'https://api.crunchbase.com/api/v4',
  'urls.nominatim.base': 'https://nominatim.openstreetmap.org',
  
  // ==========================================================================
  // DEVELOPMENT CORS ORIGINS
  // ==========================================================================
  'cors.devOrigins': ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
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
   */
  init: async (): Promise<void> => {
    await configService.refresh();
    logger.success('Config service initialized');
  },

  /**
   * Refresh configuration from database
   */
  refresh: async (): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) {
      logger.skip('Database not configured, using default/env config only');
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
      logger.warn('Failed to refresh config from database', { error: error instanceof Error ? error.message : String(error) });
    }
  },

  /**
   * Get configuration value
   */
  get: <T extends ConfigValue>(key: ConfigKey, defaultValue?: T): T => {
    const envKey = key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      return configService.parseValue(envValue, defaultValue) as T;
    }

    const dbValue = configCache.get(key);
    if (dbValue !== undefined) {
      return dbValue as T;
    }

    return (defaultValue ?? DEFAULT_CONFIG[key]) as T;
  },

  /**
   * Get configuration value (async)
   */
  getAsync: async <T extends ConfigValue>(key: ConfigKey, defaultValue?: T): Promise<T> => {
    if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
      await configService.refresh();
    }
    return configService.get(key, defaultValue);
  },

  /**
   * Set configuration value
   */
  set: async <T>(key: string, value: T, category?: string): Promise<void> => {
    await databaseService.setConfig(key, value, category);
    configCache.set(key, value);
    await cacheService.invalidateByTag(`config:${key}`);
  },

  /**
   * Get all configuration values
   */
  getAll: (): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      result[key] = value;
    }
    for (const [key, value] of configCache.entries()) {
      result[key] = value;
    }
    return result;
  },

  isFeatureEnabled: (feature: string): boolean => {
    const key = `feature.${feature}` as ConfigKey;
    return configService.get(key, false) as boolean;
  },

  getApiLimits: () => ({
    requests: configService.get('api.rateLimit.requests', 100),
    windowMs: configService.get('api.rateLimit.windowMs', 60000)
  }),

  getShoppingThresholds: () => ({
    excellent: configService.get('shopping.dealScore.excellent', 80),
    good: configService.get('shopping.dealScore.good', 60),
    fair: configService.get('shopping.dealScore.fair', 40),
    notifyThreshold: configService.get('shopping.dealScore.notifyThreshold', 70)
  }),

  getJobThresholds: () => ({
    excellent: configService.get('job.match.excellent', 80),
    good: configService.get('job.match.good', 60),
    streamThreshold: configService.get('job.match.streamThreshold', 75)
  }),

  getEmailSettings: () => ({
    batchSize: configService.get('email.batch.size', 50),
    confidenceThreshold: configService.get('email.classification.confidenceThreshold', 0.75)
  }),

  getGoogleCseLimits: () => ({
    dailyLimit: configService.get('google.cse.dailyLimit', 100),
    maxResultsPerQuery: configService.get('google.cse.maxResultsPerQuery', 10)
  }),

  getAiSettings: () => ({
    defaultModel: configService.get('ai.claude.defaultModel', 'claude-sonnet-4-20250514'),
    defaultMaxTokens: configService.get('ai.claude.defaultMaxTokens', 1500),
    maxTokensLimit: configService.get('ai.claude.maxTokensLimit', 4000)
  }),

  getAgentMaxTokens: (agent: 'shopping' | 'job' | 'email' | 'problem' | 'learning' | 'travel' | 'todo'): number => {
    const key = `${agent}.ai.maxTokens` as ConfigKey;
    return configService.get(key, 1500);
  },

  parseValue: (value: string, reference?: unknown): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value)) && typeof reference === 'number') {
      return Number(value);
    }
    if ((value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  },

  validate: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    const requiredEnv = ['ANTHROPIC_API_KEY'];
    for (const envVar of requiredEnv) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    const recommendedEnv = ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    for (const envVar of recommendedEnv) {
      if (!process.env[envVar]) {
        logger.warn('Recommended environment variable not set', { envVar });
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
};

export default configService;
