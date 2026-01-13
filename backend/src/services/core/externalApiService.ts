/**
 * External API Configuration Service
 * 
 * Manages external API configurations, health checks, and usage tracking.
 * Provides centralized control over which external APIs are enabled/disabled.
 */

import { getPrisma } from './databaseService';
import { cacheService, cacheKeys } from './cacheService';
import logger from '../../utils/logger';

// Cache TTL for API configs (5 minutes)
const API_CONFIG_CACHE_TTL = 300;

export interface ExternalApiConfig {
  id: string;
  name: string;
  displayName: string;
  category: string;
  baseUrl?: string | null;
  apiKeyEnvVar?: string | null;
  isEnabled: boolean;
  isHealthy: boolean;
  lastHealthCheck?: Date | null;
  lastError?: string | null;
  rateLimit?: number | null;
  rateLimitPeriod?: string | null;
  currentUsage: number;
  usageResetAt?: Date | null;
  description?: string | null;
  docsUrl?: string | null;
  requiresAuth: boolean;
  authType?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  hasApiKey?: boolean;
}

// Default API configurations for job agents
const DEFAULT_JOB_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'remoteok',
    displayName: 'RemoteOK',
    category: 'jobs',
    baseUrl: 'https://remoteok.com/api',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Free remote job listings API',
    docsUrl: 'https://remoteok.com/api',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'remotive',
    displayName: 'Remotive',
    category: 'jobs',
    baseUrl: 'https://remotive.com/api/remote-jobs',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Remote tech job listings (100 requests/day free)',
    docsUrl: 'https://remotive.com/api/remote-jobs',
    priority: 2,
    currentUsage: 0
  },
  {
    name: 'arbeitnow',
    displayName: 'Arbeitnow',
    category: 'jobs',
    baseUrl: 'https://www.arbeitnow.com/api/job-board-api',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Global job listings, unlimited free access',
    docsUrl: 'https://arbeitnow.com/api/job-board-api',
    priority: 3,
    currentUsage: 0
  },
  {
    name: 'themuse',
    displayName: 'The Muse',
    category: 'jobs',
    baseUrl: 'https://www.themuse.com/api/public/jobs?page=1&descending=true',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    rateLimit: 500,
    rateLimitPeriod: 'month',
    description: 'High-quality tech jobs with company profiles',
    docsUrl: 'https://www.themuse.com/developers/api/v2',
    priority: 4,
    currentUsage: 0
  },
  {
    name: 'himalayas',
    displayName: 'Himalayas',
    category: 'jobs',
    baseUrl: 'https://himalayas.app/jobs/api?limit=10',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Remote tech jobs with company info',
    docsUrl: 'https://himalayas.app/companies/api',
    priority: 6,
    currentUsage: 0
  },
  {
    name: 'jsearch',
    displayName: 'JSearch (RapidAPI)',
    category: 'jobs',
    baseUrl: 'https://jsearch.p.rapidapi.com',
    apiKeyEnvVar: 'RAPIDAPI_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 150,
    rateLimitPeriod: 'month',
    description: 'Aggregates LinkedIn, Glassdoor, Indeed, ZipRecruiter',
    docsUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
    priority: 7,
    currentUsage: 0
  },
  {
    name: 'adzuna',
    displayName: 'Adzuna',
    category: 'jobs',
    baseUrl: 'https://api.adzuna.com/v1/api/jobs',
    apiKeyEnvVar: 'ADZUNA_APP_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    description: 'International job board aggregator (US, UK, EU, etc.)',
    docsUrl: 'https://developer.adzuna.com/',
    priority: 8,
    currentUsage: 0
  },
  {
    name: 'israeli_tech',
    displayName: 'Israeli Tech Companies',
    category: 'jobs',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Curated list of top Israeli tech company career pages',
    priority: 9,
    currentUsage: 0
  },
  {
    name: 'comeet_ats',
    displayName: 'Comeet ATS',
    category: 'jobs',
    baseUrl: 'https://www.comeet.com/careers-api/2.0',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Job listings from companies using Comeet ATS (many Israeli startups)',
    docsUrl: 'https://developers.comeet.com/reference',
    priority: 10,
    currentUsage: 0
  },
  {
    name: 'israeli_communities',
    displayName: 'Israeli Tech Communities',
    category: 'jobs',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Jobs from Israeli tech communities (Telegram, Startup Nation Central)',
    priority: 11,
    currentUsage: 0
  }
];

