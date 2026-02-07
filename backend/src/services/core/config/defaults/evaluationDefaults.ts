/**
 * Evaluation Configuration Defaults
 *
 * Configuration for the daily quality evaluation system,
 * including AI model settings, thresholds, and rate limits.
 */

export const evaluationDefaults = {
  // ==========================================================================
  // EVALUATION AI SETTINGS
  // ==========================================================================
  'evaluation.ai.model': 'claude-3-5-haiku-latest',
  'evaluation.ai.maxTokens': 500,
  'evaluation.maxResponseLength': 2000,

  // ==========================================================================
  // EVALUATION PIPELINE
  // ==========================================================================
  'evaluation.dailyQuestionCount': 20,
  'evaluation.rateLimitMs': 1000,
  'evaluation.chat.maxTokens': 800,

  // ==========================================================================
  // SYNTHETIC QUESTION GENERATION
  // ==========================================================================
  'evaluation.synthetic.maxTokens': 2000,
  'evaluation.synthetic.count': 5,
  'evaluation.recentQuestionsLimit': 10,

  // ==========================================================================
  // SCORING THRESHOLDS
  // ==========================================================================
  'evaluation.weakCategoryThreshold': 3.5,
  'evaluation.fallbackScore': 3,
} as const;
