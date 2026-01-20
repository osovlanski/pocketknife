/**
 * ToDoAgent Tests
 * 
 * Tests for the ToDo Agent that manages tasks, routines, and Google Calendar integration.
 * This includes regression tests for the calendar sync bug.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' })
  }
}));

vi.mock('../../src/services/core/claudeService', () => ({
  default: {
    generateText: vi.fn().mockResolvedValue('{}')
  }
}));

vi.mock('../../src/services/calendar/calendarService', () => ({
  default: {
    isAvailable: vi.fn().mockReturnValue(true),
    hasCalendarPermissions: vi.fn().mockReturnValue(true),
    createEvent: vi.fn().mockResolvedValue('event-123'),
    updateEvent: vi.fn().mockResolvedValue(true),
    deleteEvent: vi.fn().mockResolvedValue(true),
    getEvents: vi.fn().mockResolvedValue([]),
    getDayEvents: vi.fn().mockResolvedValue([])
  }
}));

describe('ToDoAgent', () => {
  let todoAgent: any;
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      task: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((args) => ({
          id: 'task-123',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        update: vi.fn().mockImplementation((args) => ({
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
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
    
    const { ToDoAgent } = await import('../../src/agents/ToDoAgent');
    todoAgent = new ToDoAgent();
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
      expect(result.data?.task).toBeDefined();
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.createEvent as any).mockClear();
      
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
      expect(calendarService.createEvent).not.toHaveBeenCalled();
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(false);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });
    
    it('should return error when calendar permissions not granted', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(false);
      
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockResolvedValue('new-event-id');
      
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
      expect(calendarService.createEvent).toHaveBeenCalled();
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.updateEvent as any).mockResolvedValue(true);
      
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
      expect(calendarService.updateEvent).toHaveBeenCalledWith(
        'existing-event-id',
        expect.objectContaining({
          id: 'task-1',
          title: 'Existing Task'
        })
      );
    });
    
    it('should handle sync errors gracefully', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockResolvedValue(null); // Simulate failure
      
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
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockResolvedValue('event-id');
      
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

  describe('learn-patterns action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'learn-patterns'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should return 0 patterns when not enough tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 'task-1', title: 'Task 1', status: 'completed', completedAt: new Date() }
      ]); // Less than 5 tasks
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.patternsLearned).toBe(0);
    });
    
    it('should analyze patterns when enough tasks exist', async () => {
      const claudeService = (await import('../../src/services/core/claudeService')).default;
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      
      // Mock enough completed tasks
      const completedTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'completed',
        completedAt: new Date(),
        category: 'work',
        duration: 30
      }));
      
      mockPrisma.task.findMany.mockResolvedValue(completedTasks);
      (calendarService.isAvailable as any).mockReturnValue(false);
      
      // Mock Claude response
      (claudeService.generateText as any).mockResolvedValue(JSON.stringify({
        patterns: [
          {
            patternName: 'Morning Tasks',
            description: 'Tasks done in the morning',
            dayOfWeek: ['monday', 'wednesday', 'friday'],
            timeSlot: 'morning',
            preferredTime: '09:00',
            taskTemplate: {
              title: 'Morning check-in',
              category: 'work',
              duration: 15
            },
            confidence: 0.8
          }
        ]
      }));
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.patternsLearned).toBe(1);
      expect(mockPrisma.routinePattern.upsert).toHaveBeenCalled();
    });
    
    it('should not save patterns with low confidence', async () => {
      const claudeService = (await import('../../src/services/core/claudeService')).default;
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      
      const completedTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'completed',
        completedAt: new Date()
      }));
      
      mockPrisma.task.findMany.mockResolvedValue(completedTasks);
      (calendarService.isAvailable as any).mockReturnValue(false);
      
      // Mock Claude response with low confidence
      (claudeService.generateText as any).mockResolvedValue(JSON.stringify({
        patterns: [
          {
            patternName: 'Low Confidence Pattern',
            confidence: 0.3 // Below 0.6 threshold
          }
        ]
      }));
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.patternsLearned).toBe(0);
    });
  });

  describe('import-calendar-event action', () => {
    it('should require userId', async () => {
      const result = await todoAgent.execute({
        action: 'import-calendar-event',
        calendarEventData: {
          id: 'event-123',
          title: 'Meeting',
          start: '2026-01-20T10:00:00Z',
          end: '2026-01-20T11:00:00Z',
          isAllDay: false
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
    
    it('should require calendarEventData', async () => {
      const result = await todoAgent.execute({
        action: 'import-calendar-event',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Calendar event data is required');
    });
    
    it('should import calendar event as task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null); // No existing import
      mockPrisma.task.create.mockResolvedValue({
        id: 'task-123',
        title: 'Team Meeting',
        dueDate: new Date('2026-01-20T10:00:00Z'),
        googleEventId: 'event-123'
      });
      
      const result = await todoAgent.execute({
        action: 'import-calendar-event',
        userId: 'user-123',
        calendarEventData: {
          id: 'event-123',
          title: 'Team Meeting',
          description: 'Weekly sync',
          start: '2026-01-20T10:00:00Z',
          end: '2026-01-20T11:00:00Z',
          isAllDay: false
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.task).toBeDefined();
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          title: 'Team Meeting',
          googleEventId: 'event-123',
          syncEnabled: false,
          tags: ['calendar-import']
        })
      });
    });
    
    it('should return existing task if event already imported', async () => {
      const existingTask = {
        id: 'existing-task',
        title: 'Team Meeting',
        googleEventId: 'event-123'
      };
      
      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      
      const result = await todoAgent.execute({
        action: 'import-calendar-event',
        userId: 'user-123',
        calendarEventData: {
          id: 'event-123',
          title: 'Team Meeting',
          start: '2026-01-20T10:00:00Z',
          end: '2026-01-20T11:00:00Z',
          isAllDay: false
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.task?.id).toBe('existing-task');
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });
    
    it('should handle all-day events correctly', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockImplementation((args) => ({
        id: 'task-123',
        ...args.data
      }));
      
      const result = await todoAgent.execute({
        action: 'import-calendar-event',
        userId: 'user-123',
        calendarEventData: {
          id: 'event-123',
          title: 'Holiday',
          start: '2026-01-20T00:00:00Z',
          end: '2026-01-21T00:00:00Z',
          isAllDay: true
        }
      });
      
      expect(result.success).toBe(true);
      // All-day events should not have a specific time
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueTime: undefined
        })
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

  describe('create-task with calendar sync', () => {
    it('should create calendar event when syncEnabled is true', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockResolvedValue('new-event-id');
      
      mockPrisma.task.findFirst.mockResolvedValue(null); // No duplicate
      mockPrisma.task.create.mockImplementation((args) => ({
        id: 'task-123',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Synced Task',
          dueDate: '2026-01-20',
          dueTime: '10:00',
          syncEnabled: true
        }
      });
      
      expect(result.success).toBe(true);
      expect(calendarService.createEvent).toHaveBeenCalled();
    });
    
    it('should handle calendar creation failure gracefully', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockResolvedValue(null); // Simulate failure
      
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockImplementation((args) => ({
        id: 'task-123',
        ...args.data
      }));
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Synced Task',
          dueDate: '2026-01-20',
          syncEnabled: true
        }
      });
      
      // Task should still be created even if calendar sync fails
      expect(result.success).toBe(true);
      expect(result.data?.task).toBeDefined();
    });
    
    it('should skip calendar sync when calendar service is not available', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(false);
      (calendarService.createEvent as any).mockClear();
      
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockImplementation((args) => ({
        id: 'task-123',
        ...args.data
      }));
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: {
          title: 'Synced Task',
          dueDate: '2026-01-20',
          syncEnabled: true
        }
      });
      
      expect(result.success).toBe(true);
      // Calendar event should not be created when service is unavailable
      expect(calendarService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('complete-task with recurring tasks', () => {
    it('should create next occurrence for recurring task', async () => {
      const recurringTask = {
        id: 'task-123',
        title: 'Daily Standup',
        isRecurring: true,
        recurrenceRule: 'daily',
        dueDate: new Date('2026-01-20'),
        dueTime: '09:00',
        completedCount: 0,
        status: 'pending',
        syncEnabled: false,
        sourceType: 'manual',
        category: 'work',
        priority: 'medium',
        tags: []
      };
      
      mockPrisma.task.findUnique.mockResolvedValue(recurringTask);
      mockPrisma.task.update.mockResolvedValue({
        ...recurringTask,
        status: 'completed',
        completedAt: new Date()
      });
      mockPrisma.task.create.mockResolvedValue({
        id: 'task-124',
        ...recurringTask,
        dueDate: new Date('2026-01-21'),
        status: 'pending'
      });
      
      const result = await todoAgent.execute({
        action: 'complete-task',
        userId: 'user-123',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(true);
      // Should create the next occurrence
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });
    
    it('should handle weekly recurrence correctly', async () => {
      const recurringTask = {
        id: 'task-123',
        title: 'Weekly Review',
        isRecurring: true,
        recurrenceRule: 'weekly',
        dueDate: new Date('2026-01-20'),
        dueTime: '10:00',
        completedCount: 0,
        status: 'pending',
        syncEnabled: false,
        sourceType: 'manual'
      };
      
      mockPrisma.task.findUnique.mockResolvedValue(recurringTask);
      mockPrisma.task.update.mockResolvedValue({
        ...recurringTask,
        status: 'completed',
        completedAt: new Date()
      });
      mockPrisma.task.create.mockImplementation((args) => ({
        id: 'task-124',
        ...args.data
      }));
      
      const result = await todoAgent.execute({
        action: 'complete-task',
        userId: 'user-123',
        taskId: 'task-123'
      });
      
      expect(result.success).toBe(true);
      // Verify next occurrence was created with correct date (7 days later)
      const createCall = mockPrisma.task.create.mock.calls[0];
      if (createCall) {
        const newDueDate = createCall[0].data.dueDate;
        expect(newDueDate.getDate()).toBe(27); // Jan 20 + 7 = Jan 27
      }
    });
  });

  describe('sync-calendar NEEDS_REAUTH handling', () => {
    it('should handle Insufficient Permission error during sync', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockRejectedValue(
        new Error('Insufficient Permission')
      );
      
      const tasksToSync = [
        { id: 'task-1', title: 'Task 1', syncEnabled: true, dueDate: new Date(), priority: 'medium', googleEventId: null }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('NEEDS_REAUTH');
      expect(result.data?.syncResult?.needsReauth).toBe(true);
    });
    
    it('should handle NEEDS_REAUTH error during sync', async () => {
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.hasCalendarPermissions as any).mockReturnValue(true);
      (calendarService.createEvent as any).mockRejectedValue(
        new Error('NEEDS_REAUTH: Token expired')
      );
      
      const tasksToSync = [
        { id: 'task-1', title: 'Task 1', syncEnabled: true, dueDate: new Date(), priority: 'medium', googleEventId: null }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(tasksToSync);
      
      const result = await todoAgent.execute({
        action: 'sync-calendar',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('NEEDS_REAUTH');
    });
  });

  describe('learn-patterns with calendar integration', () => {
    it('should include calendar busy times in pattern analysis', async () => {
      const claudeService = (await import('../../src/services/core/claudeService')).default;
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      
      // Mock enough completed tasks
      const completedTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'completed',
        completedAt: new Date(),
        category: 'work'
      }));
      
      // Mock calendar with busy times
      const calendarEvents = [
        {
          id: 'event-1',
          title: 'Daily Standup',
          start: new Date('2026-01-20T09:00:00Z'),
          end: new Date('2026-01-20T09:30:00Z'),
          isAllDay: false
        }
      ];
      
      mockPrisma.task.findMany.mockResolvedValue(completedTasks);
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.getEvents as any).mockResolvedValue(calendarEvents);
      
      // Mock Claude response
      (claudeService.generateText as any).mockResolvedValue(JSON.stringify({
        patterns: [
          {
            patternName: 'Morning Tasks',
            description: 'Tasks done in the morning',
            dayOfWeek: ['monday'],
            timeSlot: 'morning',
            preferredTime: '08:00', // Before standup
            calendarConflict: false,
            taskTemplate: { title: 'Morning check', category: 'work', duration: 15 },
            confidence: 0.8
          }
        ]
      }));
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.patternsLearned).toBe(1);
      expect(calendarService.getEvents).toHaveBeenCalled();
    });
    
    it('should handle calendar error gracefully during pattern learning', async () => {
      const claudeService = (await import('../../src/services/core/claudeService')).default;
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      
      const completedTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'completed',
        completedAt: new Date()
      }));
      
      mockPrisma.task.findMany.mockResolvedValue(completedTasks);
      (calendarService.isAvailable as any).mockReturnValue(true);
      (calendarService.getEvents as any).mockRejectedValue(new Error('Calendar API error'));
      
      // Mock Claude response
      (claudeService.generateText as any).mockResolvedValue(JSON.stringify({
        patterns: [
          {
            patternName: 'Morning Tasks',
            confidence: 0.8,
            taskTemplate: { title: 'Morning check', category: 'work' }
          }
        ]
      }));
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      // Should still succeed even if calendar fails
      expect(result.success).toBe(true);
    });
    
    it('should handle malformed Claude response', async () => {
      const claudeService = (await import('../../src/services/core/claudeService')).default;
      const calendarService = (await import('../../src/services/calendar/calendarService')).default;
      
      const completedTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'completed',
        completedAt: new Date()
      }));
      
      mockPrisma.task.findMany.mockResolvedValue(completedTasks);
      (calendarService.isAvailable as any).mockReturnValue(false);
      (claudeService.generateText as any).mockResolvedValue('invalid json response');
      
      const result = await todoAgent.execute({
        action: 'learn-patterns',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('get-tasks with various filters', () => {
    it('should filter by date range', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 'task-1', title: 'Task 1', dueDate: new Date('2026-01-20'), status: 'pending' }
      ]);
      
      const result = await todoAgent.execute({
        action: 'get-tasks',
        userId: 'user-123',
        filters: {
          dateFrom: '2026-01-15',
          dateTo: '2026-01-25'
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });
    
    it('should include completed tasks when requested', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 'task-1', title: 'Task 1', status: 'completed' },
        { id: 'task-2', title: 'Task 2', status: 'pending' }
      ]);
      
      const result = await todoAgent.execute({
        action: 'get-tasks',
        userId: 'user-123',
        filters: {
          includeCompleted: true
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle database unavailable for create-task', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: { title: 'Test Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore for other tests
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
    
    it('should handle database error during task creation', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockRejectedValue(new Error('Database connection lost'));
      
      const result = await todoAgent.execute({
        action: 'create-task',
        userId: 'user-123',
        taskData: { title: 'Test Task' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection lost');
    });
  });
});