// Travel APIs
const DEFAULT_TRAVEL_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'amadeus',
    displayName: 'Amadeus API',
    category: 'travel',
    baseUrl: 'https://test.api.amadeus.com/v1/security/oauth2/token',
    apiKeyEnvVar: 'AMADEUS_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'oauth2',
    rateLimit: 2000,
    rateLimitPeriod: 'month',
    description: 'Flight & hotel search - requires AMADEUS_API_KEY and AMADEUS_API_SECRET',
    docsUrl: 'https://developers.amadeus.com/',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'google_places',
    displayName: 'Google Places API',
    category: 'travel',
    baseUrl: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
    apiKeyEnvVar: 'GOOGLE_CSE_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    description: 'Location details, reviews, photos (uses GOOGLE_CSE_API_KEY)',
    docsUrl: 'https://developers.google.com/maps/documentation/places/',
    priority: 2,
    currentUsage: 0
  }
];

// Learning APIs  
const DEFAULT_LEARNING_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'google_cse',
    displayName: 'Google Custom Search',
    category: 'learning',
    baseUrl: 'https://www.googleapis.com/customsearch/v1',
    apiKeyEnvVar: 'GOOGLE_CSE_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 100,
    rateLimitPeriod: 'day',
    description: 'Search tutorials, docs, and learning resources (uses GOOGLE_CSE_API_KEY)',
    docsUrl: 'https://developers.google.com/custom-search/v1/overview',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'dev_to',
    displayName: 'DEV.to API',
    category: 'learning',
    baseUrl: 'https://dev.to/api/articles',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Developer community articles and tutorials',
    docsUrl: 'https://developers.forem.com/api',
    priority: 2,
    currentUsage: 0
  },
  {
    name: 'github_api',
    displayName: 'GitHub API',
    category: 'learning',
    baseUrl: 'https://api.github.com',
    apiKeyEnvVar: 'GITHUB_TOKEN',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 5000,
    rateLimitPeriod: 'hour',
    description: 'Repository search, code examples, and docs',
    docsUrl: 'https://docs.github.com/en/rest',
    priority: 3,
    currentUsage: 0
  }
];

// Shopping APIs (Scrapers - may be blocked by websites)
const DEFAULT_SHOPPING_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'zap_scraper',
    displayName: 'Zap.co.il Scraper',
    category: 'shopping',
    baseUrl: 'https://www.zap.co.il',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    authType: 'scraper',
    description: 'Israeli price comparison (web scraper)',
    docsUrl: 'https://www.zap.co.il',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'ksp_scraper',
    displayName: 'KSP Scraper',
    category: 'shopping',
    baseUrl: 'https://www.ksp.co.il',
    isEnabled: true,
    isHealthy: false,
    requiresAuth: false,
    authType: 'scraper',
    description: 'Israeli electronics retailer (may be blocked - 403)',
    docsUrl: 'https://www.ksp.co.il',
    priority: 2,
    currentUsage: 0
  }
];

// Problem Solving APIs
const DEFAULT_PROBLEM_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'leetcode_graphql',
    displayName: 'LeetCode GraphQL',
    category: 'problems',
    baseUrl: 'https://leetcode.com/graphql',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    authType: 'graphql',
    description: 'Fetch coding problems (GraphQL - POST only)',
    docsUrl: 'https://leetcode.com',
    priority: 1,
    currentUsage: 0
  }
];

// AI/LLM APIs
const DEFAULT_AI_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'anthropic_claude',
    displayName: 'Anthropic Claude',
    category: 'ai',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    description: 'Claude AI for analysis, matching, and content generation',
    docsUrl: 'https://docs.anthropic.com/',
    priority: 1,
    currentUsage: 0
  }
];

