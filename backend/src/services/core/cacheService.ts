/**
 * Cache Service - Multi-layer Caching
 * 
 * Implements a two-layer cache strategy:
 * 1. In-memory cache (fast, limited size, 5min default TTL)
 * 2. Redis cache (distributed, 1hr default TTL) - optional
 * 
 * Falls back gracefully if Redis is not available.
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import logger from '../../utils/logger';

// Cache configuration
const MEMORY_TTL_SECONDS = 300; // 5 minutes
const REDIS_TTL_SECONDS = 3600; // 1 hour
const MAX_MEMORY_KEYS = 1000;

// In-memory cache instance
const memoryCache = new NodeCache({
  stdTTL: MEMORY_TTL_SECONDS,
  maxKeys: MAX_MEMORY_KEYS,
  checkperiod: 120,
  useClones: false
});

// Redis client (lazy initialization)
let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Initialize Redis connection if configured
 */
const initRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  
  if (!redisUrl) {
    logger.skip('Redis not configured, using memory cache only');
    return;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    await redisClient.ping();
    redisAvailable = true;
    logger.connect('Redis cache connected');

    redisClient.on('error', (error) => {
      logger.fail('Redis error', { error: error instanceof Error ? error.message : String(error) });
      redisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      logger.retry('Redis reconnecting...');
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      logger.success('Redis ready');
    });
  } catch (error) {
    logger.warn('Redis connection failed, using memory cache only', { error: error instanceof Error ? error.message : String(error) });
    redisAvailable = false;
  }
};

/**
 * Cache Service Interface
 */
export interface CacheOptions {
  ttl?: number;           // TTL in seconds
  tags?: string[];        // Tags for group invalidation
  memoryOnly?: boolean;   // Skip Redis
  redisOnly?: boolean;    // Skip memory cache
}

