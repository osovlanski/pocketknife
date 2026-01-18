/**
 * Shared Constants & Derived Types
 * 
 * This file contains all constant arrays with derived TypeScript types.
 * These constants are used across the backend and should mirror frontend constants
 * for type safety and consistency.
 * 
 * Pattern: Define constant array with `as const`, then derive type from it.
 */

// =============================================================================
// DIY AGENT
// =============================================================================

export const DIY_CATEGORIES = [
  'home_improvement', 'electronics', 'crafts', 'automotive', 'gardening',
  'furniture', 'plumbing', 'electrical', 'painting', 'flooring',
  'woodworking', 'metalworking', 'sewing', 'jewelry'
] as const;

/** Type-safe DIY category ID */
export type DIYCategoryId = typeof DIY_CATEGORIES[number];

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

/** Type-safe skill level ID */
export type SkillLevelId = typeof SKILL_LEVELS[number];

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'expert'] as const;

/** Type-safe difficulty level */
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// =============================================================================
// COOKING AGENT
// =============================================================================

export const COOKING_CATEGORIES = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'pantry', 'frozen',
  'beverages', 'snacks', 'condiments', 'spices', 'household', 'personal_care', 'other'
] as const;

/** Type-safe cooking category */
export type CookingCategoryId = typeof COOKING_CATEGORIES[number];

export const UNITS = [
  'pcs', 'pack', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'cup', 'tbsp', 'tsp', 'dozen'
] as const;

/** Type-safe unit type */
export type UnitType = typeof UNITS[number];

// =============================================================================
// NEWS AGENT
// =============================================================================

export const NEWS_TOPICS = [
  'tech', 'business', 'politics', 'sports', 'science', 'health', 'entertainment', 'money'
] as const;

/** Type-safe news topic ID */
export type NewsTopicId = typeof NEWS_TOPICS[number];

export const NEWS_SOURCES = [
  'hackernews', 'reddit', 'newsapi', 'gnews', 'mediastack', 'currents', 'lobsters', 'devto'
] as const;

/** Type-safe news source ID */
export type NewsSourceId = typeof NEWS_SOURCES[number];

// =============================================================================
// SHOPPING AGENT
// =============================================================================

export const SHOPPING_SOURCES = [
  'ebay', 'amazon', 'aliexpress', 'israeli_shops', 'zap', 'ksp', 'ivory', 'bug'
] as const;

/** Type-safe shopping source */
export type ShoppingSource = typeof SHOPPING_SOURCES[number];

export const INTEREST_TYPES = ['hobby', 'category', 'brand', 'keyword'] as const;

/** Type-safe interest type */
export type InterestType = typeof INTEREST_TYPES[number];

// =============================================================================
// PROBLEM SOLVING AGENT
// =============================================================================

export const PROBLEM_CATEGORIES = [
  'array', 'string', 'tree', 'graph', 'dp', 'math', 'design', 'binary', 'linkedlist', 'stack'
] as const;

/** Type-safe problem category */
export type ProblemCategory = typeof PROBLEM_CATEGORIES[number];

export const PROBLEM_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

/** Type-safe problem difficulty */
export type ProblemDifficulty = typeof PROBLEM_DIFFICULTIES[number];

export const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'typescript', 'cpp', 'go'] as const;

/** Type-safe programming language */
export type ProgrammingLanguage = typeof SUPPORTED_LANGUAGES[number];

// =============================================================================
// TRAVEL AGENT
// =============================================================================

export const PRICE_LEVELS = ['budget', 'mid', 'premium'] as const;

/** Type-safe price level */
export type PriceLevel = typeof PRICE_LEVELS[number];

export const SKI_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

/** Type-safe ski skill level */
export type SkiSkillLevel = typeof SKI_SKILL_LEVELS[number];

export const HIKING_DIFFICULTIES = ['easy', 'moderate', 'challenging', 'expert'] as const;

/** Type-safe hiking difficulty */
export type HikingDifficulty = typeof HIKING_DIFFICULTIES[number];

export const BEACH_TYPES = ['mediterranean', 'red_sea', 'dead_sea', 'kineret'] as const;

/** Type-safe beach type */
export type BeachType = typeof BEACH_TYPES[number];

export const ISRAEL_REGIONS = ['north', 'center', 'jerusalem', 'dead_sea', 'negev', 'eilat'] as const;

/** Type-safe Israel region */
export type IsraelRegion = typeof ISRAEL_REGIONS[number];

export const ISRAEL_ACTIVITY_TYPES = [
  'beaches', 'hiking', 'historical', 'religious', 'nature',
  'food_wine', 'wellness', 'adventure', 'family', 'nightlife', 'art_culture'
] as const;

/** Type-safe Israel activity type */
export type IsraelActivityType = typeof ISRAEL_ACTIVITY_TYPES[number];

export const TRIP_DURATIONS = ['day_trip', 'weekend', 'extended'] as const;

/** Type-safe trip duration */
export type TripDuration = typeof TRIP_DURATIONS[number];

export const BUDGET_LEVELS = ['budget', 'moderate', 'luxury'] as const;

/** Type-safe budget level */
export type BudgetLevel = typeof BUDGET_LEVELS[number];

