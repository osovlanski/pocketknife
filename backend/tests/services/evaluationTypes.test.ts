/**
 * Evaluation Types Tests
 *
 * Tests for constrained types, Zod schemas, and helper functions
 * in the evaluation system's types module.
 */

import { describe, it, expect } from 'vitest';
import {
  RawScoresSchema,
  RawQuestionSchema,
  clampScore,
  computeOverall,
  toQuestionCategory,
  toDifficulty
} from '../../src/services/evaluation/types';

// =============================================================================
// clampScore
// =============================================================================

describe('clampScore', () => {
  it('should return the value when within 0-5 range', () => {
    expect(clampScore(3)).toBe(3);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(5)).toBe(5);
    expect(clampScore(2.7)).toBe(2.7);
  });

  it('should clamp values above 5 to 5', () => {
    expect(clampScore(6)).toBe(5);
    expect(clampScore(100)).toBe(5);
  });

  it('should clamp values below 0 to 0', () => {
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(-100)).toBe(0);
  });

  it('should default non-number inputs to 3', () => {
    expect(clampScore(undefined)).toBe(3);
    expect(clampScore(null)).toBe(3);
    expect(clampScore('abc')).toBe(3);
    expect(clampScore({})).toBe(3);
    expect(clampScore(true)).toBe(3);
  });
});

// =============================================================================
// computeOverall
// =============================================================================

describe('computeOverall', () => {
  it('should compute arithmetic mean of 5 dimensions when agentUsage is null', () => {
    const result = computeOverall({
      accuracy: 4,
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5,
      agentUsage: null
    });
    // (4 + 3 + 5 + 4 + 5) / 5 = 21 / 5 = 4.2
    expect(result).toBeCloseTo(4.2);
  });

  it('should include agentUsage in mean when not null', () => {
    const result = computeOverall({
      accuracy: 4,
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5,
      agentUsage: 3
    });
    // (4 + 3 + 5 + 4 + 5 + 3) / 6 = 24 / 6 = 4.0
    expect(result).toBeCloseTo(4.0);
  });

  it('should handle all zeros', () => {
    const result = computeOverall({
      accuracy: 0,
      helpfulness: 0,
      completeness: 0,
      clarity: 0,
      safety: 0,
      agentUsage: null
    });
    expect(result).toBe(0);
  });

  it('should handle agentUsage of 0 (included in mean)', () => {
    const result = computeOverall({
      accuracy: 5,
      helpfulness: 5,
      completeness: 5,
      clarity: 5,
      safety: 5,
      agentUsage: 0
    });
    // (5*5 + 0) / 6 = 25/6 ≈ 4.167
    expect(result).toBeCloseTo(25 / 6);
  });
});

// =============================================================================
// toQuestionCategory
// =============================================================================

describe('toQuestionCategory', () => {
  it('should return valid categories unchanged', () => {
    expect(toQuestionCategory('general')).toBe('general');
    expect(toQuestionCategory('cooking')).toBe('cooking');
    expect(toQuestionCategory('jobs')).toBe('jobs');
    expect(toQuestionCategory('travel')).toBe('travel');
    expect(toQuestionCategory('learning')).toBe('learning');
    expect(toQuestionCategory('shopping')).toBe('shopping');
    expect(toQuestionCategory('problems')).toBe('problems');
    expect(toQuestionCategory('todo')).toBe('todo');
    expect(toQuestionCategory('email')).toBe('email');
    expect(toQuestionCategory('multi-agent')).toBe('multi-agent');
  });

  it('should default unknown categories to general', () => {
    expect(toQuestionCategory('unknown')).toBe('general');
    expect(toQuestionCategory('')).toBe('general');
    expect(toQuestionCategory('COOKING')).toBe('general'); // case-sensitive
    expect(toQuestionCategory('foo-bar')).toBe('general');
  });
});

// =============================================================================
// toDifficulty
// =============================================================================

describe('toDifficulty', () => {
  it('should return valid difficulty levels unchanged', () => {
    expect(toDifficulty(1)).toBe(1);
    expect(toDifficulty(3)).toBe(3);
    expect(toDifficulty(5)).toBe(5);
  });

  it('should clamp values below 1 to 1', () => {
    expect(toDifficulty(0)).toBe(1);
    expect(toDifficulty(-5)).toBe(1);
  });

  it('should clamp values above 5 to 5', () => {
    expect(toDifficulty(6)).toBe(5);
    expect(toDifficulty(100)).toBe(5);
  });

  it('should round fractional values', () => {
    expect(toDifficulty(2.4)).toBe(2);
    expect(toDifficulty(2.6)).toBe(3);
    expect(toDifficulty(4.5)).toBe(5);
  });
});

// =============================================================================
// RawScoresSchema (Zod)
// =============================================================================

describe('RawScoresSchema', () => {
  it('should parse valid scores', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 4,
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5,
      agentUsage: 3,
      feedback: 'Good response'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accuracy).toBe(4);
      expect(result.data.feedback).toBe('Good response');
    }
  });

  it('should clamp scores outside 0-5 range', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 4.7,
      helpfulness: 3.2,
      completeness: 2.8,
      clarity: 4,
      safety: 5
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accuracy).toBe(5); // 4.7 rounds to 5
      expect(result.data.helpfulness).toBe(3); // 3.2 rounds to 3
      expect(result.data.completeness).toBe(3); // 2.8 rounds to 3
    }
  });

  it('should default feedback to empty string when missing', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 4,
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feedback).toBe('');
    }
  });

  it('should allow null agentUsage', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 4,
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5,
      agentUsage: null
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentUsage).toBeNull();
    }
  });

  it('should reject non-numeric scores', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 'high',
      helpfulness: 3,
      completeness: 5,
      clarity: 4,
      safety: 5
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = RawScoresSchema.safeParse({
      accuracy: 4
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// RawQuestionSchema (Zod)
// =============================================================================

describe('RawQuestionSchema', () => {
  it('should parse valid questions', () => {
    const result = RawQuestionSchema.safeParse({
      question: 'What is Node.js?',
      category: 'learning',
      difficulty: 2,
      expectedAgents: ['learning']
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is Node.js?');
      expect(result.data.difficulty).toBe(2);
    }
  });

  it('should default category to general and expectedAgents to empty', () => {
    const result = RawQuestionSchema.safeParse({
      question: 'Hello',
      difficulty: 1
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('general');
      expect(result.data.expectedAgents).toEqual([]);
    }
  });

  it('should round and clamp difficulty', () => {
    const result = RawQuestionSchema.safeParse({
      question: 'Test',
      difficulty: 3.7
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.difficulty).toBe(4);
    }
  });

  it('should reject missing question', () => {
    const result = RawQuestionSchema.safeParse({
      difficulty: 3
    });
    expect(result.success).toBe(false);
  });
});