// Notification APIs
const DEFAULT_NOTIFICATION_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'telegram_bot',
    displayName: 'Telegram Bot API',
    category: 'notifications',
    baseUrl: 'https://api.telegram.org',
    apiKeyEnvVar: 'TELEGRAM_BOT_TOKEN',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    description: 'Send notifications via Telegram bot',
    docsUrl: 'https://core.telegram.org/bots/api',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'discord_webhook',
    displayName: 'Discord Webhook',
    category: 'notifications',
    baseUrl: 'https://discord.com/api/webhooks',
    apiKeyEnvVar: 'DISCORD_WEBHOOK_URL',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'webhook',
    description: 'Send notifications to Discord channels',
    docsUrl: 'https://discord.com/developers/docs/resources/webhook',
    priority: 2,
    currentUsage: 0
  },
  {
    name: 'notion_api',
    displayName: 'Notion API',
    category: 'integrations',
    baseUrl: 'https://api.notion.com/v1',
    apiKeyEnvVar: 'NOTION_TOKEN',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'bearer',
    description: 'Knowledge management: save resources, jobs, recipes, tasks to Notion',
    docsUrl: 'https://developers.notion.com/',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'meilisearch',
    displayName: 'MeiliSearch',
    category: 'search',
    baseUrl: 'http://localhost:7700',
    apiKeyEnvVar: 'MEILISEARCH_HOST',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    authType: 'none',
    description: 'Local full-text search engine for instant search across jobs, recipes, resources',
    docsUrl: 'https://docs.meilisearch.com/',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'serpapi',
    displayName: 'SerpApi',
    category: 'search',
    baseUrl: 'https://serpapi.com/search',
    apiKeyEnvVar: 'SERPAPI_KEY',
    rateLimit: 100,
    rateLimitPeriod: 'month',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    description: 'Google/Bing web search API for tutorials, products, and enhanced search results',
    docsUrl: 'https://serpapi.com/docs',
    priority: 2,
    currentUsage: 0
  }
];

// Email APIs
const DEFAULT_EMAIL_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'gmail_api',
    displayName: 'Gmail API',
    category: 'email',
    baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    apiKeyEnvVar: 'GOOGLE_CLIENT_ID',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'oauth2',
    description: 'Read and manage Gmail messages',
    docsUrl: 'https://developers.google.com/gmail/api',
    priority: 1,
    currentUsage: 0
  }
];

// News APIs
const DEFAULT_NEWS_APIS: Omit<ExternalApiConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'newsapi',
    displayName: 'NewsAPI',
    category: 'news',
    baseUrl: 'https://newsapi.org/v2',
    apiKeyEnvVar: 'NEWSAPI_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 100,
    rateLimitPeriod: 'day',
    description: 'Top headlines and news articles from 80,000+ sources',
    docsUrl: 'https://newsapi.org/docs',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'gnews',
    displayName: 'GNews',
    category: 'news',
    baseUrl: 'https://gnews.io/api/v4',
    apiKeyEnvVar: 'GNEWS_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 100,
    rateLimitPeriod: 'day',
    description: 'News articles from Google News (10 requests/day free)',
    docsUrl: 'https://gnews.io/docs/v4',
    priority: 2,
    currentUsage: 0
  },
  {
    name: 'hackernews',
    displayName: 'Hacker News',
    category: 'news',
    baseUrl: 'https://hacker-news.firebaseio.com/v0',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Tech-focused news and discussions (no API key required)',
    docsUrl: 'https://github.com/HackerNews/API',
    priority: 1,
    currentUsage: 0
  },
  {
    name: 'reddit',
    displayName: 'Reddit',
    category: 'news',
    baseUrl: 'https://www.reddit.com',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: false,
    description: 'Reddit front page and subreddits (no auth for public API)',
    docsUrl: 'https://www.reddit.com/dev/api',
    priority: 2,
    currentUsage: 0
  },
  {
    name: 'mediastack',
    displayName: 'MediaStack',
    category: 'news',
    baseUrl: 'http://api.mediastack.com/v1',
    apiKeyEnvVar: 'MEDIASTACK_API_KEY',
    isEnabled: true,
    isHealthy: true,
    requiresAuth: true,
    authType: 'api_key',
    rateLimit: 500,
    rateLimitPeriod: 'month',
    description: 'Real-time news API with 7500+ sources',
    docsUrl: 'https://mediastack.com/documentation',
    priority: 3,
    currentUsage: 0
  }
];

// Combine all default APIs
const ALL_DEFAULT_APIS = [
  ...DEFAULT_JOB_APIS,
  ...DEFAULT_TRAVEL_APIS,
  ...DEFAULT_LEARNING_APIS,
  ...DEFAULT_SHOPPING_APIS,
  ...DEFAULT_PROBLEM_APIS,
  ...DEFAULT_AI_APIS,
  ...DEFAULT_NOTIFICATION_APIS,
  ...DEFAULT_EMAIL_APIS,
  ...DEFAULT_NEWS_APIS
];

