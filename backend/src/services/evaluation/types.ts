/**
 * Evaluation Types
 *
 * Shared types for the quality evaluation system.
 * Uses constrained types to enforce domain invariants at compile time.
 */

import { z } from 'zod';

// =============================================================================
// CONSTRAINED VALUE TYPES
// =============================================================================

/** Valid score range: integer 0-5 as returned by Claude evaluator */
export type ScoreValue = 0 | 1 | 2 | 3 | 4 | 5;

/** Valid difficulty level for benchmark questions */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Known agent categories in the Pocketknife platform */
export type QuestionCategory =
  | 'general'
  | 'cooking'
  | 'jobs'
  | 'travel'
  | 'learning'
  | 'shopping'
  | 'problems'
  | 'todo'
  | 'email'
  | 'multi-agent';

/** Known agent identifiers */
export type AgentType =
  | 'cooking'
  | 'jobs'
  | 'travel'
  | 'learning'
  | 'shopping'
  | 'problems'
  | 'todo'
  | 'email';

// =============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// =============================================================================

/** Clamps a numeric value to the 0-5 score range */
const scoreSchema = z.number().min(0).max(5).transform(v => Math.round(v) as ScoreValue);

/** Schema for validating LLM evaluation output */
export const RawScoresSchema = z.object({
  accuracy: scoreSchema,
  helpfulness: scoreSchema,
  completeness: scoreSchema,
  clarity: scoreSchema,
  safety: scoreSchema,
  agentUsage: scoreSchema.nullable().optional(),
  feedback: z.string().optional().default('')
});

export type RawScores = z.infer<typeof RawScoresSchema>;

/** Schema for validating LLM-generated benchmark questions */
export const RawQuestionSchema = z.object({
  question: z.string(),
  category: z.string().default('general'),
  difficulty: z.number().min(1).max(5).transform(v => Math.round(v) as Difficulty),
  expectedAgents: z.array(z.string()).default([])
});

// =============================================================================
// DOMAIN INTERFACES
// =============================================================================

/** Evaluation scores with an explicit error flag to distinguish failures from real data */
export interface EvaluationScores {
  accuracy: number;
  helpfulness: number;
  completeness: number;
  clarity: number;
  safety: number;
  agentUsage: number | null;
  overall: number;
  feedback: string;
  /** True when evaluation failed and scores are not real data */
  isError: boolean;
}

/**
 * Result of evaluating a single question/response pair.
 * Category is constrained to known values to prevent typo-based bucket splits.
 */
export interface EvaluationResult {
  questionId: string;
  question: string;
  category: QuestionCategory;
  response: string;
  scores: EvaluationScores;
  evaluatedAt: Date;
}

/** A benchmark question used for quality evaluation */
export interface BenchmarkQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  expectedAgents: string[];
}

/** Context for synthetic question generation */
export interface GenerationContext {
  weakCategories: QuestionCategory[];
  currentDifficulty: Difficulty;
  recentQuestions: string[];
}

/** Structure of the benchmark-questions.json file */
export interface BenchmarkFile {
  version: string;
  description: string;
  questions: BenchmarkQuestion[];
}

/** Result of executing a chat for evaluation */
export interface ChatExecutionResult {
  response: string;
  agentsUsed: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Clamp a value to the 0-5 score range */
export const clampScore = (value: unknown): number => {
  const num = typeof value === 'number' ? value : 3;
  return Math.max(0, Math.min(5, num));
};

/** Compute overall score from dimension scores */
export const computeOverall = (scores: {
  accuracy: number;
  helpfulness: number;
  completeness: number;
  clarity: number;
  safety: number;
  agentUsage: number | null;
}): number => {
  const dimensions = [
    scores.accuracy,
    scores.helpfulness,
    scores.completeness,
    scores.clarity,
    scores.safety
  ];

  if (scores.agentUsage !== null) {
    dimensions.push(scores.agentUsage);
  }

  return dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
};

/** Validate that a string is a known category, or default to 'general' */
export const toQuestionCategory = (value: string): QuestionCategory => {
  const valid: QuestionCategory[] = [
    'general', 'cooking', 'jobs', 'travel', 'learning',
    'shopping', 'problems', 'todo', 'email', 'multi-agent'
  ];
  return valid.includes(value as QuestionCategory) ? (value as QuestionCategory) : 'general';
};

/** Validate difficulty, clamping to 1-5 range */
export const toDifficulty = (value: number): Difficulty => {
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return clamped as Difficulty;
};
