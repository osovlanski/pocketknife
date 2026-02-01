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
import {
  withResilience,
  isRetryableError,
  CircuitBreakerError
} from '../../utils/resilience';

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
// ERROR TYPES
// =============================================================================

export class PerplexityError extends Error {
  constructor(
    message: string,
    public readonly errorType: 'auth' | 'rate_limit' | 'network' | 'api' | 'circuit_breaker',
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'PerplexityError';
  }
}

// =============================================================================
// SERVICE
// =============================================================================

class PerplexityService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerResetMs: number;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY?.trim();
    this.baseUrl = configService.get('perplexity.api.baseUrl', 'https://api.perplexity.ai');
    this.timeoutMs = configService.get('perplexity.api.timeoutMs', 30000);
    this.maxRetries = configService.get('perplexity.api.maxRetries', 3);
    this.retryDelayMs = configService.get('perplexity.api.retryDelayMs', 1000);
    this.circuitBreakerThreshold = configService.get('perplexity.circuitBreaker.threshold', 5);
    this.circuitBreakerResetMs = configService.get('perplexity.circuitBreaker.resetMs', 60000);
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
      throw new PerplexityError('Perplexity API key not configured', 'auth');
    }

    const {
      model = configService.get('perplexity.defaultModel', 'sonar') as 'sonar' | 'sonar-pro',
      maxTokens = configService.get('perplexity.maxTokens', 1000),
      temperature = configService.get('perplexity.temperature', 0.2),
      returnCitations = configService.get('perplexity.returnCitations', true),
      returnRelatedQuestions = true
    } = options;

    try {
      logger.search('Perplexity search', { query });

      return await withResilience(
        async () => {
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
              timeout: this.timeoutMs
            }
          );

          const data = response.data;
          const choice = data.choices?.[0];

          if (!choice) {
            throw new PerplexityError('No response from Perplexity', 'api');
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
        },
        {
          name: 'perplexity',
          threshold: this.circuitBreakerThreshold,
          resetTimeMs: this.circuitBreakerResetMs
        },
        {
          maxAttempts: this.maxRetries,
          initialDelayMs: this.retryDelayMs,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryOn: isRetryableError
        }
      );
    } catch (error: any) {
      // Handle specific error types
      if (error instanceof CircuitBreakerError) {
        logger.warn('Perplexity circuit breaker open');
        throw new PerplexityError('Service temporarily unavailable', 'circuit_breaker');
      }

      if (error.response?.status === 401) {
        throw new PerplexityError('Invalid Perplexity API key', 'auth', 401);
      }
      if (error.response?.status === 429) {
        throw new PerplexityError('Perplexity rate limit exceeded', 'rate_limit', 429);
      }

      logger.fail('Perplexity search failed', { error: error.message });
      throw new PerplexityError(error.message, 'network');
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
