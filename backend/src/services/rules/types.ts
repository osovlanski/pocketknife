/**
 * Rule Engine Types
 * 
 * Defines the structure for business rules that can be managed dynamically.
 * Rules are evaluated at runtime and can be modified without code deployment.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type RuleCategory = 
  | 'agent_config'      // Agent-specific configurations
  | 'scoring'           // Scoring algorithms (deal scores, match scores)
  | 'filtering'         // Content filtering rules
  | 'validation'        // Input validation rules
  | 'notification'      // Notification triggers
  | 'scheduling'        // Scheduling rules
  | 'pricing'           // Price-related rules
  | 'access_control'    // Permission and access rules
  | 'rate_limiting'     // Rate limiting rules
  | 'custom';           // Custom business rules

export type RuleOperator = 
  | 'eq'                // Equal
  | 'neq'               // Not equal
  | 'gt'                // Greater than
  | 'gte'               // Greater than or equal
  | 'lt'                // Less than
  | 'lte'               // Less than or equal
  | 'in'                // Value in array
  | 'nin'               // Value not in array
  | 'contains'          // String/array contains
  | 'not_contains'      // String/array does not contain
  | 'starts_with'       // String starts with
  | 'ends_with'         // String ends with
  | 'matches'           // Regex match
  | 'between'           // Value between two values
  | 'exists'            // Property exists
  | 'not_exists'        // Property does not exist
  | 'is_empty'          // Value is empty/null/undefined
  | 'is_not_empty';     // Value is not empty

export type LogicalOperator = 'and' | 'or';

export type RuleActionType = 
  | 'set_value'         // Set a value
  | 'multiply'          // Multiply a value
  | 'add'               // Add to a value
  | 'filter'            // Filter items
  | 'sort'              // Sort items
  | 'limit'             // Limit items
  | 'transform'         // Transform data
  | 'notify'            // Send notification
  | 'log'               // Log action
  | 'abort'             // Stop processing
  | 'skip'              // Skip current item
  | 'custom';           // Custom action

// =============================================================================
// CONDITION TYPES
// =============================================================================

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
  caseSensitive?: boolean;
}

export interface RuleConditionGroup {
  operator: LogicalOperator;
  conditions: (RuleCondition | RuleConditionGroup)[];
}

// =============================================================================
// ACTION TYPES
// =============================================================================

export interface RuleAction {
  type: RuleActionType;
  target?: string;          // Target field/property
  value?: unknown;          // Value to set/use
  params?: Record<string, unknown>;  // Additional parameters
}

// =============================================================================
// RULE DEFINITION
// =============================================================================

export interface Rule {
  id: string;
  name: string;
  description?: string;
  category: RuleCategory;
  priority: number;         // Lower = higher priority
  enabled: boolean;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  metadata?: {
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
    tags?: string[];
  };
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    daysOfWeek?: number[];  // 0-6, where 0 is Sunday
    timezone?: string;
  };
}

// =============================================================================
// EVALUATION TYPES
// =============================================================================

export interface RuleContext {
  userId?: string;
  agentId?: string;
  action?: string;
  timestamp?: Date;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  executedActions: RuleAction[];
  modifications?: Record<string, unknown>;
  duration: number;
  error?: string;
}

export interface RuleEngineResult {
  evaluated: number;
  matched: number;
  results: RuleEvaluationResult[];
  finalContext: RuleContext;
  duration: number;
  errors: string[];
}

// =============================================================================
// RULE SET (GROUPED RULES)
// =============================================================================

export interface RuleSet {
  id: string;
  name: string;
  description?: string;
  category: RuleCategory;
  rules: Rule[];
  defaultAction?: RuleAction;
  stopOnFirstMatch?: boolean;
  enabled: boolean;
}

// =============================================================================
// PREDEFINED RULE TEMPLATES
// =============================================================================

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  templateConditions: Partial<RuleConditionGroup>;
  templateActions: Partial<RuleAction>[];
  requiredParams: string[];
  optionalParams?: string[];
}

// =============================================================================
// AUDIT TYPES
// =============================================================================

export interface RuleAuditLog {
  id: string;
  ruleId: string;
  ruleName: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable' | 'evaluate';
  userId?: string;
  timestamp: Date;
  previousState?: Partial<Rule>;
  newState?: Partial<Rule>;
  context?: Record<string, unknown>;
  result?: RuleEvaluationResult;
}

