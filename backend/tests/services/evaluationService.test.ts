/**
 * Evaluation Service Tests
 *
 * Tests for evaluateResponse, calculateAverages, and groupByCategory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGenerateClaudeMessage, mockIsAnthropicConfigured, mockConfigService } = vi.hoisted(() => ({
  mockGenerateClaudeMessage: vi.fn(),
  mockIsAnthropicConfigured: vi.fn(),
  mockConfigService: {
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue)
  }
}));

vi.mock('../../src/utils/anthropicClient', () => ({
  generateClaudeMessage: mockGenerateClaudeMessage,
  isAnthropicConfigured: mockIsAnthropicConfigured
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: mockConfigService
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

import { evaluationService } from '../../src/services/evaluation/evaluationService';
import type { EvaluationResult, QuestionCategory } from '../../src/services/evaluation/types';

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAnthropicConfigured.mockReturnValue(true);
  mockConfigService.get.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// evaluateResponse
// =============================================================================

describe('evaluationService.evaluateResponse', () => {
  it('should parse valid Claude JSON and return scores', async () => {
    mockGenerateClaudeMessage.mockResolvedValue(JSON.stringify({
      accuracy: 4,
      helpfulness: 5,
      completeness: 3,
      clarity: 4,
      safety: 5,
      agentUsage: null,
      feedback: 'Great response'
    }));

    const result = await evaluationService.evaluateResponse('What is JS?', 'JavaScript is a language.');

    expect(result.accuracy).toBe(4);
    expect(result.helpfulness).toBe(5);
    expect(result.completeness).toBe(3);
    expect(result.clarity).toBe(4);
    expect(result.safety).toBe(5);
    expect(result.agentUsage).toBeNull();
    expect(result.isError).toBe(false);
    expect(result.feedback).toBe('Great response');
    expect(result.overall).toBeCloseTo((4 + 5 + 3 + 4 + 5) / 5);
  });

  it('should throw when Anthropic is not configured', async () => {
    mockIsAnthropicConfigured.mockReturnValue(false);

    await expect(
      evaluationService.evaluateResponse('q', 'r')
    ).rejects.toThrow('ANTHROPIC_API_KEY not configured');
  });

  it('should return error-flagged scores when Claude returns empty', async () => {
    mockGenerateClaudeMessage.mockResolvedValue('');

    const result = await evaluationService.evaluateResponse('q', 'r');

    expect(result.isError).toBe(true);
    expect(result.overall).toBe(0);
    expect(result.feedback).toContain('error');
  });

  it('should return error-flagged scores when Claude returns no JSON', async () => {
    mockGenerateClaudeMessage.mockResolvedValue('No JSON here, just text.');

    const result = await evaluationService.evaluateResponse('q', 'r');

    expect(result.isError).toBe(true);
    expect(result.overall).toBe(0);
  });

  it('should flag isError=true when Zod validation fails', async () => {
    // Return JSON where scores are strings instead of numbers
    mockGenerateClaudeMessage.mockResolvedValue(JSON.stringify({
      accuracy: 'high',
      helpfulness: 'good',
      completeness: 'ok',
      clarity: 'fine',
      safety: 'safe'
    }));

    const result = await evaluationService.evaluateResponse('q', 'r');

    expect(result.isError).toBe(true);
    expect(result.feedback).toContain('Validation fallback');
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateClaudeMessage.mockRejectedValue(new Error('Network timeout'));

    const result = await evaluationService.evaluateResponse('q', 'r');

    expect(result.isError).toBe(true);
    expect(result.feedback).toContain('Network timeout');
  });

  it('should include agentUsage in overall when provided', async () => {
    mockGenerateClaudeMessage.mockResolvedValue(JSON.stringify({
      accuracy: 4,
      helpfulness: 4,
      completeness: 4,
      clarity: 4,
      safety: 4,
      agentUsage: 2,
      feedback: 'Wrong agents used'
    }));

    const result = await evaluationService.evaluateResponse(
      'Find jobs', 'Here are jobs', ['jobs'], ['cooking']
    );

    expect(result.agentUsage).toBe(2);
    // 6 dimensions: (4*5 + 2) / 6 = 22/6 ≈ 3.667
    expect(result.overall).toBeCloseTo(22 / 6);
    expect(result.isError).toBe(false);
  });
});

// =============================================================================
// calculateAverages
// =============================================================================

describe('evaluationService.calculateAverages', () => {
  const makeResult = (scores: Partial<EvaluationResult['scores']>, category: QuestionCategory = 'general'): EvaluationResult => ({
    questionId: 'q1',
    question: 'Test',
    category,
    response: 'Response',
    scores: {
      accuracy: 0,
      helpfulness: 0,
      completeness: 0,
      clarity: 0,
      safety: 0,
      agentUsage: null,
      overall: 0,
      feedback: '',
      isError: false,
      ...scores
    },
    evaluatedAt: new Date()
  });

  it('should average multiple valid results', () => {
    const results = [
      makeResult({ accuracy: 4, helpfulness: 3, completeness: 5, clarity: 4, safety: 5, overall: 4.2 }),
      makeResult({ accuracy: 2, helpfulness: 4, completeness: 3, clarity: 5, safety: 4, overall: 3.6 })
    ];

    const avg = evaluationService.calculateAverages(results);

    expect(avg.accuracy).toBeCloseTo(3);
    expect(avg.helpfulness).toBeCloseTo(3.5);
    expect(avg.overall).toBeCloseTo(3.9);
    expect(avg.isError).toBe(false);
  });

  it('should exclude error-flagged results', () => {
    const results = [
      makeResult({ accuracy: 4, overall: 4, isError: false }),
      makeResult({ accuracy: 0, overall: 0, isError: true }),
    ];

    const avg = evaluationService.calculateAverages(results);

    expect(avg.accuracy).toBe(4);
    expect(avg.overall).toBe(4);
    expect(avg.feedback).toContain('1 errors excluded');
  });

  it('should return zero with isError when all results are errors', () => {
    const results = [
      makeResult({ isError: true }),
      makeResult({ isError: true })
    ];

    const avg = evaluationService.calculateAverages(results);

    expect(avg.overall).toBe(0);
    expect(avg.isError).toBe(true);
    expect(avg.feedback).toContain('All 2 evaluations failed');
  });

  it('should handle empty results array', () => {
    const avg = evaluationService.calculateAverages([]);

    expect(avg.overall).toBe(0);
    expect(avg.feedback).toContain('No results to average');
    expect(avg.isError).toBe(false);
  });

  it('should track agentUsage separately from main count', () => {
    const results = [
      makeResult({ agentUsage: 5, overall: 4 }),
      makeResult({ agentUsage: null, overall: 3 }),
      makeResult({ agentUsage: 3, overall: 5 })
    ];

    const avg = evaluationService.calculateAverages(results);

    // agentUsage: (5 + 3) / 2 = 4 (only 2 non-null values)
    expect(avg.agentUsage).toBeCloseTo(4);
  });

  it('should return null agentUsage when all are null', () => {
    const results = [
      makeResult({ agentUsage: null }),
      makeResult({ agentUsage: null })
    ];

    const avg = evaluationService.calculateAverages(results);

    expect(avg.agentUsage).toBeNull();
  });
});

// =============================================================================
// groupByCategory
// =============================================================================

describe('evaluationService.groupByCategory', () => {
  const makeResult = (category: QuestionCategory): EvaluationResult => ({
    questionId: 'q1',
    question: 'Test',
    category,
    response: 'Response',
    scores: {
      accuracy: 4, helpfulness: 4, completeness: 4, clarity: 4, safety: 4,
      agentUsage: null, overall: 4, feedback: '', isError: false
    },
    evaluatedAt: new Date()
  });

  it('should group results by category', () => {
    const results = [
      makeResult('cooking'),
      makeResult('cooking'),
      makeResult('jobs'),
      makeResult('general')
    ];

    const grouped = evaluationService.groupByCategory(results);

    expect(grouped.cooking).toHaveLength(2);
    expect(grouped.jobs).toHaveLength(1);
    expect(grouped.general).toHaveLength(1);
    expect(grouped.travel).toBeUndefined();
  });

  it('should handle empty results', () => {
    const grouped = evaluationService.groupByCategory([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});
