/**
 * Synthetic Question Generator
 * 
 * Generates new test questions focusing on weak areas identified
 * in previous evaluations. Uses Claude Haiku for cost efficiency.
 */

import Anthropic from '@anthropic-ai/sdk';
import logger from '../../utils/logger';

export interface BenchmarkQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: number;
  expectedAgents: string[];
}

export interface GenerationContext {
  weakCategories: string[];
  currentDifficulty: number;
  recentQuestions: string[];
}

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
   * Generate synthetic test questions
   */
  generateQuestions: async (
    count: number,
    context: GenerationContext
  ): Promise<BenchmarkQuestion[]> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic();

    const prompt = GENERATION_PROMPT
      .replace('{count}', count.toString())
      .replace('{weakCategories}', context.weakCategories.join(', ') || 'general')
      .replace('{difficulty}', context.currentDifficulty.toString())
      .replace('{recentQuestions}', context.recentQuestions.slice(0, 10).join('; ') || 'none');

    try {
      logger.search('Generating synthetic questions', { count, context });

      const result = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = result.content[0].type === 'text' ? result.content[0].text : '';

      // Parse JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in generation response');
      }

      const questions = JSON.parse(jsonMatch[0]) as Array<Omit<BenchmarkQuestion, 'id'>>;

      // Add IDs to questions
      const timestamp = Date.now();
      return questions.map((q, i) => ({
        id: `synthetic-${timestamp}-${i}`,
        question: q.question,
        category: q.category || 'general',
        difficulty: q.difficulty || context.currentDifficulty,
        expectedAgents: q.expectedAgents || []
      }));
    } catch (error: any) {
      logger.fail('Failed to generate questions', { error: error.message });
      return [];
    }
  },

  /**
   * Calculate recommended difficulty based on average score
   */
  calculateDifficulty: (avgScore: number): number => {
    if (avgScore < 2.5) return 1;
    if (avgScore < 3.0) return 2;
    if (avgScore < 3.5) return 3;
    if (avgScore < 4.0) return 4;
    return 5;
  },

  /**
   * Identify weak categories from evaluation results
   */
  identifyWeakCategories: (
    categoryScores: Record<string, number>,
    threshold: number = 3.5
  ): string[] => {
    return Object.entries(categoryScores)
      .filter(([_, score]) => score < threshold)
      .sort((a, b) => a[1] - b[1])
      .map(([category]) => category);
  }
};

export default syntheticGenerator;
