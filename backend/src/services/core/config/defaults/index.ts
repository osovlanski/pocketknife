/**
 * Configuration Defaults Index
 *
 * Centralizes all default configuration values organized by category.
 * These defaults are used by configService when no value is set in
 * environment variables or database.
 *
 * To add new configuration:
 * 1. Add to the appropriate category file (or create new one)
 * 2. Re-export from this index
 * 3. configService will automatically pick it up
 *
 * @module services/core/config/defaults
 */

import { agentDefaults } from './agentDefaults';
import { apiDefaults } from './apiDefaults';
import { cacheDefaults } from './cacheDefaults';
import { featureDefaults } from './featureDefaults';

// Combine all defaults into a single object
export const DEFAULT_CONFIG = {
  ...agentDefaults,
  ...apiDefaults,
  ...cacheDefaults,
  ...featureDefaults
} as const;

export type ConfigKey = keyof typeof DEFAULT_CONFIG;
export type ConfigValue = typeof DEFAULT_CONFIG[ConfigKey];

// Re-export individual categories for type-safe access
export { agentDefaults } from './agentDefaults';
export { apiDefaults } from './apiDefaults';
export { cacheDefaults } from './cacheDefaults';
export { featureDefaults } from './featureDefaults';
