/**
 * Circuit Breaker Registry
 *
 * Provides a centralized registry for circuit breakers, ensuring
 * each external service has a single, shared circuit breaker instance.
 *
 * This prevents multiple instances of the same agent from creating
 * separate circuit breakers for the same service, which would defeat
 * the purpose of the circuit breaker pattern.
 */

import { CircuitBreaker } from './retry';
import logger from './logger';

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  threshold?: number;
  /** Time in ms before attempting to close circuit (default: 60000) */
  resetTimeMs?: number;
}

interface CircuitBreakerEntry {
  breaker: CircuitBreaker;
  options: Required<CircuitBreakerOptions>;
  createdAt: Date;
}

/**
 * Shared registry for circuit breakers keyed by service name
 */
class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreakerEntry> = new Map();

  // Default options
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    threshold: 5,
    resetTimeMs: 60000
  };

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker for a service.
   *
   * If a breaker already exists for the service, returns the existing instance.
   * Options are only applied when creating a new breaker.
   *
   * @param service - Unique identifier for the external service (e.g., 'leetcode-api', 'anthropic-api')
   * @param options - Optional configuration (only used when creating new breaker)
   */
  getBreaker(service: string, options?: CircuitBreakerOptions): CircuitBreaker {
    const existing = this.breakers.get(service);
    if (existing) {
      return existing.breaker;
    }

    // Create new breaker with merged options
    const mergedOptions: Required<CircuitBreakerOptions> = {
      ...this.defaultOptions,
      ...options
    };

    const breaker = new CircuitBreaker(
      mergedOptions.threshold,
      mergedOptions.resetTimeMs
    );

    this.breakers.set(service, {
      breaker,
      options: mergedOptions,
      createdAt: new Date()
    });

    logger.debug('Circuit breaker created', {
      service,
      threshold: mergedOptions.threshold,
      resetTimeMs: mergedOptions.resetTimeMs
    });

    return breaker;
  }

  /**
   * Check if a circuit breaker exists for a service
   */
  hasBreaker(service: string): boolean {
    return this.breakers.has(service);
  }

  /**
   * Get the state of a specific circuit breaker
   */
  getState(service: string): 'closed' | 'open' | 'half-open' | 'not-found' {
    const entry = this.breakers.get(service);
    if (!entry) {
      return 'not-found';
    }
    return entry.breaker.getState();
  }

  /**
   * Reset a specific circuit breaker
   */
  resetBreaker(service: string): boolean {
    const entry = this.breakers.get(service);
    if (!entry) {
      return false;
    }
    entry.breaker.reset();
    logger.info('Circuit breaker reset', { service });
    return true;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const [service, entry] of this.breakers) {
      entry.breaker.reset();
    }
    logger.info('All circuit breakers reset', { count: this.breakers.size });
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus(): Record<string, {
    state: 'closed' | 'open' | 'half-open';
    threshold: number;
    resetTimeMs: number;
    createdAt: Date;
  }> {
    const status: Record<string, {
      state: 'closed' | 'open' | 'half-open';
      threshold: number;
      resetTimeMs: number;
      createdAt: Date;
    }> = {};

    for (const [service, entry] of this.breakers) {
      status[service] = {
        state: entry.breaker.getState(),
        threshold: entry.options.threshold,
        resetTimeMs: entry.options.resetTimeMs,
        createdAt: entry.createdAt
      };
    }

    return status;
  }

  /**
   * Remove a circuit breaker (rarely needed, mainly for testing)
   */
  removeBreaker(service: string): boolean {
    return this.breakers.delete(service);
  }

  /**
   * Clear all circuit breakers (mainly for testing)
   */
  clear(): void {
    this.breakers.clear();
  }
}

// Export singleton instance
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();

// Export well-known service names for consistency
export const CircuitBreakerServices = {
  // AI APIs
  ANTHROPIC_API: 'anthropic-api',
  OPENAI_API: 'openai-api',

  // Problem solving
  LEETCODE_API: 'leetcode-api',
  CODEFORCES_API: 'codeforces-api',
  JUDGE0_API: 'judge0-api',

  // Jobs
  ADZUNA_API: 'adzuna-api',
  GLASSDOOR_API: 'glassdoor-api',

  // Travel
  AMADEUS_API: 'amadeus-api',

  // Shopping
  EBAY_API: 'ebay-api',
  ALIEXPRESS_API: 'aliexpress-api',
  AMAZON_API: 'amazon-api',

  // Cooking
  RAMI_LEVY_API: 'rami-levy-api',
  SPOONACULAR_API: 'spoonacular-api',

  // External services
  GOOGLE_CSE: 'google-cse',
  GOOGLE_OAUTH: 'google-oauth',
  SERP_API: 'serp-api',
  TELEGRAM_API: 'telegram-api',
  DISCORD_API: 'discord-api'
} as const;

export type CircuitBreakerService = typeof CircuitBreakerServices[keyof typeof CircuitBreakerServices];
