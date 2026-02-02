/**
 * Agent Configuration Defaults
 *
 * Default configuration values for agents (AbstractAgent and specific agent implementations).
 *
 * @module services/core/config/defaults/agentDefaults
 */

export const agentDefaults = {
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
  // ASSISTANT AGENT
  // ==========================================================================
  'assistant.agent.rateLimit': 30,
  'assistant.agent.timeoutMs': 120000,
  'assistant.ai.maxTokens': 4000,
  'assistant.ai.planningMaxTokens': 1000,
  'assistant.ai.responseMaxTokens': 2000,
  'assistant.ai.knowledgeMaxTokens': 2000,
  'assistant.ai.summaryMaxTokens': 500,
  'assistant.workflow.maxSteps': 10,
  'assistant.workflow.maxIterations': 5,
  'assistant.workflow.stepTimeoutMs': 30000,
  'assistant.conversation.maxHistory': 20,
  'assistant.conversation.maxMessagesBeforeSummary': 20,
  'assistant.cache.conversationTtlSeconds': 3600,
  'assistant.cache.memoryTtlSeconds': 86400,
  'assistant.webSearch.enabled': true,
  'assistant.webSearch.timeoutMs': 10000,
  'assistant.webSearch.maxResults': 5,
  'assistant.aggregation.useWebFallback': true,
  'assistant.aggregation.useAIKnowledge': true,
  'assistant.planPreview.keywords': ['order', 'buy', 'purchase', 'delete', 'remove', 'book', 'schedule', 'cancel', 'send', 'transfer', 'pay'],
  'assistant.tools.maxConcurrency': 5,
  'assistant.tools.timeoutMs': 30000,

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
  'news.reddit.subreddits': ['technology', 'worldnews', 'science', 'programming', 'business', 'sports'],
  'news.feed.defaultMaxResults': 20,
  'news.saved.maxResults': 50,
  'news.preferences.minWeightThreshold': 0.4,
  'news.preferences.maxTopicsToUse': 5,
  'news.trends.maxResults': 10,

  // ==========================================================================
  // DIY AGENT
  // ==========================================================================
  'diy.agent.timeoutMs': 120000,
  'diy.agent.generateTimeoutMs': 180000,
  'diy.search.maxResults': 20,
  'diy.ai.maxTokens': 3000,
  'diy.cache.ttlSeconds': 86400,
  'diy.cache.featuredTtlSeconds': 3600,
  'diy.ideas.aiTokens': 800,
  'diy.ideas.featuredTokens': 1500,
  'diy.ideas.inspirationTokens': 500,
  'diy.ideas.featuredCount': 8,
  'diy.images.unsplashBaseUrl': 'https://source.unsplash.com'
} as const;