export const externalApiService = {
  isTableReady: async (): Promise<boolean> => {
    const prisma = getPrisma();
    if (!prisma) return false;
    
    try {
      await (prisma as any).externalApiConfig?.findFirst();
      return true;
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return false;
      }
      if (!(prisma as any).externalApiConfig) {
        return false;
      }
      throw error;
    }
  },

  initializeDefaults: async (): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) {
      logger.warn('Database not available, skipping API config initialization');
      return;
    }

    if (!(prisma as any).externalApiConfig) {
      logger.warn('ExternalApiConfig model not found. Run: npx prisma migrate dev --name add_external_api_config');
      return;
    }

    logger.init('Initializing external API configurations for all agents...');

    let successCount = 0;
    let skipCount = 0;

    for (const api of ALL_DEFAULT_APIS) {
      try {
        await (prisma as any).externalApiConfig.upsert({
          where: { name: api.name },
          update: {
            apiKeyEnvVar: api.apiKeyEnvVar,
            displayName: api.displayName,
            baseUrl: api.baseUrl,
            category: api.category,
            description: api.description,
            docsUrl: api.docsUrl,
            requiresAuth: api.requiresAuth,
            authType: api.authType,
            rateLimit: api.rateLimit,
            rateLimitPeriod: api.rateLimitPeriod
          },
          create: api as any
        });
        successCount++;
      } catch (error: any) {
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          logger.warn('ExternalApiConfig table not found. Run migration first.');
          return;
        }
        logger.warn('Failed to create API config', { api: api.name, error: error.message });
        skipCount++;
      }
    }

    if (successCount > 0) {
      logger.success('Initialized/updated external API configurations', { count: successCount });
      await cacheService.delete(cacheKeys.allExternalApis());
      await cacheService.invalidateByPattern('api:config');
    }
    if (skipCount > 0) {
      logger.warn('Skipped API configurations due to errors', { count: skipCount });
    }
  },

  getAll: async (category?: string): Promise<ExternalApiConfig[]> => {
    const prisma = getPrisma();
    
    const getDefaultApis = (cat?: string) => {
      const apis = cat ? ALL_DEFAULT_APIS.filter(a => a.category === cat) : ALL_DEFAULT_APIS;
      return apis.map((api) => ({
        ...api,
        id: `default-${api.name}`,
        hasApiKey: api.apiKeyEnvVar ? !!process.env[api.apiKeyEnvVar] : true,
        createdAt: new Date(),
        updatedAt: new Date()
      })) as ExternalApiConfig[];
    };

    if (!prisma) {
      logger.debug('getAll: Prisma not available, returning defaults');
      return getDefaultApis(category);
    }
    
    if (!(prisma as any).externalApiConfig) {
      logger.debug('getAll: ExternalApiConfig model not found, returning defaults');
      return getDefaultApis(category);
    }

    const cacheKey = category ? `api:config:category:${category}` : cacheKeys.allExternalApis();
    const cached = await cacheService.get<ExternalApiConfig[]>(cacheKey);
    if (cached) return cached;

    try {
      const where = category ? { category } : {};
      const configs = await (prisma as any).externalApiConfig.findMany({
        where,
        orderBy: [{ category: 'asc' }, { priority: 'asc' }]
      });

      const enrichedConfigs = configs.map((config: any) => ({
        ...config,
        hasApiKey: config.apiKeyEnvVar ? !!process.env[config.apiKeyEnvVar] : true
      }));

      await cacheService.set(cacheKey, enrichedConfigs, { ttl: API_CONFIG_CACHE_TTL });
      return enrichedConfigs;
    } catch (error: any) {
      if (error.code === 'P2021') {
        return getDefaultApis(category);
      }
      throw error;
    }
  },

  getByName: async (name: string): Promise<ExternalApiConfig | null> => {
    const prisma = getPrisma();
    
    const cacheKey = cacheKeys.externalApiConfig(name);
    const cached = await cacheService.get<ExternalApiConfig>(cacheKey);
    if (cached) return cached;
    
    if (!prisma || !(prisma as any).externalApiConfig) {
      const defaultApi = ALL_DEFAULT_APIS.find(api => api.name === name);
      if (defaultApi) {
        return {
          ...defaultApi,
          id: `default-${name}`,
          hasApiKey: defaultApi.apiKeyEnvVar ? !!process.env[defaultApi.apiKeyEnvVar] : true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as ExternalApiConfig;
      }
      return null;
    }

    try {
      const config = await (prisma as any).externalApiConfig.findUnique({
        where: { name }
      });

      if (config) {
        const enriched = {
          ...config,
          hasApiKey: config.apiKeyEnvVar ? !!process.env[config.apiKeyEnvVar] : true
        };
        await cacheService.set(cacheKey, enriched, { ttl: API_CONFIG_CACHE_TTL });
        return enriched;
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        const defaultApi = ALL_DEFAULT_APIS.find(api => api.name === name);
        if (defaultApi) {
          return {
            ...defaultApi,
            id: `default-${name}`,
            hasApiKey: defaultApi.apiKeyEnvVar ? !!process.env[defaultApi.apiKeyEnvVar] : true,
            createdAt: new Date(),
            updatedAt: new Date()
          } as ExternalApiConfig;
        }
      }
    }

    return null;
  },

  isApiEnabled: async (name: string): Promise<boolean> => {
    const config = await externalApiService.getByName(name);
    if (!config) return false;
    if (!config.isEnabled) return false;
    if (config.requiresAuth && config.apiKeyEnvVar) {
      return !!process.env[config.apiKeyEnvVar];
    }
    return true;
  },

  getEnabledApis: async (category: string): Promise<ExternalApiConfig[]> => {
    const allConfigs = await externalApiService.getAll(category);
    return allConfigs.filter(config => {
      if (!config.isEnabled) return false;
      if (config.requiresAuth && config.apiKeyEnvVar) {
        return !!process.env[config.apiKeyEnvVar];
      }
      return true;
    });
  },

  update: async (
    name: string,
    updates: Partial<Pick<ExternalApiConfig, 'isEnabled' | 'priority' | 'description'>>
  ): Promise<ExternalApiConfig | null> => {
    const prisma = getPrisma();
    if (!prisma || !(prisma as any).externalApiConfig) {
      logger.warn('Database not ready for API config updates');
      return null;
    }

    try {
      const config = await (prisma as any).externalApiConfig.update({
        where: { name },
        data: updates
      });

      await cacheService.delete(cacheKeys.externalApiConfig(name));
      await cacheService.delete(cacheKeys.allExternalApis());
      await cacheService.invalidateByPattern('api:config:category');

      return config as ExternalApiConfig;
    } catch (error: any) {
      if (error.code === 'P2021') {
        logger.warn('ExternalApiConfig table not found');
        return null;
      }
      throw error;
    }
  },

  toggle: async (name: string): Promise<ExternalApiConfig | null> => {
    const prisma = getPrisma();
    if (!prisma || !(prisma as any).externalApiConfig) {
      logger.warn('Database not ready for API config toggle');
      return null;
    }

    try {
      const current = await (prisma as any).externalApiConfig.findUnique({
        where: { name }
      });

      if (!current) return null;

      return externalApiService.update(name, { isEnabled: !current.isEnabled });
    } catch (error: any) {
      if (error.code === 'P2021') {
        logger.warn('ExternalApiConfig table not found');
        return null;
      }
      throw error;
    }
  },

  updateHealth: async (
    name: string,
    isHealthy: boolean,
    error?: string
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma || !(prisma as any).externalApiConfig) return;

    try {
      await (prisma as any).externalApiConfig.update({
        where: { name },
        data: {
          isHealthy,
          lastHealthCheck: new Date(),
          lastError: error || null
        }
      });

      await cacheService.delete(cacheKeys.externalApiConfig(name));
      await cacheService.delete(cacheKeys.allExternalApis());
    } catch (error: any) {
      if (error.code !== 'P2021') {
        logger.warn('Failed to update API health', { error: error.message });
      }
    }
  },

  incrementUsage: async (name: string): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma || !(prisma as any).externalApiConfig) return;

    try {
      await (prisma as any).externalApiConfig.update({
        where: { name },
        data: {
          currentUsage: { increment: 1 }
        }
      });
    } catch {
      // Silently fail
    }
  },

  resetUsage: async (name: string): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma || !(prisma as any).externalApiConfig) return;

    try {
      await (prisma as any).externalApiConfig.update({
        where: { name },
        data: {
          currentUsage: 0,
          usageResetAt: new Date()
        }
      });
    } catch {
      // Silently fail
    }
  },

  isWithinRateLimit: async (name: string): Promise<boolean> => {
    const config = await externalApiService.getByName(name);
    if (!config || !config.rateLimit) return true;
    return config.currentUsage < config.rateLimit;
  }
};

export default externalApiService;
