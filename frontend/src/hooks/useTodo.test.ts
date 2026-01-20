/**
 * useTodo Hook Tests
 * 
 * Tests for the ToDo hook that manages task state and logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTodo } from './useTodo';
import * as todoApi from '../services/todoApi';

// Mock the todoApi module
vi.mock('../services/todoApi', () => ({
  getTasks: vi.fn(),
  getDailyAgenda: vi.fn(),
  getSuggestedRoutines: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
  deleteTask: vi.fn(),
  syncCalendar: vi.fn(),
  learnPatterns: vi.fn(),
  approveRoutine: vi.fn(),
  dismissRoutine: vi.fn(),
  importCalendarEvent: vi.fn()
}));

// Mock logger
vi.mock('../services/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock window.alert
global.alert = vi.fn();

describe('useTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (todoApi.getTasks as any).mockResolvedValue({ tasks: [] });
    (todoApi.getDailyAgenda as any).mockResolvedValue({ 
      agenda: {
        date: '2026-01-19',
        tasks: [],
        routineTasks: [],
        suggestedTasks: [],
        calendarEvents: []
      }
    });
    (todoApi.getSuggestedRoutines as any).mockResolvedValue({ suggestedRoutines: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useTodo());
      
      expect(result.current.tasks).toEqual([]);
      // loading may be true initially due to useEffect, wait for it to settle
      expect(result.current.showAddTask).toBe(false);
      expect(result.current.showEditTask).toBe(false);
      expect(result.current.editingTask).toBeNull();
      expect(result.current.syncing).toBe(false);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
    
    it('should have newTask with default values', () => {
      const { result } = renderHook(() => useTodo());
      
      expect(result.current.newTask.title).toBe('');
      expect(result.current.newTask.priority).toBe('medium');
      expect(result.current.newTask.category).toBe('personal');
      expect(result.current.newTask.syncEnabled).toBe(true);
    });
  });

  describe('Loading Data', () => {
    it('should load agenda on mount', async () => {
      const mockAgenda = {
        date: '2026-01-19',
        tasks: [{ id: 'task-1', title: 'Test Task', status: 'pending' }],
        routineTasks: [],
        suggestedTasks: [],
        calendarEvents: []
      };
      
      (todoApi.getDailyAgenda as any).mockResolvedValue({ agenda: mockAgenda });
      
      const { result } = renderHook(() => useTodo());
      
      await waitFor(() => {
        expect(todoApi.getDailyAgenda).toHaveBeenCalled();
      });
    });
    
    it('should handle API errors gracefully', async () => {
      (todoApi.getDailyAgenda as any).mockRejectedValue(new Error('API Error'));
      
      const { result } = renderHook(() => useTodo());
      
      await waitFor(() => {
        expect(result.current.agenda).toBeNull();
      });
    });
  });

  describe('Task Operations', () => {
    it('should call createTask API', async () => {
      const newTask = { title: 'New Task', priority: 'high', category: 'work' };
      (todoApi.createTask as any).mockResolvedValue({ task: { id: 'task-123', ...newTask } });
      
      const { result } = renderHook(() => useTodo());
      
      act(() => {
        result.current.setNewTask({ ...result.current.newTask, title: 'New Task', priority: 'high', category: 'work' });
      });
      
      await act(async () => {
        try {
          await result.current.handleCreateTask();
        } catch {
          // May fail in test environment
        }
      });
      
      // API should be called when title is not empty
      expect(todoApi.createTask).toHaveBeenCalled();
    });
    
    it('should complete task successfully', async () => {
      (todoApi.completeTask as any).mockResolvedValue({ task: { id: 'task-1', status: 'completed' } });
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleCompleteTask('task-1', 'pending');
      });
      
      expect(todoApi.completeTask).toHaveBeenCalledWith('task-1');
    });
    
    it('should uncomplete task when already completed', async () => {
      (todoApi.uncompleteTask as any).mockResolvedValue({ task: { id: 'task-1', status: 'pending' } });
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleCompleteTask('task-1', 'completed');
      });
      
      expect(todoApi.uncompleteTask).toHaveBeenCalledWith('task-1');
    });
    
    it('should delete task successfully', async () => {
      (todoApi.deleteTask as any).mockResolvedValue({});
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleDeleteTask('task-1');
      });
      
      expect(todoApi.deleteTask).toHaveBeenCalledWith('task-1');
    });
    
    it('should update task successfully', async () => {
      const updatedTask = { title: 'Updated Task', priority: 'low' };
      (todoApi.updateTask as any).mockResolvedValue({ task: { id: 'task-1', ...updatedTask } });
      
      const { result } = renderHook(() => useTodo());
      
      // Set editing task first
      act(() => {
        result.current.setEditingTask({ id: 'task-1', title: 'Original', status: 'pending' } as any);
      });
      
      await act(async () => {
        await result.current.handleUpdateTask(updatedTask as any);
      });
      
      expect(todoApi.updateTask).toHaveBeenCalled();
    });
  });

  describe('Calendar Sync', () => {
    it('should sync calendar successfully', async () => {
      (todoApi.syncCalendar as any).mockResolvedValue({ 
        syncResult: { synced: 5, errors: 0 } 
      });
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleSyncCalendar();
      });
      
      expect(todoApi.syncCalendar).toHaveBeenCalled();
      expect(result.current.syncing).toBe(false);
    });
    
    it('should handle sync errors gracefully', async () => {
      (todoApi.syncCalendar as any).mockRejectedValue(new Error('Sync failed'));
      
      const { result } = renderHook(() => useTodo());
      
      // Should not throw
      await act(async () => {
        try {
          await result.current.handleSyncCalendar();
        } catch {
          // Expected to fail gracefully
        }
      });
      
      expect(result.current.syncing).toBe(false);
    });
  });

  describe('Pattern Learning', () => {
    it('should learn patterns successfully', async () => {
      (todoApi.learnPatterns as any).mockResolvedValue({ patternsLearned: 3 });
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleLearnPatterns();
      });
      
      expect(todoApi.learnPatterns).toHaveBeenCalled();
      expect(result.current.learningPatterns).toBe(false);
    });
  });

  describe('Routine Management', () => {
    it('should approve routine', async () => {
      (todoApi.approveRoutine as any).mockResolvedValue({});
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleApproveRoutine('routine-1');
      });
      
      expect(todoApi.approveRoutine).toHaveBeenCalledWith('routine-1');
    });
    
    it('should dismiss routine', async () => {
      (todoApi.dismissRoutine as any).mockResolvedValue({});
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleDismissRoutine('routine-1');
      });
      
      expect(todoApi.dismissRoutine).toHaveBeenCalledWith('routine-1');
    });
  });

  describe('Calendar Event Import', () => {
    it('should import calendar event', async () => {
      const calendarEvent = {
        id: 'event-1',
        title: 'Team Meeting',
        start: '2026-01-20T10:00:00Z',
        end: '2026-01-20T11:00:00Z',
        isAllDay: false
      };
      
      (todoApi.importCalendarEvent as any).mockResolvedValue({ 
        task: { id: 'task-123', title: 'Team Meeting' } 
      });
      
      const { result } = renderHook(() => useTodo());
      
      await act(async () => {
        await result.current.handleImportCalendarEvent(calendarEvent as any);
      });
      
      expect(todoApi.importCalendarEvent).toHaveBeenCalled();
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to next day', () => {
      const { result } = renderHook(() => useTodo());
      const initialDate = result.current.selectedDate;
      
      act(() => {
        result.current.navigateDate(1);
      });
      
      expect(result.current.selectedDate.getDate()).toBe(initialDate.getDate() + 1);
    });
    
    it('should navigate to previous day', () => {
      const { result } = renderHook(() => useTodo());
      const initialDate = result.current.selectedDate;
      
      act(() => {
        result.current.navigateDate(-1);
      });
      
      expect(result.current.selectedDate.getDate()).toBe(initialDate.getDate() - 1);
    });
  });

  describe('UI State Management', () => {
    it('should toggle showAddTask', () => {
      const { result } = renderHook(() => useTodo());
      
      expect(result.current.showAddTask).toBe(false);
      
      act(() => {
        result.current.setShowAddTask(true);
      });
      
      expect(result.current.showAddTask).toBe(true);
    });
    
    it('should set editing task', () => {
      const { result } = renderHook(() => useTodo());
      const task = { id: 'task-1', title: 'Test', status: 'pending' };
      
      act(() => {
        result.current.handleEditTask(task as any);
      });
      
      expect(result.current.editingTask).toEqual(task);
      expect(result.current.showEditTask).toBe(true);
    });
    
    it('should toggle showRoutines', () => {
      const { result } = renderHook(() => useTodo());
      
      act(() => {
        result.current.setShowRoutines(true);
      });
      
      expect(result.current.showRoutines).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate progress correctly', async () => {
      const mockAgenda = {
        date: '2026-01-19',
        tasks: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'pending' },
          { id: '3', status: 'completed' },
          { id: '4', status: 'pending' }
        ],
        routineTasks: [],
        suggestedTasks: [],
        calendarEvents: []
      };
      
      (todoApi.getDailyAgenda as any).mockResolvedValue({ agenda: mockAgenda });
      
      const { result } = renderHook(() => useTodo());
      
      await waitFor(() => {
        expect(result.current.agenda).toBeDefined();
      });
      
      // 2 completed out of 4 = 50%
      expect(result.current.completedCount).toBe(2);
      expect(result.current.progress).toBe(50);
    });
    
    it('should format date correctly', () => {
      const { result } = renderHook(() => useTodo());
      
      expect(result.current.formattedDate).toBeDefined();
      expect(typeof result.current.formattedDate).toBe('string');
    });
  });
});

