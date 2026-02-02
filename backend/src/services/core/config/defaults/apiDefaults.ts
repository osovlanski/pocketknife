/**
 * API Configuration Defaults
 *
 * Default configuration values for API endpoints, external services,
 * and integration configurations.
 *
 * @module services/core/config/defaults/apiDefaults
 */

export const apiDefaults = {
  // ==========================================================================
  // API LIMITS
  // ==========================================================================
  'api.rateLimit.requests': 100,
  'api.rateLimit.windowMs': 60000,
  'api.pagination.defaultLimit': 20,
  'api.pagination.maxLimit': 100,

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
  'ramiLevy.skipCookiesForEcomToken': true,
  'ramiLevy.localOnlyMode': true,

  // ==========================================================================
  // DELIVERY SERVICE
  // ==========================================================================
  'delivery.mock.enabled': true,
  'delivery.mock.baseUrl': 'https://wolt.com',
  'delivery.mock.deliveryFee': 9.90,
  'delivery.defaultProvider': 'mock-wolt',
  'delivery.order.expiryMinutes': 30,
  'delivery.search.maxResults': 5,
  'delivery.wolt.enabled': false,
  'delivery.wolt.apiBaseUrl': 'https://daas-public-api.wolt.com/v1',
  'delivery.wolt.venueId': '',
  'delivery.wolt.merchantId': '',
  'delivery.wolt.minPreparationMinutes': 15,
  'delivery.wolt.defaultParcelType': 'bag',
  'delivery.wolt.timeoutMs': 30000,

  // ==========================================================================
  // PERPLEXITY API
  // ==========================================================================
  'perplexity.enabled': true,
  'perplexity.api.baseUrl': 'https://api.perplexity.ai',
  'perplexity.api.timeoutMs': 30000,
  'perplexity.api.maxRetries': 3,
  'perplexity.api.retryDelayMs': 1000,
  'perplexity.defaultModel': 'sonar',
  'perplexity.maxTokens': 1000,
  'perplexity.temperature': 0.2,
  'perplexity.returnCitations': true,
  'perplexity.circuitBreaker.threshold': 5,
  'perplexity.circuitBreaker.resetMs': 60000,

  // ==========================================================================
  // WEATHER API (OpenWeatherMap)
  // ==========================================================================
  'weather.enabled': true,
  'weather.api.baseUrl': 'https://api.openweathermap.org/data/2.5',
  'weather.api.geoUrl': 'https://api.openweathermap.org/geo/1.0',
  'weather.api.timeoutMs': 10000,
  'weather.api.maxRetries': 3,
  'weather.api.retryDelayMs': 1000,
  'weather.cache.geoTtlSeconds': 604800,
  'weather.cache.currentTtlSeconds': 1800,
  'weather.cache.forecastTtlSeconds': 10800,
  'weather.circuitBreaker.threshold': 5,
  'weather.circuitBreaker.resetMs': 60000,

  // ==========================================================================
  // NEWS API ENDPOINTS
  // ==========================================================================
  'news.api.newsapi.baseUrl': 'https://newsapi.org/v2',
  'news.api.gnews.baseUrl': 'https://gnews.io/api/v4',
  'news.api.hackernews.baseUrl': 'https://hacker-news.firebaseio.com/v0',
  'news.api.reddit.baseUrl': 'https://www.reddit.com',
  'news.api.mediastack.baseUrl': 'http://api.mediastack.com/v1',
  'news.api.lobsters.baseUrl': 'https://lobste.rs',
  'news.api.devto.baseUrl': 'https://dev.to/api',
  'news.api.currentsapi.baseUrl': 'https://api.currentsapi.services/v1',

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
  'google.search.timeoutMs': 10000,

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
  // EXTERNAL API TIMEOUTS
  // ==========================================================================
  'api.default.timeoutMs': 10000,
  'api.longOperation.timeoutMs': 30000,
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

  // ==========================================================================
  // JOB MATCHING WEIGHTS
  // ==========================================================================
  'jobs.matching.skillWeight': 50,
  'jobs.matching.roleBonus': 25,
  'jobs.matching.seniorityBonus': 15,
  'jobs.matching.techIndicatorBonus': 10,
  'jobs.matching.maxScore': 100,
  'jobs.matching.defaultThreshold': 75,
  'jobs.matching.maxMatchedSkills': 10,
  'jobs.matching.maxMissingSkills': 5,

  // ==========================================================================
  // COMPANY SCORING
  // ==========================================================================
  'company.scoring.startupMaxEmployees': 50,
  'company.scoring.midsizeMaxEmployees': 500,
  'company.scoring.baseScore': 50,

  // ==========================================================================
  // PROBLEMS API
  // ==========================================================================
  'problems.codeforces.timeoutMs': 10000,
  'problems.codeforces.url': 'https://codeforces.com/api/problemset.problems',
  'problems.difficulty.thresholds.easy': 1200,
  'problems.difficulty.thresholds.medium': 1800,

  // ==========================================================================
  // LEARNING API
  // ==========================================================================
  'learning.api.timeoutMs': 10000,
  'learning.search.limit': 15,

  // ==========================================================================
  // TRAVEL API
  // ==========================================================================
  'travel.flights.limit': 20,

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  'notifications.telegram.timeoutMs': 5000,
  'notifications.discord.timeoutMs': 5000,
  'notifications.facebook.timeoutMs': 5000,

  // ==========================================================================
  // EXTERNAL URLS
  // ==========================================================================
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
