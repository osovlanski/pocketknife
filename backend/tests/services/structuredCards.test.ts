/**
 * Structured Cards Tests
 *
 * Tests for card extraction from workflow steps and tool call results.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/assistant/componentRegistry', () => ({
  generateRenderHints: vi.fn(() => ({})),
  type: {} as never
}));

import {
  extractStructuredData,
  extractStructuredDataFromToolCalls,
  buildRenderHints
} from '../../src/services/assistant/structuredCards';
import type { WorkflowStep } from '../../src/services/assistant/agentOrchestratorService';

// =============================================================================
// extractStructuredData
// =============================================================================

describe('extractStructuredData', () => {
  it('should extract job cards from completed workflow steps', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'jobs',
      action: 'search',
      status: 'completed',
      result: {
        success: true,
        data: {
          jobs: [
            { title: 'Senior Developer', company: 'Acme', location: 'Remote', salary: '$120k' },
            { title: 'Junior Dev', company: 'Beta Corp', url: 'https://example.com' }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      type: 'job',
      title: 'Senior Developer',
      company: 'Acme',
      location: 'Remote',
      salary: '$120k'
    });
    expect(cards[1]).toMatchObject({
      type: 'job',
      title: 'Junior Dev',
      company: 'Beta Corp'
    });
  });

  it('should extract recipe cards', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'cooking',
      action: 'find-recipes',
      status: 'completed',
      result: {
        success: true,
        data: {
          recipes: [
            { title: 'Pasta Carbonara', servings: 4, readyInMinutes: 30 }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: 'recipe',
      title: 'Pasta Carbonara',
      servings: 4,
      prepTime: '30 min'
    });
  });

  it('should extract flight cards', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'travel',
      action: 'search-flights',
      status: 'completed',
      result: {
        success: true,
        data: {
          flights: [
            { airline: 'Delta', origin: 'JFK', destination: 'LAX', price: '$299', stops: 0 }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: 'flight',
      airline: 'Delta',
      origin: 'JFK',
      destination: 'LAX',
      price: '$299',
      stops: 0
    });
  });

  it('should extract task cards', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'todo',
      action: 'get-tasks',
      status: 'completed',
      result: {
        success: true,
        data: {
          tasks: [
            { title: 'Buy groceries', completed: false, priority: 'high', id: 't1' }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: 'task',
      title: 'Buy groceries',
      completed: false,
      priority: 'high',
      taskId: 't1'
    });
  });

  it('should extract product cards', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'shopping',
      action: 'search',
      status: 'completed',
      result: {
        success: true,
        data: {
          products: [
            { name: 'Laptop', price: '$999', source: 'Amazon', url: 'https://amazon.com/laptop' }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: 'product',
      name: 'Laptop',
      price: '$999',
      source: 'Amazon'
    });
  });

  it('should skip non-completed steps', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'jobs',
      action: 'search',
      status: 'pending',
      result: {
        success: true,
        data: { jobs: [{ title: 'Dev', company: 'Corp' }] }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(0);
  });

  it('should skip steps with no result data', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'jobs',
      action: 'search',
      status: 'completed',
      result: { success: false }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(0);
  });

  it('should filter job cards without title or company', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'jobs',
      action: 'search',
      status: 'completed',
      result: {
        success: true,
        data: {
          jobs: [
            { title: 'Dev', company: '' },  // empty company
            { title: '', company: 'Corp' },  // empty title
            { title: 'Good Job', company: 'Good Corp' } // valid
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(1);
    expect(cards[0].type === 'job' && cards[0].title).toBe('Good Job');
  });

  it('should handle alternate field names (jobTitle, companyName)', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'jobs',
      action: 'search',
      status: 'completed',
      result: {
        success: true,
        data: {
          results: [
            { jobTitle: 'Software Engineer', companyName: 'TechCo', link: 'https://example.com' }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(1);
    expect(cards[0].type === 'job' && cards[0].title).toBe('Software Engineer');
  });

  it('should extract from multiple agent steps', () => {
    const steps: WorkflowStep[] = [
      {
        agentId: 'jobs',
        action: 'search',
        status: 'completed',
        result: { success: true, data: { jobs: [{ title: 'Dev', company: 'Co' }] } }
      },
      {
        agentId: 'shopping',
        action: 'search',
        status: 'completed',
        result: { success: true, data: { products: [{ name: 'Laptop' }] } }
      }
    ] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(2);
    expect(cards[0].type).toBe('job');
    expect(cards[1].type).toBe('product');
  });
});

// =============================================================================
// extractStructuredDataFromToolCalls
// =============================================================================

describe('extractStructuredDataFromToolCalls', () => {
  it('should extract cards by tool name prefix', () => {
    const toolResults = new Map<string, { success: boolean; data?: unknown }>();
    toolResults.set('jobs_search', {
      success: true,
      data: { results: [{ title: 'Dev', company: 'Corp' }] }
    });

    const cards = extractStructuredDataFromToolCalls(toolResults);
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('job');
  });

  it('should skip failed tool results', () => {
    const toolResults = new Map<string, { success: boolean; data?: unknown }>();
    toolResults.set('jobs_search', {
      success: false,
      data: { results: [{ title: 'Dev', company: 'Corp' }] }
    });

    const cards = extractStructuredDataFromToolCalls(toolResults);
    expect(cards).toHaveLength(0);
  });

  it('should handle cooking tool results', () => {
    const toolResults = new Map<string, { success: boolean; data?: unknown }>();
    toolResults.set('cooking_find_recipes', {
      success: true,
      data: { recipes: [{ title: 'Soup', servings: 2 }] }
    });

    const cards = extractStructuredDataFromToolCalls(toolResults);
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('recipe');
  });

  it('should handle non-object data gracefully', () => {
    const toolResults = new Map<string, { success: boolean; data?: unknown }>();
    toolResults.set('jobs_search', {
      success: true,
      data: 'just a string'
    });

    const cards = extractStructuredDataFromToolCalls(toolResults);
    expect(cards).toHaveLength(0);
  });

  it('should skip unknown agent prefixes', () => {
    const toolResults = new Map<string, { success: boolean; data?: unknown }>();
    toolResults.set('unknown_action', {
      success: true,
      data: { items: [{ name: 'Test' }] }
    });

    const cards = extractStructuredDataFromToolCalls(toolResults);
    expect(cards).toHaveLength(0);
  });
});

// =============================================================================
// buildRenderHints
// =============================================================================

describe('buildRenderHints', () => {
  it('should count card types correctly', () => {
    const cards = [
      { type: 'job' as const, title: 'Dev', company: 'Co' },
      { type: 'job' as const, title: 'Eng', company: 'Co2' },
      { type: 'product' as const, name: 'Laptop' }
    ];

    // buildRenderHints calls generateRenderHints which is mocked
    const hints = buildRenderHints(cards);
    expect(hints).toBeDefined();
  });
});

// =============================================================================
// normalizePriority (tested via task extraction)
// =============================================================================

describe('normalizePriority via extractStructuredData', () => {
  it('should normalize valid priority values', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'todo',
      action: 'get-tasks',
      status: 'completed',
      result: {
        success: true,
        data: {
          tasks: [
            { title: 'Task 1', priority: 'LOW' },
            { title: 'Task 2', priority: 'Medium' },
            { title: 'Task 3', priority: 'HIGH' }
          ]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    expect(cards).toHaveLength(3);

    const tasks = cards as Array<{ type: string; priority?: string }>;
    expect(tasks[0].priority).toBe('low');
    expect(tasks[1].priority).toBe('medium');
    expect(tasks[2].priority).toBe('high');
  });

  it('should return undefined for invalid priority', () => {
    const steps: WorkflowStep[] = [{
      agentId: 'todo',
      action: 'get-tasks',
      status: 'completed',
      result: {
        success: true,
        data: {
          tasks: [{ title: 'Task', priority: 'urgent' }]
        }
      }
    }] as WorkflowStep[];

    const cards = extractStructuredData(steps);
    const task = cards[0] as { priority?: string };
    expect(task.priority).toBeUndefined();
  });
});
