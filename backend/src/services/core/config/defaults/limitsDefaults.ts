/**
 * Limits & Page Size Configuration Defaults
 *
 * Default values for result limits, page sizes, max results,
 * and Prisma `take` values used across all services.
 *
 * @module services/core/config/defaults/limitsDefaults
 */

export const limitsDefaults = {
  // ==========================================================================
  // JOBS LIMITS
  // ==========================================================================
  'limits.jobs.scrapers.geektime.maxResults': 50,
  'limits.jobs.scrapers.geektimeInsider.limit': 50,
  'limits.jobs.scrapers.goozali.maxResults': 30,
  'limits.jobs.scrapers.f6s.limit': 30,
  'limits.jobs.scrapers.f6s.maxResults': 30,
  'limits.jobs.apis.arbeitnow.maxResults': 20,
  'limits.jobs.apis.theMuse.maxResults': 20,
  'limits.jobs.apis.himalayas.maxResults': 20,
  'limits.jobs.search.google.maxResults': 20,
  'limits.jobs.search.google.company.maxResults': 20,
  'limits.jobs.search.google.formatted.maxResults': 30,
  'limits.jobs.search.google.startup.maxResults': 20,
  'limits.jobs.search.google.salary.maxResults': 10,
  'limits.jobs.search.google.companies.maxResults': 15,
  'limits.jobs.search.google.salaryJobs.maxResults': 10,
  'limits.jobs.search.google.locations.maxResults': 10,
  'limits.jobs.search.google.topSkills.maxResults': 3,
  'limits.jobs.search.google.topCompanies.maxResults': 5,
  'limits.jobs.matching.experience.maxResults': 2,
  'limits.jobs.matching.matchedSkills.maxResults': 10,
  'limits.jobs.matching.missingSkills.maxResults': 5,
  'limits.jobs.company.jobs.maxResults': 50,
  'limits.jobs.company.crunchbase.limit': 1,
  'limits.jobs.community.startupNation.limit': 20,
  'limits.jobs.community.discord.channels.maxResults': 3,
  'limits.jobs.community.discord.jobs.maxResults': 10,
  'limits.jobs.community.lobsters.maxResults': 15,
  'limits.jobs.israeliJobs.companies.maxResults': 30,
  'limits.jobs.glassdoor.salaries.maxResults': 5,
  'limits.jobs.controller.cv.topSkills.maxResults': 3,
  'limits.jobs.controller.companies.sample.maxResults': 3,
  'limits.jobs.controller.companies.maxResults': 50,

  // ==========================================================================
  // SHOPPING LIMITS
  // ==========================================================================
  'limits.shopping.search.ebay.limit': 15,
  'limits.shopping.search.amazon.limit': 15,
  'limits.shopping.search.aliexpress.limit': 15,
  'limits.shopping.zap.matches.maxResults': 15,
  'limits.shopping.productAggregator.display.maxResults': 20,
  'limits.shopping.productAggregator.search.maxResults': 50,
  'limits.shopping.productAggregator.limit': 10,
  'limits.shopping.israeliShops.search.maxResults': 8,
  'limits.shopping.agent.productPreview.maxResults': 3,
  'limits.shopping.agent.suggestions.maxResults': 3,
  'limits.shopping.agent.dealsDisplay.maxResults': 20,

  // ==========================================================================
  // TRAVEL LIMITS
  // ==========================================================================
  'limits.travel.flights.search.limit': 20,
  'limits.travel.flights.search.maxLimit': 30,
  'limits.travel.flights.locations.limit': 10,
  'limits.travel.flights.search.batch.maxResults': 5,
  'limits.travel.hotels.search.maxResults': 20,
  'limits.travel.hotels.search.reduced.maxResults': 5,
  'limits.travel.hotels.offers.maxResults': 20,
  'limits.travel.deals.best.maxResults': 10,
  'limits.travel.resorts.top.maxResults': 5,
  'limits.travel.packages.flights.maxResults': 5,
  'limits.travel.packages.hotels.maxResults': 5,
  'limits.travel.destinations.suitable.maxResults': 5,
  'limits.travel.destinations.top.maxResults': 3,
  'limits.travel.agent.tripPlans.maxResults': 50,
  'limits.travel.agent.googleSearch.maxResults': 10,

  // ==========================================================================
  // LEARNING LIMITS
  // ==========================================================================
  'limits.learning.googleSearch.limit': 15,
  'limits.learning.devto.maxResults': 10,
  'limits.learning.search.relevant.maxResults': 5,
  'limits.learning.youtube.channels.maxResults': 3,
  'limits.learning.agent.googleSearch.maxResults': 10,
  'limits.learning.agent.savedArticles.maxResults': 100,

  // ==========================================================================
  // PROBLEMS LIMITS
  // ==========================================================================
  'limits.problems.search.maxResults': 20,
  'limits.problems.search.curated.maxResults': 15,
  'limits.problems.search.display.maxResults': 20,
  'limits.problems.search.batch.maxResults': 10,
  'limits.problems.search.filtered.maxResults': 20,
  'limits.problems.search.relevant.maxResults': 10,
  'limits.problems.googleSearch.limit': 50,
  'limits.problems.leetcode.slugs.maxResults': 25,
  'limits.problems.agent.googleSearch.maxResults': 10,
  'limits.problems.agent.solvedProblems.maxResults': 100,
  'limits.problems.controller.companies.maxResults': 10,
  'limits.problems.controller.patterns.maxResults': 5,
  'limits.problems.controller.weakTopics.maxResults': 3,
  'limits.problems.controller.weakProblems.maxResults': 10,

  // ==========================================================================
  // NEWS LIMITS
  // ==========================================================================
  'limits.news.reddit.subreddits.maxResults': 5,
  'limits.news.reddit.search.maxSubreddits': 3,
  'limits.news.trends.maxResults': 10,
  'limits.news.trends.generation.maxResults': 50,
  'limits.news.trends.database.maxResults': 10,
  'limits.news.digest.maxResults': 10,
  'limits.news.digest.articles.maxResults': 5,
  'limits.news.digest.email.maxResults': 5,
  'limits.news.digest.discord.maxResults': 5,
  'limits.news.agent.sources.maxResults': 5,
  'limits.news.agent.personalizedFeed.maxResults': 20,
  'limits.news.agent.trends.maxResults': 50,

  // ==========================================================================
  // COOKING LIMITS
  // ==========================================================================
  'limits.cooking.savedRecipes.maxResults': 10,
  'limits.cooking.lowStockItems.maxResults': 10,
  'limits.cooking.ramiLevy.ingredientLimit': 5,

  // ==========================================================================
  // ASSISTANT LIMITS
  // ==========================================================================
  'limits.assistant.enhanced.suggestions.maxResults': 4,
  'limits.assistant.memory.search.maxResults': 5,
  'limits.assistant.toolCalling.googleSearch.maxResults': 5,

  // ==========================================================================
  // TODO LIMITS
  // ==========================================================================
  'limits.todo.agent.tasks.maxResults': 100,
  'limits.todo.agent.suggestedTasks.maxResults': 5,
  'limits.todo.agent.suggestedRoutines.maxResults': 10,
  'limits.todo.agent.completedTasks.maxResults': 100,

  // ==========================================================================
  // EMAIL LIMITS
  // ==========================================================================
  'limits.email.gmail.unread.maxResults': 100,
  'limits.email.patterns.maxResults': 50,
  'limits.email.patterns.examples.maxResults': 3,

  // ==========================================================================
  // DIY LIMITS
  // ==========================================================================
  'limits.diy.templates.maxResults': 20,

  // ==========================================================================
  // INTEGRATIONS LIMITS
  // ==========================================================================
  'limits.google.search.default.maxResults': 10,
  'limits.google.search.sites.maxResults': 10,
  'limits.weather.api.geocodeLimit': 1,
  'limits.notion.recipes.ingredients.maxResults': 100,
  'limits.meiliSearch.recipes.limit': 20,
  'limits.calendar.events.maxResults': 50,

  // ==========================================================================
  // AUTOCOMPLETE LIMITS
  // ==========================================================================
  'limits.autocomplete.activities.maxResults': 100,
  'limits.autocomplete.results.maxResults': 100,

  // ==========================================================================
  // DELIVERY LIMITS
  // ==========================================================================
  'limits.delivery.grocery.deepLink.maxItems': 5,
} as const;