export const cacheService = {
  /**
   * Initialize cache service
   */
  init: async (): Promise<void> => {
    await initRedis();
    logger.success('Cache service initialized', { memoryMaxKeys: MAX_MEMORY_KEYS, redisEnabled: redisAvailable });
  },

  /**
   * Get value from cache
   * Checks memory first, then Redis
   */
  get: async <T>(key: string): Promise<T | null> => {
    // Check memory cache first
    const memoryValue = memoryCache.get<T>(key);
    if (memoryValue !== undefined) {
      return memoryValue;
    }

    // Check Redis if available
    if (redisAvailable && redisClient) {
      try {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Populate memory cache for faster subsequent access
          memoryCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        logger.warn('Cache get error', { key, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return null;
  },

  /**
   * Set value in cache
   */
  set: async <T>(key: string, value: T, options: CacheOptions = {}): Promise<void> => {
    const { ttl, memoryOnly = false, redisOnly = false, tags = [] } = options;

    // Set in memory cache
    if (!redisOnly) {
      const memoryTtl = ttl ?? MEMORY_TTL_SECONDS;
      memoryCache.set(key, value, memoryTtl);
    }

    // Set in Redis if available
    if (!memoryOnly && redisAvailable && redisClient) {
      try {
        const redisTtl = ttl ?? REDIS_TTL_SECONDS;
        await redisClient.setex(key, redisTtl, JSON.stringify(value));

        // Store tags for group invalidation
        if (tags.length > 0) {
          for (const tag of tags) {
            await redisClient.sadd(`tag:${tag}`, key);
            await redisClient.expire(`tag:${tag}`, redisTtl);
          }
        }
      } catch (error) {
        logger.warn('Cache set error', { key, error: error instanceof Error ? error.message : String(error) });
      }
    }
  },

  /**
   * Delete value from cache
   */
  delete: async (key: string): Promise<void> => {
    memoryCache.del(key);

    if (redisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        logger.warn('Cache delete error', { key, error: error instanceof Error ? error.message : String(error) });
      }
    }
  },

  /**
   * Invalidate all keys with a specific tag
   */
  invalidateByTag: async (tag: string): Promise<number> => {
    let invalidatedCount = 0;

    // Clear memory cache keys (no tag support, so clear all)
    if (tag === '*') {
      invalidatedCount = memoryCache.keys().length;
      memoryCache.flushAll();
    }

    // Clear Redis keys by tag
    if (redisAvailable && redisClient) {
      try {
        const keys = await redisClient.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          await redisClient.del(`tag:${tag}`);
          invalidatedCount += keys.length;
        }
      } catch (error) {
        logger.warn('Cache invalidate error', { tag, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return invalidatedCount;
  },

  /**
   * Invalidate keys matching a pattern
   */
  invalidateByPattern: async (pattern: string): Promise<number> => {
    let invalidatedCount = 0;

    // Clear matching memory cache keys
    const memoryKeys = memoryCache.keys().filter(k => k.includes(pattern));
    memoryCache.del(memoryKeys);
    invalidatedCount += memoryKeys.length;

    // Clear matching Redis keys
    if (redisAvailable && redisClient) {
      try {
        const keys = await redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          invalidatedCount += keys.length;
        }
      } catch (error) {
        logger.warn('Cache pattern invalidate error', { pattern, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return invalidatedCount;
  },

  /**
   * Get or set with factory function
   */
  getOrSet: async <T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> => {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await cacheService.set(key, value, options);
    return value;
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    const memStats = memoryCache.getStats();
    return {
      memory: {
        keys: memoryCache.keys().length,
        hits: memStats.hits,
        misses: memStats.misses,
        hitRate: memStats.hits / (memStats.hits + memStats.misses) || 0
      },
      redis: {
        available: redisAvailable,
        connected: redisClient?.status === 'ready'
      }
    };
  },

  /**
   * Clear all caches
   */
  flushAll: async (): Promise<void> => {
    memoryCache.flushAll();

    if (redisAvailable && redisClient) {
      try {
        await redisClient.flushdb();
      } catch (error) {
        logger.warn('Cache flush error', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  },

  /**
   * Close cache connections
   */
  close: async (): Promise<void> => {
    memoryCache.close();

    if (redisClient) {
      await redisClient.quit();
      logger.disconnect('Cache connections closed');
    }
  }
};

// ============================================================================
// Cache Key Generators - Consistent key naming
// ============================================================================

export const cacheKeys = {
  // Job search
  jobSearch: (query: string, location?: string) => 
    `job:search:${query}:${location || 'any'}`,
  jobDetails: (jobId: string, source: string) => 
    `job:details:${source}:${jobId}`,
  companyInfo: (company: string) => 
    `company:${company.toLowerCase().replace(/\s+/g, '-')}`,
  jobSearchResults: (queryHash: string, optionsHash: string) =>
    `job:results:${queryHash}:${optionsHash}`,

  // CV Analysis
  cvAnalysis: (cvHash: string) =>
    `cv:analysis:${cvHash}`,
  cvJobPreferences: (cvHash: string) =>
    `cv:preferences:${cvHash}`,

  // Problem solving
  problemList: (source: string, filters: string) => 
    `problem:list:${source}:${filters}`,
  problemDetails: (source: string, slug: string) => 
    `problem:details:${source}:${slug}`,
  curatedList: (listName: string) => 
    `problem:curated:${listName}`,

  // Travel
  flightSearch: (origin: string, dest: string, date: string) => 
    `flight:${origin}:${dest}:${date}`,
  hotelSearch: (location: string, checkin: string) => 
    `hotel:${location}:${checkin}`,

  // User data
  userPreferences: (userId: string) => 
    `user:pref:${userId}`,
  userStats: (userId: string, agent: string) => 
    `user:stats:${userId}:${agent}`,

  // External API Config
  externalApiConfig: (apiName: string) =>
    `api:config:${apiName}`,
  allExternalApis: () =>
    `api:config:all`
};

export default cacheService;
