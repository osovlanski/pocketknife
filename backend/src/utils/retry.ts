/**
 * Retry Utilities
 * 
 * Provides exponential backoff retry logic for API calls and other operations.
 */

import logger from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  
  /** Add random jitter to delay (default: true) */
  jitter?: boolean;
  
  /** Jitter factor (0-1, default: 0.1) */
  jitterFactor?: number;
  
  /** Function to determine if error is retryable */
  isRetryable?: (error: any) => boolean;
  
  /** Callback called before each retry */
  onRetry?: (error: any, attempt: number, delay: number) => void;
  
  /** Operation name for logging */
  operationName?: string;
}

// =============================================================================
// DEFAULT RETRYABLE ERRORS
// =============================================================================

const DEFAULT_RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

const DEFAULT_RETRYABLE_ERROR_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
];

/**
 * Default function to check if an error is retryable
 */
export const isDefaultRetryable = (error: any): boolean => {
  // Network errors
  if (error.code && DEFAULT_RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true;
  }

  // HTTP status codes
  if (error.response?.status && DEFAULT_RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true;
  }

  // Axios network error
  if (error.message === 'Network Error') {
    return true;
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
    return true;
  }

  return false;
};

// =============================================================================
// RETRY FUNCTIONS
// =============================================================================

/**
 * Calculate delay with exponential backoff
 */
export const calculateBackoffDelay = (
  attempt: number,
  options: Pick<RetryOptions, 'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitter' | 'jitterFactor'>
): number => {
  const {
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitter = true,
    jitterFactor = 0.1
  } = options;

  // Calculate base delay with exponential backoff
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  
  // Cap at maximum delay
  delay = Math.min(delay, maxDelayMs);

  // Add jitter to prevent thundering herd
  if (jitter) {
    const jitterRange = delay * jitterFactor;
    delay += (Math.random() * 2 - 1) * jitterRange;
  }

  return Math.round(delay);
};

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    isRetryable = isDefaultRetryable,
    onRetry,
    operationName = 'operation'
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt > maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateBackoffDelay(attempt, options);

      // Call retry callback
      if (onRetry) {
        onRetry(error, attempt, delay);
      } else {
        logger.retry(`${operationName} failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries,
          error: error.message
        });
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for a function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailure: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeMs: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const now = new Date();
      if (this.lastFailure && (now.getTime() - this.lastFailure.getTime()) > this.resetTimeMs) {
        this.state = 'half-open';
      } else {
        if (fallback) return fallback();
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset failures
      if (this.state === 'half-open') {
        this.state = 'closed';
      }
      this.failures = 0;
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = new Date();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.warn('Circuit breaker opened', { failures: this.failures, threshold: this.threshold });
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'closed';
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRateMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<boolean> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  async waitForToken(): Promise<void> {
    while (!(await this.acquire())) {
      await sleep(this.refillRateMs / this.maxTokens);
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillRateMs) * this.maxTokens;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}



