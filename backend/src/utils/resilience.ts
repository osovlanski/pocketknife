/**
 * Resilience Utilities
 *
 * Provides circuit breaker, retry logic, and concurrency control
 * for robust external API calls.
 */

import logger from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CircuitBreakerOptions {
  threshold: number;       // Number of failures before opening
  resetTimeMs: number;     // Time before attempting to close
  name: string;           // Identifier for logging
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryOn?: (error: Error) => boolean;
}

export interface ConcurrencyOptions {
  maxConcurrent: number;
  timeoutMs?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

const circuitStates = new Map<string, CircuitBreakerState>();

export function getCircuitState(name: string): CircuitBreakerState {
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      successCount: 0
    });
  }
  return circuitStates.get(name)!;
}

export function resetCircuit(name: string): void {
  circuitStates.set(name, {
    state: 'closed',
    failures: 0,
    lastFailureTime: 0,
    successCount: 0
  });
  logger.info('Circuit breaker reset', { name });
}

export class CircuitBreakerError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is open - service unavailable`);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: CircuitBreakerOptions
): Promise<T> {
  const state = getCircuitState(options.name);

  // Check if circuit is open
  if (state.state === 'open') {
    const timeSinceFailure = Date.now() - state.lastFailureTime;

    if (timeSinceFailure >= options.resetTimeMs) {
      // Attempt to half-open
      state.state = 'half-open';
      state.successCount = 0;
      logger.info('Circuit breaker half-open', { name: options.name });
    } else {
      throw new CircuitBreakerError(options.name);
    }
  }

  try {
    const result = await fn();

    // Success - update state
    if (state.state === 'half-open') {
      state.successCount++;
      // After 2 successes in half-open, close the circuit
      if (state.successCount >= 2) {
        state.state = 'closed';
        state.failures = 0;
        logger.success('Circuit breaker closed', { name: options.name });
      }
    } else {
      state.failures = 0;
    }

    return result;
  } catch (error) {
    // Failure - update state
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.state === 'half-open' || state.failures >= options.threshold) {
      state.state = 'open';
      logger.warn('Circuit breaker opened', {
        name: options.name,
        failures: state.failures
      });
    }

    throw error;
  }
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  let delay = options.initialDelayMs;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (options.retryOn && !options.retryOn(lastError)) {
        throw lastError;
      }

      if (attempt < options.maxAttempts) {
        logger.debug('Retrying operation', {
          attempt,
          maxAttempts: options.maxAttempts,
          delayMs: delay,
          error: lastError.message
        });

        await sleep(delay);
        delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
      }
    }
  }

  throw new RetryError(options.maxAttempts, lastError);
}

/**
 * Combine circuit breaker and retry logic
 */
export async function withResilience<T>(
  fn: () => Promise<T>,
  circuitOptions: CircuitBreakerOptions,
  retryOptions: RetryOptions
): Promise<T> {
  return withCircuitBreaker(
    () => withRetry(fn, retryOptions),
    circuitOptions
  );
}

// =============================================================================
// CONCURRENCY CONTROL
// =============================================================================

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class Semaphore {
  private running = 0;
  private queue: QueuedTask<unknown>[] = [];

  constructor(private readonly maxConcurrent: number) {}

  async acquire<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = { fn, resolve, reject };

      if (timeoutMs) {
        const timeoutId = setTimeout(() => {
          const index = this.queue.indexOf(task as QueuedTask<unknown>);
          if (index > -1) {
            this.queue.splice(index, 1);
            reject(new Error(`Task timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);

        const originalResolve = resolve;
        const originalReject = reject;

        task.resolve = (value: T) => {
          clearTimeout(timeoutId);
          originalResolve(value);
        };
        task.reject = (error: Error) => {
          clearTimeout(timeoutId);
          originalReject(error);
        };
      }

      this.queue.push(task as QueuedTask<unknown>);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }
}

const semaphores = new Map<string, Semaphore>();

/**
 * Get or create a semaphore for concurrency control
 */
export function getSemaphore(name: string, maxConcurrent: number): Semaphore {
  if (!semaphores.has(name)) {
    semaphores.set(name, new Semaphore(maxConcurrent));
  }
  return semaphores.get(name)!;
}

/**
 * Execute multiple promises with concurrency limit
 */
export async function withConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurrencyOptions
): Promise<T[]> {
  const semaphore = new Semaphore(options.maxConcurrent);

  return Promise.all(
    tasks.map(task => semaphore.acquire(task, options.timeoutMs))
  );
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (network errors, 5xx, etc.)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')) {
    return true;
  }

  // Rate limiting
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  // Server errors (5xx)
  if (message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')) {
    return true;
  }

  return false;
}

export default {
  withCircuitBreaker,
  withRetry,
  withResilience,
  withConcurrencyLimit,
  withTimeout,
  getCircuitState,
  resetCircuit,
  getSemaphore,
  isRetryableError,
  CircuitBreakerError,
  RetryError
};
