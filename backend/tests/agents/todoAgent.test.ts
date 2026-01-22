/**
 * ToDoAgent Tests
 * 
 * Tests for the ToDo Agent that manages tasks, routines, and Google Calendar integration.
 * This includes regression tests for the calendar sync bug.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available before vi.mock factories run
const { mockPrisma, mockCalendarService } = vi.hoisted(() => ({
  mockPrisma: {
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args: any) => ({
        id: 'task-123',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      update: vi.fn().mockImplementation((args: any) => ({
        id: args.where.id,
        ...args.data,
        updatedAt: new Date()
      })),
      delete: vi.fn().mockResolvedValue({ id: 'task-123' })
    },
    routinePattern: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({})
    },
    calendarSync: {
      upsert: vi.fn().mockResolvedValue({})
    },
    agentActivity: {
      create: vi.fn().mockResolvedValue({})
    }
  },
  mockCalendarService: {
    isAvailable: vi.fn().mockReturnValue(true),
    hasCalendarPermissions: vi.fn().mockReturnValue(true),
    createEvent: vi.fn().mockResolvedValue('event-123'),
    updateEvent: vi.fn().mockResolvedValue(true),
    deleteEvent: vi.fn().mockResolvedValue(true),
    getEvents: vi.fn().mockResolvedValue([]),
    getDayEvents: vi.fn().mockResolvedValue([])
  }
}));

// Mock telemetryService to prevent actual telemetry calls
vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    recordRateLimitHit: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn(),
    recordEvent: vi.fn(),
    recordGauge: vi.fn(),
    recordHistogram: vi.fn(),
    recordCounter: vi.fn(),
    init: vi.fn(),
    shutdown: vi.fn(),
  },
}));

// Mock logger to prevent actual console output during tests
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    api: vi.fn(),
    found: vi.fn(),
    init: vi.fn(),
    start: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn(),
    skip: vi.fn(),
    timed: vi.fn(() => ({ end: vi.fn() })),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fail: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      agent: vi.fn(),
    })),
    ICONS: {},
  },
}));

// Mock retry utilities to prevent actual delays
vi.mock('../../src/utils/retry', () => {
  class MockRateLimiter {
    async acquire(): Promise<boolean> { return true; }
    async waitForToken(): Promise<void> { return; }
    getAvailableTokens(): number { return 60; }
  }
  
  class MockCircuitBreaker {
    async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
    getState(): string { return 'closed'; }
    reset(): void {}
  }

  return {
    withRetry: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    RateLimiter: MockRateLimiter,
    CircuitBreaker: MockCircuitBreaker,
    isDefaultRetryable: () => false
  };
});

vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' }),
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: (key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      if (key.includes('rateLimit')) return defaultValue || 30;
      return defaultValue ?? 10;
    }
  }
}));

vi.mock('../../src/services/core/claudeService', () => ({
  default: {
    generateText: vi.fn().mockResolvedValue('{}')
  }
}));

vi.mock('../../src/services/calendar/calendarService', () => ({
  default: mockCalendarService
}));

// Static import after mocks are set up
import { ToDoAgent } from '../../src/agents/ToDoAgent';

describe('ToDoAgent', () => {
  let todoAgent: ToDoAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    todoAgent = new ToDoAgent();
    // Reset calendar service mocks to defaults
    mockCalendarService.isAvailable.mockReturnValue(true);
    mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
    mockCalendarService.createEvent.mockResolvedValue('event-123');
    mockCalendarService.updateEvent.mockResolvedValue(true);
    mockCalendarService.deleteEvent.mockResolvedValue(true);
    mockCalendarService.getEvents.mockResolvedValue([]);
    mockCalendarService.getDayEvents.mockResolvedValue([]);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(todoAgent.metadata.id).toBe('todo');
      expect(todoAgent.metadata.name).toBe('ToDo Agent');
      expect(todoAgent.metadata.icon).toBe('✅');
    });
  });

  describe('create-task action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'create-task',
        taskData: { title: 'Test Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require taskData', async () => {
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task data is required');
    });
    
    it('should create task successfully', async () => {
      // Reset mock to ensure clean state
      mockPrisma.task.findFirst.mockResolvedValue(null);
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Test Task',
          priority: 'high',
          dueDate: '2026-01-20'
        }
      });
      
      expect(result.success).toBe(true);
      // Task is returned by prisma.task.create mock
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });
    
    it('should detect duplicate tasks on same date', async () => {
      // Mock existing task
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'existing-task',
        title: 'Test Task',
        dueDate: new Date('2026-01-20')
      });
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Test Task',
          dueDate: '2026-01-20'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists for this date');
    });
    
    it('should NOT create calendar event when syncEnabled is false', async () => {
      mockCalendarService.createEvent.mockClear();
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Non-synced Task',
          dueDate: '2026-01-20',
          syncEnabled: false
        }
      });
      
      expect(result.success).toBe(true);
      // Calendar should not be called when syncEnabled is false
      expect(mockCalendarService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('sync-calendar action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'sync-calendar'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should return error when calendar is not available', async () => {
      mockCalendarService.isAvailable.mockReturnValue(false);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });
    
    it('should return error when calendar permissions not granted', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(false);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('NEEDS_REAUTH');
    });
    
    /**
     * REGRESSION TEST: This tests the fix for the calendar sync bug.
     * The bug was that syncCalendar was syncing ALL tasks, not just those with syncEnabled: true.
     */
    it('should ONLY sync tasks with syncEnabled: true (REGRESSION TEST)', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
      
      // Mock tasks - one with syncEnabled: true, one with syncEnabled: false
      const tasksWithSync = [
        { id: 'task-1', title: 'Synced Task', syncEnabled: true, dueDate: new Date(), priority: 'medium', googleEventId: null }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksWithSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      
      // Verify the query includes syncEnabled: true filter
      const findManyCall = mockPrisma.task.findMany.mock.calls[0][0];
      expect(findManyCall.where.syncEnabled).toBe(true);
    });
    
    it('should create calendar events for tasks without googleEventId', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
      mockCalendarService.createEvent.mockResolvedValue('new-event-id');
      
      const tasksToSync = [
        { 
          id: 'task-1', 
          title: 'New Task', 
          syncEnabled: true, 
          dueDate: new Date(),
          dueTime: '10:00',
          duration: 30,
          priority: 'high',
          category: 'work',
          googleEventId: null 
        }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockCalendarService.createEvent).toHaveBeenCalled();
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({
            googleEventId: 'new-event-id'
          })
        })
      );
    });
    
    it('should update existing calendar events for tasks with googleEventId', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
      mockCalendarService.updateEvent.mockResolvedValue(true);
      
      const tasksToSync = [
        { 
          id: 'task-1', 
          title: 'Existing Task', 
          syncEnabled: true, 
          dueDate: new Date(),
          priority: 'medium',
          googleEventId: 'existing-event-id' 
        }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(
        'existing-event-id',
        expect.objectContaining({
          id: 'task-1',
          title: 'Existing Task'
        })
      );
    });
    
    it('should handle sync errors gracefully', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
      mockCalendarService.createEvent.mockResolvedValue(null); // Simulate failure
      
      const tasksToSync = [
        { id: 'task-1', title: 'Failing Task', syncEnabled: true, dueDate: new Date(), priority: 'medium', googleEventId: null }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.syncResult?.errors).toBe(1);
    });
    
    it('should return syncResult with counts', async () => {
      mockCalendarService.isAvailable.mockReturnValue(true);
      mockCalendarService.hasCalendarPermissions.mockReturnValue(true);
      mockCalendarService.createEvent.mockResolvedValue('event-id');
      
      const tasksToSync = [
        { id: 'task-1', title: 'Task 1', syncEnabled: true, dueDate: new Date(), priority: 'medium', googleEventId: null },
        { id: 'task-2', title: 'Task 2', syncEnabled: true, dueDate: new Date(), priority: 'high', googleEventId: null }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.syncResult).toBeDefined();
      expect(result.data?.syncResult?.synced).toBe(2);
      expect(result.data?.syncResult?.errors).toBe(0);
    });
  });

  describe('complete-task action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'complete-task',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require taskId', async () => {
      const result = await todoAgent.execute({
        action: 'complete-task',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task ID is required');
    });
    
    it('should mark task as completed', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-123',
        completedCount: 0
      });
      
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-123',
        title: 'Test Task',
        status: 'completed',
        completedAt: new Date()
      });
      
      const result = await todoAgent.execute({
        action: 'complete-task',
        userId: 'user-123',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed'
          })
        })
      );
    });
  });

  describe('get-tasks action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'get-tasks'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should return tasks for user', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Task 1', status: 'pending' },
        { id: 'task-2', title: 'Task 2', status: 'pending' }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      
      const result = await todoAgent.execute({
        action: 'get-tasks',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(2);
    });
    
    it('should apply filters correctly', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      
      await todoAgent.execute({
        action: 'get-tasks',
        userId: 'user-123',
        filters: {
          status: 'pending',
          category: 'work',
          priority: 'high',
          includeCompleted: false
        }
      });
      
      expect(mockPrisma.task.findMany).toHaveBeenCalled();
    });
  });

  describe('get-daily-agenda action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'get-daily-agenda'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should return agenda for today by default', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      
      const result = await todoAgent.execute({
        action: 'get-daily-agenda',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.agenda).toBeDefined();
      expect(result.data?.agenda?.date).toBeDefined();
    });
    
    it('should return agenda for specific date', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      
      const result = await todoAgent.execute({
        action: 'get-daily-agenda',
        userId: 'user-123',
        date: '2026-01-25'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.agenda?.date).toBe('2026-01-25');
    });
  });

  describe('update-task action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'update-task',
        taskId: 'task-123',
        taskData: { title: 'Updated Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require taskId', async () => {
      const result = await todoAgent.execute({
        action: 'update-task',
        userId: 'user-123',
        taskData: { title: 'Updated Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task ID is required');
    });
    
    it('should update task successfully', async () => {
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-123',
        title: 'Updated Task',
        priority: 'high',
        updatedAt: new Date()
      });
      
      const result = await todoAgent.execute({
        action: 'update-task',
        userId: 'user-123',
        taskId: 'task-123',
        taskData: {
          title: 'Updated Task',
          priority: 'high'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.task?.title).toBe('Updated Task');
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-123', userId: 'user-123' }
        })
      );
    });
    
    it('should handle update errors', async () => {
      mockPrisma.task.update.mockRejectedValue(new Error('Task not found'));
      
      const result = await todoAgent.execute({
        action: 'update-task',
        userId: 'user-123',
        taskId: 'non-existent-task',
        taskData: { title: 'Updated Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task not found');
    });
  });

  describe('delete-task action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'delete-task',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require taskId', async () => {
      const result = await todoAgent.execute({
        action: 'delete-task',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task ID is required');
    });
    
    it('should delete task successfully', async () => {
      mockPrisma.task.delete.mockResolvedValue({ id: 'task-123' });
      
      const result = await todoAgent.execute({
        action: 'delete-task',
        userId: 'user-123',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-123', userId: 'user-123' }
      });
    });
    
    it('should handle delete errors', async () => {
      mockPrisma.task.delete.mockRejectedValue(new Error('Task not found'));
      
      const result = await todoAgent.execute({
        action: 'delete-task',
        userId: 'user-123',
        taskId: 'non-existent-task'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task not found');
    });
  });

  describe('uncomplete-task action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'uncomplete-task',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require taskId', async () => {
      const result = await todoAgent.execute({
        action: 'uncomplete-task',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Task ID is required');
    });
    
    it('should mark completed task as pending', async () => {
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-123',
        title: 'Test Task',
        status: 'pending',
        completedAt: null
      });
      
      const result = await todoAgent.execute({
        action: 'uncomplete-task',
        userId: 'user-123',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            completedAt: null
          })
        })
      );
    });
  });

  describe('get-suggested-routines action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'get-suggested-routines'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should return suggested routines with high confidence', async () => {
      const mockRoutines = [
        { id: 'routine-1', patternName: 'Morning workout', confidence: 0.8, isApproved: false, isDismissed: false },
        { id: 'routine-2', patternName: 'Evening reading', confidence: 0.7, isApproved: false, isDismissed: false }
      ];
      
      mockPrisma.routinePattern.findMany.mockResolvedValue(mockRoutines);
      
      const result = await todoAgent.execute({
        action: 'get-suggested-routines',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.suggestedRoutines).toHaveLength(2);
      expect(mockPrisma.routinePattern.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            isApproved: false,
            isDismissed: false,
            confidence: { gte: 0.6 }
          })
        })
      );
    });
    
    it('should return empty array when no routines found', async () => {
      mockPrisma.routinePattern.findMany.mockResolvedValue([]);
      
      const result = await todoAgent.execute({
        action: 'get-suggested-routines',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.suggestedRoutines).toHaveLength(0);
    });
  });

  describe('approve-routine action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'approve-routine',
        routineId: 'routine-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require routineId', async () => {
      const result = await todoAgent.execute({
        action: 'approve-routine',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Routine ID is required');
    });
    
    it('should approve routine successfully', async () => {
      mockPrisma.routinePattern.update.mockResolvedValue({
        id: 'routine-123',
        isApproved: true
      });
      
      const result = await todoAgent.execute({
        action: 'approve-routine',
        userId: 'user-123',
        routineId: 'routine-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.routinePattern.update).toHaveBeenCalledWith({
        where: { id: 'routine-123' },
        data: { isApproved: true }
      });
    });
  });

  describe('dismiss-routine action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'dismiss-routine',
        routineId: 'routine-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require routineId', async () => {
      const result = await todoAgent.execute({
        action: 'dismiss-routine',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Routine ID is required');
    });
    
    it('should dismiss routine successfully', async () => {
      mockPrisma.routinePattern.update.mockResolvedValue({
        id: 'routine-123',
        isDismissed: true
      });
      
      const result = await todoAgent.execute({
        action: 'dismiss-routine',
        userId: 'user-123',
        routineId: 'routine-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.routinePattern.update).toHaveBeenCalledWith({
        where: { id: 'routine-123' },
        data: { isDismissed: true }
      });
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await todoAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
