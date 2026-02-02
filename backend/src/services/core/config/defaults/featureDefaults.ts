/**
 * Feature Configuration Defaults
 *
 * Default feature flags, toggles, and rule engine configuration.
 *
 * @module services/core/config/defaults/featureDefaults
 */

export const featureDefaults = {
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
  'ruleEngine.audit.enabled': true
} as const;
