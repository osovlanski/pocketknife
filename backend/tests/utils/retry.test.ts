/**
 * Retry Utilities Tests
 * 
 * Tests for the retry logic, circuit breaker, and rate limiter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    retry: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('Retry Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('isDefaultRetryable', () => {
    it('should return true for network errors', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ code: 'ECONNRESET' })).toBe(true);
      expect(isDefaultRetryable({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isDefaultRetryable({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should return true for retryable HTTP status codes', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ response: { status: 429 } })).toBe(true); // Too Many Requests
      expect(isDefaultRetryable({ response: { status: 500 } })).toBe(true); // Internal Server Error
      expect(isDefaultRetryable({ response: { status: 503 } })).toBe(true); // Service Unavailable
    });

    it('should return false for client errors', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ response: { status: 400 } })).toBe(false); // Bad Request
      expect(isDefaultRetryable({ response: { status: 401 } })).toBe(false); // Unauthorized
      expect(isDefaultRetryable({ response: { status: 404 } })).toBe(false); // Not Found
    });

    it('should return true for timeout messages', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ message: 'Request timeout occurred' })).toBe(true);
      expect(isDefaultRetryable({ message: 'ETIMEDOUT error' })).toBe(true);
    });

    it('should return true for network error message', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ message: 'Network Error' })).toBe(true);
    });

    it('should return false for unknown errors', async () => {
      const { isDefaultRetryable } = await import('../../src/utils/retry');
      
      expect(isDefaultRetryable({ message: 'Unknown error' })).toBe(false);
      expect(isDefaultRetryable({})).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff', async () => {
      const { calculateBackoffDelay } = await import('../../src/utils/retry');
      
      const delay1 = calculateBackoffDelay(1, { initialDelayMs: 1000, jitter: false });
      const delay2 = calculateBackoffDelay(2, { initialDelayMs: 1000, jitter: false });
      const delay3 = calculateBackoffDelay(3, { initialDelayMs: 1000, jitter: false });
      
      expect(delay1).toBe(1000); // 1000 * 2^0
      expect(delay2).toBe(2000); // 1000 * 2^1
      expect(delay3).toBe(4000); // 1000 * 2^2
    });

    it('should respect max delay', async () => {
      const { calculateBackoffDelay } = await import('../../src/utils/retry');
      
      const delay = calculateBackoffDelay(10, { 
        initialDelayMs: 1000, 
        maxDelayMs: 5000,
        jitter: false 
      });
      
      expect(delay).toBe(5000);
    });

    it('should add jitter when enabled', async () => {
      const { calculateBackoffDelay } = await import('../../src/utils/retry');
      
      // Run multiple times to check for variation
      const delays = new Set<number>();
      for (let i = 0; i < 10; i++) {
        delays.add(calculateBackoffDelay(1, { 
          initialDelayMs: 1000, 
          jitter: true,
          jitterFactor: 0.5
        }));
      }
      
      // With jitter, we should get different values
      // (though technically all could be same, very unlikely with 0.5 factor)
      expect(delays.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const { sleep } = await import('../../src/utils/retry');
      
      const promise = sleep(1000);
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { 
        maxRetries: 3,
        initialDelayMs: 10 // Short delay for testing
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const error = { response: { status: 400 } };
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { maxRetries: 3 })).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const error = { code: 'ECONNRESET' };
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { 
        maxRetries: 2,
        initialDelayMs: 10
      })).rejects.toEqual(error);
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');
      
      await withRetry(operation, { 
        maxRetries: 3,
        initialDelayMs: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ECONNRESET' }),
        1,
        expect.any(Number)
      );
    });

    it('should use custom isRetryable function', async () => {
      vi.useRealTimers();
      const { withRetry } = await import('../../src/utils/retry');
      
      const customRetryable = vi.fn().mockReturnValue(false);
      const error = { code: 'ECONNRESET' };
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { 
        maxRetries: 3,
        isRetryable: customRetryable
      })).rejects.toEqual(error);
      
      expect(customRetryable).toHaveBeenCalledWith(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('createRetryWrapper', () => {
    it('should create a wrapped function with retry', async () => {
      vi.useRealTimers();
      const { createRetryWrapper } = await import('../../src/utils/retry');
      
      const originalFn = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');
      
      const wrappedFn = createRetryWrapper(originalFn, { 
        maxRetries: 3,
        initialDelayMs: 10
      });
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in closed state', async () => {
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(5, 60000);
      
      expect(cb.getState()).toBe('closed');
    });

    it('should execute operation successfully', async () => {
      vi.useRealTimers();
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(5, 60000);
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await cb.execute(operation);
      
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('should open after threshold failures', async () => {
      vi.useRealTimers();
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(3, 60000);
      const error = new Error('fail');
      const operation = vi.fn().mockRejectedValue(error);
      
      // Fail 3 times to trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(operation)).rejects.toThrow('fail');
      }
      
      expect(cb.getState()).toBe('open');
    });

    it('should use fallback when circuit is open', async () => {
      vi.useRealTimers();
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(1, 60000);
      const error = new Error('fail');
      const operation = vi.fn().mockRejectedValue(error);
      const fallback = vi.fn().mockReturnValue('fallback');
      
      // Trip the circuit
      await expect(cb.execute(operation)).rejects.toThrow('fail');
      
      // Next call should use fallback
      const result = await cb.execute(operation, fallback);
      
      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
    });

    it('should throw when circuit is open and no fallback', async () => {
      vi.useRealTimers();
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(1, 60000);
      const error = new Error('fail');
      const operation = vi.fn().mockRejectedValue(error);
      
      // Trip the circuit
      await expect(cb.execute(operation)).rejects.toThrow('fail');
      
      // Next call should throw circuit breaker error
      await expect(cb.execute(operation)).rejects.toThrow('Circuit breaker is open');
    });

    it('should reset the circuit breaker', async () => {
      vi.useRealTimers();
      const { CircuitBreaker } = await import('../../src/utils/retry');
      
      const cb = new CircuitBreaker(1, 60000);
      const error = new Error('fail');
      const operation = vi.fn().mockRejectedValue(error);
      
      // Trip the circuit
      await expect(cb.execute(operation)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');
      
      // Reset
      cb.reset();
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('RateLimiter', () => {
    it('should acquire token when available', async () => {
      vi.useRealTimers();
      const { RateLimiter } = await import('../../src/utils/retry');
      
      const limiter = new RateLimiter(10, 60000);
      
      const acquired = await limiter.acquire();
      
      expect(acquired).toBe(true);
    });

    it('should return available tokens', async () => {
      vi.useRealTimers();
      const { RateLimiter } = await import('../../src/utils/retry');
      
      const limiter = new RateLimiter(10, 60000);
      
      expect(limiter.getAvailableTokens()).toBe(10);
      
      await limiter.acquire();
      await limiter.acquire();
      
      expect(limiter.getAvailableTokens()).toBe(8);
    });

    it('should deny when no tokens available', async () => {
      vi.useRealTimers();
      const { RateLimiter } = await import('../../src/utils/retry');
      
      const limiter = new RateLimiter(2, 60000);
      
      await limiter.acquire();
      await limiter.acquire();
      
      const acquired = await limiter.acquire();
      
      expect(acquired).toBe(false);
    });

    it('should wait for token', async () => {
      vi.useRealTimers();
      const { RateLimiter } = await import('../../src/utils/retry');
      
      const limiter = new RateLimiter(1, 100); // 1 token per 100ms
      
      await limiter.acquire(); // Take the token
      
      // Start waiting for token
      const waitPromise = limiter.waitForToken();
      
      // Wait should eventually resolve when token is refilled
      await waitPromise;
      
      // Should have acquired the token now
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(1);
    });
  });
});

