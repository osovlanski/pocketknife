/**
 * Cache Configuration Defaults
 *
 * Default TTL (time-to-live) values for various cache layers and categories.
 *
 * @module services/core/config/defaults/cacheDefaults
 */

export const cacheDefaults = {
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
  // MEMORY & REDIS CACHE
  // ==========================================================================
  'cache.memory.ttlSeconds': 300,
  'cache.redis.ttlSeconds': 3600,
  'cache.autocomplete.maxHistory': 100,
  'cache.apiConfig.ttl': 300
} as const;
