/**
 * Cache Configuration Defaults
 *
 * Default TTL (time-to-live) values for various cache layers and categories.
 * All TTL values are in seconds unless noted otherwise.
 *
 * @module services/core/config/defaults/cacheDefaults
 */

export const cacheDefaults = {
  // ==========================================================================
  // DELIVERY & GROCERY CACHE
  // ==========================================================================
  'cache.delivery.previewTtlSeconds': 1800,
  'cache.delivery.wolt.promiseTtlSeconds': 1800,
  'cache.delivery.wolt.previewTtlSeconds': 1800,

  // ==========================================================================
  // COOKING CACHE
  // ==========================================================================
  'cache.recipes.ttlSeconds': 7200,
  'cache.recipeDetails.ttlSeconds': 86400,
  'cache.ingredients.ttlSeconds': 86400,
  'cache.cooking.spoonacular.searchTtlSeconds': 7200,
  'cache.cooking.spoonacular.recipeTtlSeconds': 86400,
  'cache.cooking.spoonacular.byIngredientsTtlSeconds': 3600,
  'cache.cooking.spoonacular.ingredientsTtlSeconds': 86400,
  'cache.cooking.spoonacular.substitutesTtlSeconds': 86400,

  // ==========================================================================
  // JOBS CACHE
  // ==========================================================================
  'cache.jobs.companyEnrichment.ttlSeconds': 86400,
  'cache.glassdoor.companyTtlSeconds': 86400,
  'cache.glassdoor.ratingTtlSeconds': 86400,
  'cache.glassdoor.reviewsTtlSeconds': 43200,
  'cache.glassdoor.salariesTtlSeconds': 86400,
  'cache.glassdoor.interviewsTtlSeconds': 43200,
  'cache.jobs.cvAnalysis.ttlSeconds': 86400,

  // ==========================================================================
  // TRAVEL CACHE
  // ==========================================================================
  'cache.flights.searchTtlSeconds': 900,
  'cache.flights.ttlSeconds': 1800,
  'cache.flights.cheapestTtlSeconds': 1800,
  'cache.locations.ttlSeconds': 86400,
  'cache.routes.ttlSeconds': 3600,
  'cache.flights.popularRoutesTtlSeconds': 3600,

  // ==========================================================================
  // SHOPPING CACHE
  // ==========================================================================
  'cache.products.ttlSeconds': 1800,
  'cache.productDetails.ttlSeconds': 3600,
  'cache.shopping.ebay.searchTtlSeconds': 1800,
  'cache.shopping.amazon.searchTtlSeconds': 1800,
  'cache.shopping.amazon.productTtlSeconds': 3600,
  'cache.shopping.amazon.dealsTtlSeconds': 900,
  'cache.shopping.aliexpress.searchTtlSeconds': 1800,
  'cache.shopping.aliexpress.productTtlSeconds': 3600,
  'cache.shopping.aliexpress.recommendedTtlSeconds': 1800,

  // ==========================================================================
  // LEARNING CACHE
  // ==========================================================================
  'cache.youtube.videosTtlSeconds': 3600,
  'cache.youtube.detailsTtlSeconds': 86400,
  'cache.youtube.searchTtlSeconds': 3600,
  'cache.youtube.channelTtlSeconds': 86400,

  // ==========================================================================
  // PROBLEMS CACHE
  // ==========================================================================
  'cache.leetcode.problemTtlSeconds': 86400,
  'cache.leetcode.listTtlSeconds': 3600,
  'cache.leetcode.curatedListTtlSeconds': 86400,
  'cache.leetcode.tagsTtlSeconds': 86400,

  // ==========================================================================
  // NEWS CACHE
  // ==========================================================================
  'cache.news.configTtlMs': 300000,

  // ==========================================================================
  // INTEGRATIONS CACHE
  // ==========================================================================
  'cache.serpApi.searchTtlSeconds': 3600,
  'cache.serpApi.shoppingTtlSeconds': 1800,

  // ==========================================================================
  // ASSISTANT CACHE
  // ==========================================================================
  'cache.assistant.memory.ttlSeconds': 300,

  // ==========================================================================
  // AUTOCOMPLETE CACHE
  // ==========================================================================
  'cache.autocomplete.userHistoryTtlSeconds': 300,
  'cache.autocomplete.popularSearchesTtlSeconds': 3600,

  // ==========================================================================
  // CORE / INFRASTRUCTURE
  // ==========================================================================
  'cache.memory.ttlSeconds': 300,
  'cache.redis.ttlSeconds': 3600,
  'cache.autocomplete.maxHistory': 100,
  'cache.apiConfig.ttl': 300,
  'cache.externalApi.configTtlSeconds': 300
} as const;
