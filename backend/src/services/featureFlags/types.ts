/**
 * Feature Flag Types
 * 
 * Defines types for feature flag management with support for:
 * - Simple on/off flags
 * - Percentage rollouts
 * - User targeting
 * - A/B testing variants
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  targetingRules?: TargetingRule[];
  variants?: FeatureVariant[];
  defaultVariant?: string;
  schedule?: FlagSchedule;
  metadata?: FlagMetadata;
}

export interface FeatureVariant {
  key: string;
  name: string;
  description?: string;
  weight: number;          // Percentage weight (0-100)
  payload?: unknown;       // Custom payload for variant
}

export interface TargetingRule {
  id: string;
  name?: string;
  priority: number;        // Lower = higher priority
  conditions: TargetingCondition[];
  variant?: string;        // Override variant for matching users
  percentage?: number;     // Rollout percentage (0-100)
}

export interface TargetingCondition {
  attribute: string;       // User attribute to check (e.g., "email", "userId", "country")
  operator: TargetingOperator;
  value: unknown;
}

export type TargetingOperator =
  | 'eq'                   // Equal
  | 'neq'                  // Not equal
  | 'contains'             // String contains
  | 'starts_with'          // String starts with
  | 'ends_with'            // String ends with
  | 'in'                   // Value in list
  | 'not_in'               // Value not in list
  | 'matches'              // Regex match
  | 'semver_eq'            // Semantic version equal
  | 'semver_gt'            // Semantic version greater than
  | 'semver_lt';           // Semantic version less than

export interface FlagSchedule {
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
}

export interface FlagMetadata {
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
}

// =============================================================================
// EVALUATION TYPES
// =============================================================================

export interface FlagContext {
  userId?: string;
  email?: string;
  attributes?: Record<string, unknown>;
  requestId?: string;
}

export interface FlagEvaluationResult {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  payload?: unknown;
  reason: EvaluationReason;
  metadata?: {
    ruleId?: string;
    percentage?: number;
    cached?: boolean;
  };
}

export type EvaluationReason =
  | 'FLAG_DISABLED'
  | 'FLAG_NOT_FOUND'
  | 'DEFAULT_VARIANT'
  | 'TARGETING_MATCH'
  | 'PERCENTAGE_ROLLOUT'
  | 'SCHEDULED_OFF'
  | 'ERROR';

// =============================================================================
// FLIPT INTEGRATION TYPES
// =============================================================================

export interface FliptConfig {
  url: string;
  namespace?: string;
  apiToken?: string;
}

export interface FliptFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  variants?: FliptVariant[];
  rules?: FliptRule[];
}

export interface FliptVariant {
  key: string;
  name?: string;
  description?: string;
  attachment?: string;    // JSON string payload
}

export interface FliptRule {
  id: string;
  segmentKey: string;
  rank: number;
  distributions?: FliptDistribution[];
}

export interface FliptDistribution {
  variantKey: string;
  rollout: number;
}

