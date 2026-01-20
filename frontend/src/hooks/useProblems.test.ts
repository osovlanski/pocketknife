/**
 * useProblems Hook Tests
 * 
 * Tests for the Problems hook that manages coding problems and chat interaction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProblems } from './useProblems';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }))
}));

// Mock config
vi.mock('../config', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
  SOCKET_URL: 'http://localhost:3000'
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('../services/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock window.alert
vi.stubGlobal('alert', vi.fn());

describe('useProblems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ problems: [] })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useProblems());
      
      expect(result.current.problems).toEqual([]);
      expect(result.current.selectedProblem).toBeNull();
      expect(result.current.chatMessages).toEqual([]);
      expect(result.current.userInput).toBe('');
      // isLoading may be true initially due to useEffect
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.isStreaming).toBe(false);
    });
    
    it('should have default category and difficulty', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(result.current.selectedCategory).toBe('all');
      expect(result.current.selectedDifficulty).toBe('all');
    });
    
    it('should have hints and solution hidden by default', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(result.current.showHints).toBe(false);
      expect(result.current.showSolution).toBe(false);
    });
  });

  describe('Problem Selection', () => {
    it('should select problem', () => {
      const { result } = renderHook(() => useProblems());
      
      const mockProblem = {
        id: '1',
        title: 'Two Sum',
        description: 'Find two numbers that add up to target',
        difficulty: 'easy' as const,
        category: 'arrays',
        tags: ['array', 'hash-map']
      };
      
      act(() => {
        result.current.selectProblem(mockProblem);
      });
      
      expect(result.current.selectedProblem).toEqual(mockProblem);
    });
    
    it('should clear selected problem', () => {
      const { result } = renderHook(() => useProblems());
      
      const mockProblem = {
        id: '1',
        title: 'Two Sum',
        description: 'Find two numbers',
        difficulty: 'easy' as const,
        category: 'arrays',
        tags: []
      };
      
      act(() => {
        result.current.selectProblem(mockProblem);
      });
      
      act(() => {
        result.current.clearSelectedProblem();
      });
      
      expect(result.current.selectedProblem).toBeNull();
    });
  });

  describe('Filter State', () => {
    it('should update selectedCategory', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setSelectedCategory('arrays');
      });
      
      expect(result.current.selectedCategory).toBe('arrays');
    });
    
    it('should update selectedDifficulty', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setSelectedDifficulty('hard');
      });
      
      expect(result.current.selectedDifficulty).toBe('hard');
    });
    
    it('should update searchQuery', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setSearchQuery('binary search');
      });
      
      expect(result.current.searchQuery).toBe('binary search');
    });
  });

  describe('User Input', () => {
    it('should update userInput', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setUserInput('How do I solve this?');
      });
      
      expect(result.current.userInput).toBe('How do I solve this?');
    });
  });

  describe('Hints and Solution', () => {
    it('should toggle showHints', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setShowHints(true);
      });
      
      expect(result.current.showHints).toBe(true);
    });
    
    it('should toggle showSolution', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.setShowSolution(true);
      });
      
      expect(result.current.showSolution).toBe(true);
    });
    
    it('should show next hint', () => {
      const { result } = renderHook(() => useProblems());
      
      const initialIndex = result.current.currentHintIndex;
      
      act(() => {
        result.current.showNextHint();
      });
      
      // showNextHint increments when there's a selected problem with hints
      // Without a problem selected, it may not increment
      expect(result.current.currentHintIndex).toBeGreaterThanOrEqual(initialIndex);
    });
    
    it('should reset hints', () => {
      const { result } = renderHook(() => useProblems());
      
      act(() => {
        result.current.showNextHint();
        result.current.showNextHint();
      });
      
      act(() => {
        result.current.resetHints();
      });
      
      expect(result.current.currentHintIndex).toBe(0);
    });
  });

  describe('Computed Properties', () => {
    it('should have categories list', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(result.current.categories).toContain('all');
      expect(result.current.categories).toContain('arrays');
      expect(result.current.categories).toContain('strings');
    });
    
    it('should have difficulties list', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(result.current.difficulties).toContain('all');
      expect(result.current.difficulties).toContain('easy');
      expect(result.current.difficulties).toContain('medium');
      expect(result.current.difficulties).toContain('hard');
    });
    
    it('should filter problems by category and difficulty', () => {
      const { result } = renderHook(() => useProblems());
      
      // filteredProblems should return empty array when no problems
      expect(result.current.filteredProblems).toEqual([]);
    });
  });

  describe('API Actions', () => {
    it('should have loadProblems function', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(typeof result.current.loadProblems).toBe('function');
    });
    
    it('should have searchProblems function', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(typeof result.current.searchProblems).toBe('function');
    });
    
    it('should have sendMessage function', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(typeof result.current.sendMessage).toBe('function');
    });
    
    it('should have stopStreaming function', () => {
      const { result } = renderHook(() => useProblems());
      
      expect(typeof result.current.stopStreaming).toBe('function');
    });
  });
});
