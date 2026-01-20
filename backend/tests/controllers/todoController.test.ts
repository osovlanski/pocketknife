/**
 * ToDo Controller Tests
 * 
 * Tests for the ToDo controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/agents/ToDoAgent', () => ({
  todoAgent: {
    execute: vi.fn()
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'default-user-id', email: 'test@test.com' })
  }
}));

describe('ToDo Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { task: { id: 'task-1', title: 'Test Task' } }
      });
      
      const { createTask } = await import('../../src/controllers/todoController');
      
      mockReq.body = {
        userId: 'user-123',
        title: 'Test Task',
        priority: 'high'
      };

      await createTask(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when user not found', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      (databaseService.getDefaultUser as any).mockResolvedValue(null);
      
      const { createTask } = await import('../../src/controllers/todoController');
      
      mockReq.body = { title: 'Test Task' };

      await createTask(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when agent returns error', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: false,
        error: 'Task data is required'
      });
      
      const { createTask } = await import('../../src/controllers/todoController');
      
      mockReq.body = { userId: 'user-123' };

      await createTask(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockRejectedValue(new Error('Unexpected error'));
      
      const { createTask } = await import('../../src/controllers/todoController');
      
      mockReq.body = { userId: 'user-123', title: 'Test' };

      await createTask(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { task: { id: 'task-1', title: 'Updated Task' } }
      });
      
      const { updateTask } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'task-1' };
      mockReq.body = { userId: 'user-123', title: 'Updated Task' };

      await updateTask(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when user not found', async () => {
      const { databaseService } = await import('../../src/services/core/databaseService');
      (databaseService.getDefaultUser as any).mockResolvedValue(null);
      
      const { updateTask } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'task-1' };
      mockReq.body = { title: 'Updated' };

      await updateTask(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: {}
      });
      
      const { deleteTask } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'task-1' };
      mockReq.query = { userId: 'user-123' };

      await deleteTask(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getTasks', () => {
    it('should get tasks successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { tasks: [{ id: 'task-1', title: 'Test' }] }
      });
      
      const { getTasks } = await import('../../src/controllers/todoController');
      
      mockReq.query = { userId: 'user-123' };

      await getTasks(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { tasks: [] }
      });
      
      const { getTasks } = await import('../../src/controllers/todoController');
      
      mockReq.query = { userId: 'user-123', status: 'pending' };

      await getTasks(mockReq as Request, mockRes as Response);

      expect(todoAgent.execute).toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    it('should complete task successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { task: { id: 'task-1', status: 'completed' } }
      });
      
      const { completeTask } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'task-1' };
      mockReq.body = { userId: 'user-123' };

      await completeTask(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('uncompleteTask', () => {
    it('should uncomplete task successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { task: { id: 'task-1', status: 'pending' } }
      });
      
      const { uncompleteTask } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'task-1' };
      mockReq.body = { userId: 'user-123' };

      await uncompleteTask(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getDailyAgenda', () => {
    it('should get daily agenda successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { agenda: { date: '2026-01-20', tasks: [] } }
      });
      
      const { getDailyAgenda } = await import('../../src/controllers/todoController');
      
      mockReq.query = { userId: 'user-123', date: '2026-01-20' };

      await getDailyAgenda(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('syncCalendar', () => {
    it('should sync calendar successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { syncResult: { synced: 5, errors: 0 } }
      });
      
      const { syncCalendar } = await import('../../src/controllers/todoController');
      
      mockReq.body = { userId: 'user-123' };

      await syncCalendar(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('learnPatterns', () => {
    it('should learn patterns successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { routines: [] }
      });
      
      const { learnPatterns } = await import('../../src/controllers/todoController');
      
      mockReq.body = { userId: 'user-123' };

      await learnPatterns(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getSuggestedRoutines', () => {
    it('should get suggested routines', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { suggestedRoutines: [] }
      });
      
      const { getSuggestedRoutines } = await import('../../src/controllers/todoController');
      
      mockReq.query = { userId: 'user-123' };

      await getSuggestedRoutines(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('approveRoutine', () => {
    it('should approve routine successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { routine: { id: 'routine-1', status: 'approved' } }
      });
      
      const { approveRoutine } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'routine-1' };
      mockReq.body = { userId: 'user-123' };

      await approveRoutine(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('dismissRoutine', () => {
    it('should dismiss routine successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: {}
      });
      
      const { dismissRoutine } = await import('../../src/controllers/todoController');
      
      mockReq.params = { id: 'routine-1' };
      mockReq.body = { userId: 'user-123' };

      await dismissRoutine(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('importCalendarEvent', () => {
    it('should import calendar event successfully', async () => {
      const { todoAgent } = await import('../../src/agents/ToDoAgent');
      (todoAgent.execute as any).mockResolvedValue({
        success: true,
        data: { task: { id: 'task-1', title: 'Meeting' } }
      });
      
      const { importCalendarEvent } = await import('../../src/controllers/todoController');
      
      mockReq.body = {
        userId: 'user-123',
        eventId: 'event-1',
        event: { title: 'Meeting', start: '2026-01-20T10:00:00Z' }
      };

      await importCalendarEvent(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });
  });
});

