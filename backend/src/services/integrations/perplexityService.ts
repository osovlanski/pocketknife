/**
 * Perplexity API Service
 *
 * Provides enhanced web search with AI-powered summarization and citations.
 * Alternative to Google Custom Search with no quota limits.
 *
 * API Documentation: https://docs.perplexity.ai/
 */

import axios from 'axios';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface PerplexitySearchResult {
  answer: string;
  citations: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  followUpQuestions?: string[];
}

export interface PerplexityOptions {
  model?: 'sonar' | 'sonar-pro';
  maxTokens?: number;
  temperature?: number;
  returnCitations?: boolean;
  returnRelatedQuestions?: boolean;
}

// =============================================================================
// SERVICE
// =============================================================================

class PerplexityService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY?.trim();
  }

  /**
   * Check if Perplexity API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search the web using Perplexity's Sonar model
   */
  async search(
    query: string,
    options: PerplexityOptions = {}
  ): Promise<PerplexitySearchResult> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const {
      model = 'sonar',
      maxTokens = 1000,
      temperature = 0.2,
      returnCitations = true,
      returnRelatedQuestions = true
    } = options;

    try {
      logger.search('Perplexity search', { query });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: model === 'sonar-pro' ? 'sonar-pro' : 'sonar',
          messages: [
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: maxTokens,
          temperature,
          return_citations: returnCitations,
          return_related_questions: returnRelatedQuestions
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data;
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error('No response from Perplexity');
      }

      // Extract citations from the response
      const citations: string[] = data.citations || [];
      const sources = citations.map((url: string, index: number) => ({
        title: `Source ${index + 1}`,
        url,
        snippet: ''
      }));

      const result: PerplexitySearchResult = {
        answer: choice.message?.content || '',
        citations,
        sources,
        followUpQuestions: data.related_questions || []
      };

      logger.success('Perplexity search completed', {
        citationCount: citations.length
      });

      return result;
    } catch (error: any) {
      logger.fail('Perplexity search failed', { error: error.message });

      if (error.response?.status === 401) {
        throw new Error('Invalid Perplexity API key');
      }
      if (error.response?.status === 429) {
        throw new Error('Perplexity rate limit exceeded');
      }

      throw error;
    }
  }

  /**
   * Get a comprehensive answer to a question with sources
   */
  async answer(
    question: string,
    context?: string
  ): Promise<PerplexitySearchResult> {
    const prompt = context
      ? `Context: ${context}\n\nQuestion: ${question}`
      : question;

    return this.search(prompt, {
      model: 'sonar-pro',
      maxTokens: 2000,
      returnCitations: true
    });
  }

  /**
   * Summarize a topic with web sources
   */
  async summarizeTopic(topic: string): Promise<PerplexitySearchResult> {
    const prompt = `Provide a comprehensive summary of: ${topic}. Include key facts, recent developments, and relevant context.`;

    return this.search(prompt, {
      model: 'sonar',
      maxTokens: 1500
    });
  }

  /**
   * Search for product information and reviews
   */
  async searchProducts(productQuery: string): Promise<PerplexitySearchResult> {
    const prompt = `Find the best ${productQuery}. Include pricing, features, pros/cons, and where to buy.`;

    return this.search(prompt, {
      model: 'sonar',
      maxTokens: 1500
    });
  }

  /**
   * Get recipe information
   */
  async searchRecipes(query: string): Promise<PerplexitySearchResult> {
    const prompt = `Find a recipe for ${query}. Include ingredients list, step-by-step instructions, cooking time, and tips.`;

    return this.search(prompt, {
      model: 'sonar',
      maxTokens: 2000
    });
  }

  /**
   * Get travel information
   */
  async searchTravel(destination: string): Promise<PerplexitySearchResult> {
    const prompt = `Travel guide for ${destination}. Include best time to visit, top attractions, local food, transportation tips, and accommodation recommendations.`;

    return this.search(prompt, {
      model: 'sonar-pro',
      maxTokens: 2000
    });
  }
}

export const perplexityService = new PerplexityService();
export default perplexityService;
