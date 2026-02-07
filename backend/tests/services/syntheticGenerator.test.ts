/**
 * Synthetic Generator Tests
 *
 * Tests for the pure helper functions: calculateDifficulty and identifyWeakCategories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockConfigService } = vi.hoisted(() => ({
  mockConfigService: {
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue)
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: mockConfigService
}));

vi.mock('../../src/utils/anthropicClient', () => ({
  generateClaudeMessage: vi.fn(),
  isAnthropicConfigured: vi.fn()
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    search: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

import { syntheticGenerator } from '../../src/services/evaluation/syntheticGenerator';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfigService.get.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// calculateDifficulty
// =============================================================================

describe('syntheticGenerator.calculateDifficulty', () => {
  it('should return 1 for very low scores (< 2.5)', () => {
    expect(syntheticGenerator.calculateDifficulty(0)).toBe(1);
    expect(syntheticGenerator.calculateDifficulty(1.5)).toBe(1);
    expect(syntheticGenerator.calculateDifficulty(2.49)).toBe(1);
  });

  it('should return 2 for low scores (2.5 - 2.99)', () => {
    expect(syntheticGenerator.calculateDifficulty(2.5)).toBe(2);
    expect(syntheticGenerator.calculateDifficulty(2.99)).toBe(2);
  });

  it('should return 3 for medium scores (3.0 - 3.49)', () => {
    expect(syntheticGenerator.calculateDifficulty(3.0)).toBe(3);
    expect(syntheticGenerator.calculateDifficulty(3.49)).toBe(3);
  });

  it('should return 4 for good scores (3.5 - 3.99)', () => {
    expect(syntheticGenerator.calculateDifficulty(3.5)).toBe(4);
    expect(syntheticGenerator.calculateDifficulty(3.99)).toBe(4);
  });

  it('should return 5 for high scores (>= 4.0)', () => {
    expect(syntheticGenerator.calculateDifficulty(4.0)).toBe(5);
    expect(syntheticGenerator.calculateDifficulty(5.0)).toBe(5);
  });

  it('should handle boundary values exactly', () => {
    expect(syntheticGenerator.calculateDifficulty(2.5)).toBe(2);
    expect(syntheticGenerator.calculateDifficulty(3.0)).toBe(3);
    expect(syntheticGenerator.calculateDifficulty(3.5)).toBe(4);
    expect(syntheticGenerator.calculateDifficulty(4.0)).toBe(5);
  });
});

// =============================================================================
// identifyWeakCategories
// =============================================================================

describe('syntheticGenerator.identifyWeakCategories', () => {
  it('should return categories below default threshold (3.5)', () => {
    const scores = {
      cooking: 4.0,
      jobs: 2.0,
      travel: 3.0,
      learning: 5.0
    };

    const weak = syntheticGenerator.identifyWeakCategories(scores);

    expect(weak).toContain('jobs');
    expect(weak).toContain('travel');
    expect(weak).not.toContain('cooking');
    expect(weak).not.toContain('learning');
  });

  it('should sort from weakest to strongest', () => {
    const scores = {
      cooking: 3.0,
      jobs: 1.0,
      travel: 2.0
    };

    const weak = syntheticGenerator.identifyWeakCategories(scores);

    expect(weak[0]).toBe('jobs');    // lowest
    expect(weak[1]).toBe('travel');  // second lowest
    expect(weak[2]).toBe('cooking'); // third
  });

  it('should use custom threshold when provided', () => {
    const scores = {
      cooking: 4.0,
      jobs: 3.8,
      travel: 3.0
    };

    const weak = syntheticGenerator.identifyWeakCategories(scores, 4.0);

    expect(weak).toContain('jobs');
    expect(weak).toContain('travel');
    expect(weak).not.toContain('cooking'); // exactly at threshold, not below
  });

  it('should return empty array when all scores are above threshold', () => {
    const scores = {
      cooking: 4.5,
      jobs: 5.0,
      travel: 4.0
    };

    const weak = syntheticGenerator.identifyWeakCategories(scores);

    expect(weak).toHaveLength(0);
  });

  it('should handle empty scores object', () => {
    const weak = syntheticGenerator.identifyWeakCategories({});
    expect(weak).toHaveLength(0);
  });

  it('should convert unknown categories to general', () => {
    const scores = {
      'unknown-cat': 1.0
    };

    const weak = syntheticGenerator.identifyWeakCategories(scores);

    expect(weak).toContain('general');
  });
});
