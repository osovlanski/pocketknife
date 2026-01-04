/**
 * ToDo Controller
 * 
 * Handles HTTP requests for task management, routine learning,
 * and Google Calendar integration.
 */

import { Request, Response } from 'express';
import { todoAgent } from '../agents/ToDoAgent';
import { databaseService } from '../services/core/databaseService';

/**
 * Get the effective user ID (from request or default user)
 */
const getEffectiveUserId = async (requestUserId?: string): Promise<string | null> => {
  if (requestUserId && requestUserId !== 'default-user') {
    return requestUserId;
  }
  const defaultUser = await databaseService.getDefaultUser();
  return defaultUser?.id || null;
};

/**
 * Create a new task
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const { userId: requestUserId, ...taskData } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found. Please ensure database is configured.' });
    }

    const result = await todoAgent.execute({
      action: 'create-task',
      userId,
      taskData
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId: requestUserId, ...taskData } = req.body;
    const userId = await getEffectiveUserId(requestUserId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'update-task',
      userId,
      taskId: id,
      taskData
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'delete-task',
      userId,
      taskId: id
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

/**
 * Get tasks with optional filters
 */
export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const filters = {
      status: req.query.status as string,
      category: req.query.category as string,
      priority: req.query.priority as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      includeCompleted: req.query.includeCompleted === 'true'
    };

    const result = await todoAgent.execute({
      action: 'get-tasks',
      userId,
      filters
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
};

/**
 * Complete a task
 */
export const completeTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'complete-task',
      userId,
      taskId: id
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

/**
 * Uncomplete a task (mark as pending again)
 */
export const uncompleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'uncomplete-task',
      userId,
      taskId: id
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Uncomplete task error:', error);
    res.status(500).json({ error: 'Failed to uncomplete task' });
  }
};

/**
 * Get daily agenda
 */
export const getDailyAgenda = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const date = req.query.date as string;

    const result = await todoAgent.execute({
      action: 'get-daily-agenda',
      userId,
      date
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get daily agenda error:', error);
    res.status(500).json({ error: 'Failed to get daily agenda' });
  }
};

/**
 * Sync with Google Calendar
 */
export const syncCalendar = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'sync-calendar',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Sync calendar error:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
};

/**
 * Get suggested routines
 */
export const getSuggestedRoutines = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'get-suggested-routines',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Get suggested routines error:', error);
    res.status(500).json({ error: 'Failed to get suggested routines' });
  }
};

/**
 * Approve a routine pattern
 */
export const approveRoutine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'approve-routine',
      userId,
      routineId: id
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Approve routine error:', error);
    res.status(500).json({ error: 'Failed to approve routine' });
  }
};

/**
 * Dismiss a routine pattern
 */
export const dismissRoutine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'dismiss-routine',
      userId,
      routineId: id
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Dismiss routine error:', error);
    res.status(500).json({ error: 'Failed to dismiss routine' });
  }
};

/**
 * Learn patterns from task history
 */
export const learnPatterns = async (req: Request, res: Response) => {
  try {
    const userId = await getEffectiveUserId(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await todoAgent.execute({
      action: 'learn-patterns',
      userId
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Learn patterns error:', error);
    res.status(500).json({ error: 'Failed to learn patterns' });
  }
};

