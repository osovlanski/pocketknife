/**
 * Assistant Service Validation Schemas
 *
 * Zod schemas for validating JSON data structures used in the assistant services.
 * Ensures type safety and provides meaningful error messages.
 */

import { z } from 'zod';

// =============================================================================
// PLAN SCHEMAS
// =============================================================================

export const PlanStepSchema = z.object({
  tool: z.string().min(1),
  description: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({})
});

export const ExecutionPlanSchema = z.object({
  steps: z.array(PlanStepSchema).default([]),
  explanation: z.string().default('Could not generate explanation'),
  requiresApproval: z.boolean().default(true)
});

export type PlanStepInput = z.infer<typeof PlanStepSchema>;
export type ExecutionPlanInput = z.infer<typeof ExecutionPlanSchema>;

// =============================================================================
// MEMORY ENTITY SCHEMAS
// =============================================================================

export const PersonEntitySchema = z.object({
  name: z.string(),
  relationship: z.string().optional(),
  context: z.string().optional()
});

export const PlaceEntitySchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  context: z.string().optional()
});

export const DateEntitySchema = z.object({
  date: z.string(),
  event: z.string().optional(),
  recurring: z.boolean().optional()
});

export const PreferenceEntitySchema = z.object({
  category: z.string(),
  preference: z.string(),
  confidence: z.number().min(0).max(1).optional()
});

export const ActionItemSchema = z.object({
  task: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

export const ExtractedEntitiesSchema = z.object({
  people: z.array(PersonEntitySchema).default([]),
  places: z.array(PlaceEntitySchema).default([]),
  dates: z.array(DateEntitySchema).default([]),
  preferences: z.array(PreferenceEntitySchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  topics: z.array(z.string()).default([]),
  custom: z.record(z.string(), z.unknown()).default({})
});

export type PersonEntity = z.infer<typeof PersonEntitySchema>;
export type PlaceEntity = z.infer<typeof PlaceEntitySchema>;
export type DateEntity = z.infer<typeof DateEntitySchema>;
export type PreferenceEntity = z.infer<typeof PreferenceEntitySchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

// =============================================================================
// CONVERSATION MEMORY SCHEMA
// =============================================================================

export const ConversationSummarySchema = z.object({
  summary: z.string().min(1),
  entities: ExtractedEntitiesSchema
});

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

// =============================================================================
// TOOL RESULT SCHEMAS
// =============================================================================

export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  errorType: z.string().optional()
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

export const WeatherConditionSchema = z.object({
  id: z.number(),
  main: z.string(),
  description: z.string(),
  icon: z.string()
});

export const CurrentWeatherSchema = z.object({
  location: z.string(),
  country: z.string(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  conditions: z.array(WeatherConditionSchema),
  visibility: z.number(),
  pressure: z.number(),
  sunrise: z.date().or(z.string()),
  sunset: z.date().or(z.string()),
  timezone: z.number()
});

export const PerplexityResponseSchema = z.object({
  id: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({
      content: z.string()
    })
  })),
  citations: z.array(z.string()).optional()
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Safely parse JSON with Zod schema validation
 */
export function safeParseJson<T>(
  jsonString: string,
  schema: z.ZodSchema<T>,
  defaultValue: T
): { success: true; data: T } | { success: false; data: T; error: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      data: defaultValue,
      error: result.error.issues.map(e => `${String(e.path.join('.'))}: ${e.message}`).join(', ')
    };
  } catch (error) {
    return {
      success: false,
      data: defaultValue,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

/**
 * Parse execution plan from Claude response
 */
export function parseExecutionPlan(text: string): ExecutionPlanInput {
  const cleanText = text.replace(/```json|```/g, '').trim();

  const result = safeParseJson(cleanText, ExecutionPlanSchema, {
    steps: [],
    explanation: 'Could not generate a structured plan',
    requiresApproval: false
  });

  return result.data;
}

/**
 * Parse conversation summary from Claude response
 */
export function parseConversationSummary(text: string): ConversationSummary {
  const cleanText = text.replace(/```json|```/g, '').trim();

  const result = safeParseJson(cleanText, ConversationSummarySchema, {
    summary: 'Conversation summary unavailable',
    entities: {
      people: [],
      places: [],
      dates: [],
      preferences: [],
      actionItems: [],
      topics: [],
      custom: {}
    }
  });

  return result.data;
}

/**
 * Parse extracted entities with size limit check
 */
export function parseExtractedEntities(
  jsonString: string,
  maxSizeBytes = 100000
): ExtractedEntities {
  // Size limit check to prevent memory issues
  if (jsonString.length > maxSizeBytes) {
    return {
      people: [],
      places: [],
      dates: [],
      preferences: [],
      actionItems: [],
      topics: [],
      custom: {}
    };
  }

  const result = safeParseJson(jsonString, ExtractedEntitiesSchema, {
    people: [],
    places: [],
    dates: [],
    preferences: [],
    actionItems: [],
    topics: [],
    custom: {}
  });

  return result.data;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(input: string, maxLength = 10000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Truncate if too long
  let sanitized = input.slice(0, maxLength);

  // Remove potential prompt injection patterns
  sanitized = sanitized
    .replace(/\[SYSTEM\]/gi, '[INPUT]')
    .replace(/\[ASSISTANT\]/gi, '[INPUT]')
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .replace(/```system/gi, '```text');

  return sanitized.trim();
}

/**
 * Validate base64 image data
 */
export function validateImageData(
  base64Data: string,
  maxSizeMB = 10
): { valid: boolean; error?: string; sizeBytes?: number } {
  if (!base64Data || typeof base64Data !== 'string') {
    return { valid: false, error: 'Invalid image data' };
  }

  // Remove data URL prefix if present
  const cleanData = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Calculate approximate decoded size (base64 is ~33% larger than binary)
  const sizeBytes = Math.ceil(cleanData.length * 0.75);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `Image too large: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB exceeds ${maxSizeMB}MB limit`,
      sizeBytes
    };
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleanData)) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true, sizeBytes };
}

export default {
  // Schemas
  PlanStepSchema,
  ExecutionPlanSchema,
  ExtractedEntitiesSchema,
  ConversationSummarySchema,
  ToolResultSchema,
  WeatherConditionSchema,
  CurrentWeatherSchema,
  PerplexityResponseSchema,

  // Helpers
  safeParseJson,
  parseExecutionPlan,
  parseConversationSummary,
  parseExtractedEntities,
  sanitizeUserInput,
  validateImageData
};
