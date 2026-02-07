/**
 * Synthetic Question Generator
 *
 * Generates new test questions focusing on weak areas identified
 * in previous evaluations. Uses Claude Haiku for cost efficiency.
 *
 * Questions are validated at parse time to ensure difficulty is within
 * 1-5 range and categories are known values.
 */

import { generateClaudeMessage, isAnthropicConfigured } from '../../utils/anthropicClient';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import { RawQuestionSchema, toQuestionCategory, toDifficulty } from './types';
import type { BenchmarkQuestion, GenerationContext, Difficulty, QuestionCategory } from './types';

const GENERATION_PROMPT = `Generate {count} diverse test questions for an AI assistant.

Categories to focus on (scored lowest): {weakCategories}
Target difficulty: {difficulty}/5

Agent capabilities:
- Cooking: Recipe search, ingredient suggestions, meal planning
- Jobs: Job search across platforms, salary info, company research
- Travel: Flight/hotel search, trip planning, itinerary creation
- Shopping: Deal finding, price comparison, product research
- Problems: Coding problems from LeetCode, Codeforces
- ToDo: Task management, calendar integration
- Email: Gmail processing, summarization
- Learning: Educational content, tutorials, learning paths

Avoid questions similar to: {recentQuestions}

Return ONLY valid JSON array:
[
  {
    "question": "The question text",
    "category": "category_name",
    "difficulty": 1-5,
    "expectedAgents": ["agent1", "agent2"]
  }
]`;

export const syntheticGenerator = {
  /**
   * Generate synthetic test questions using Claude.
   *
   * Calls Claude Haiku with context about weak areas to produce targeted
   * test questions. Validates all generated questions with Zod schemas.
   * Returns empty array on API failure (logged, not thrown).
   *
   * @param count - Number of questions to generate
   * @param context - Generation context with weak categories, difficulty, and recent questions
   * @returns Array of validated benchmark questions, or empty array on failure
   */
  generateQuestions: async (
    count: number,
    context: GenerationContext
  ): Promise<BenchmarkQuestion[]> => {
    if (!isAnthropicConfigured()) {
      logger.warn('Cannot generate synthetic questions: ANTHROPIC_API_KEY not configured');
      return [];
    }

    const maxTokens = configService.get('evaluation.synthetic.maxTokens', 2000);
    const model = configService.get('evaluation.ai.model', 'claude-3-5-haiku-latest');
    const recentLimit = configService.get('evaluation.recentQuestionsLimit', 10);

    const prompt = GENERATION_PROMPT
      .replace('{count}', count.toString())
      .replace('{weakCategories}', context.weakCategories.join(', ') || 'general')
      .replace('{difficulty}', context.currentDifficulty.toString())
      .replace('{recentQuestions}', context.recentQuestions.slice(0, recentLimit).join('; ') || 'none');

    try {
      logger.search('Generating synthetic questions', { count, weakCategories: context.weakCategories });

      const text = await generateClaudeMessage(prompt, { model, maxTokens });

      if (!text) {
        throw new Error('Claude returned empty response');
      }

      // Parse JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in generation response');
      }

      const rawQuestions = JSON.parse(jsonMatch[0]) as unknown[];

      // Validate each question with Zod and map to typed BenchmarkQuestion
      const timestamp = Date.now();
      const validQuestions: BenchmarkQuestion[] = [];

      for (let i = 0; i < rawQuestions.length; i++) {
        const parsed = RawQuestionSchema.safeParse(rawQuestions[i]);
        if (parsed.success) {
          validQuestions.push({
            id: `synthetic-${timestamp}-${i}`,
            question: parsed.data.question,
            category: toQuestionCategory(parsed.data.category),
            difficulty: parsed.data.difficulty,
            expectedAgents: parsed.data.expectedAgents
          });
        } else {
          logger.warn('Skipping invalid generated question', { index: i, errors: parsed.error.issues });
        }
      }

      logger.success('Generated synthetic questions', { requested: count, valid: validQuestions.length });
      return validQuestions;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.fail('Failed to generate questions', { error: message });
      return [];
    }
  },

  /**
   * Calculate recommended difficulty level based on average evaluation score.
   *
   * Lower scores produce easier questions to build confidence;
   * higher scores produce harder questions to challenge the assistant.
   *
   * @param avgScore - Average overall score from previous evaluations (0-5)
   * @returns Recommended difficulty level (1-5)
   */
  calculateDifficulty: (avgScore: number): Difficulty => {
    if (avgScore < 2.5) return 1;
    if (avgScore < 3.0) return 2;
    if (avgScore < 3.5) return 3;
    if (avgScore < 4.0) return 4;
    return 5;
  },

  /**
   * Identify categories scoring below the weakness threshold.
   *
   * @param categoryScores - Map of category names to average scores
   * @param threshold - Score below which a category is considered weak (default: 3.5, i.e. 70%)
   * @returns Array of weak category names, sorted from weakest to strongest
   */
  identifyWeakCategories: (
    categoryScores: Record<string, number>,
    threshold?: number
  ): QuestionCategory[] => {
    const weakThreshold = threshold ?? (configService.get('evaluation.weakCategoryThreshold', 3.5) as number);

    return Object.entries(categoryScores)
      .filter(([_, score]) => score < weakThreshold)
      .sort((a, b) => a[1] - b[1])
      .map(([category]) => toQuestionCategory(category));
  }
};

export default syntheticGenerator;
