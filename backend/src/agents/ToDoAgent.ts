/**
 * ToDo Agent
 * 
 * Manages tasks, learns routine patterns, and integrates with Google Calendar.
 * 
 * Features:
 * - Manual task CRUD operations
 * - Routine pattern learning from user behavior
 * - Google Calendar sync (bidirectional)
 * - AI-powered task suggestions
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getManifest } from './manifests';
import { getPrisma } from '../services/core/databaseService';
import claudeService from '../services/core/claudeService';
import calendarService from '../services/calendar/calendarService';
import { configService } from '../services/core/configService';

interface ToDoParams extends AgentParams {
  action: 
    | 'create-task' 
    | 'update-task' 
    | 'delete-task' 
    | 'get-tasks' 
    | 'complete-task'
    | 'uncomplete-task'
    | 'get-daily-agenda'
    | 'sync-calendar'
    | 'get-suggested-routines'
    | 'approve-routine'
    | 'dismiss-routine'
    | 'learn-patterns'
    | 'import-calendar-event';
  taskData?: TaskData;
  taskId?: string;
  routineId?: string;
  date?: string; // ISO date string for daily agenda
  filters?: TaskFilters;
  calendarEventId?: string; // For importing calendar events as tasks
  calendarEventData?: {
    id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    isAllDay: boolean;
  };
}

interface TaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  dueTime?: string;
  duration?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  category?: string;
  tags?: string[];
  syncEnabled?: boolean;
}

interface TaskFilters {
  status?: string;
  category?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCompleted?: boolean;
}

interface ToDoResult {
  task?: any;
  tasks?: any[];
  agenda?: DailyAgenda;
  suggestedRoutines?: any[];
  syncResult?: any;
  patternsLearned?: number;
}

interface DailyAgenda {
  date: string;
  tasks: any[];
  routineTasks: any[];
  suggestedTasks: any[];
  calendarEvents: CalendarEventForAgenda[];
  totalDuration: number;
  completedCount: number;
}

interface CalendarEventForAgenda {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isPocketknifeTask: boolean;
  htmlLink?: string;
}

export class ToDoAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = getManifest('todo');

  protected async run(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { action } = params;

    switch (action) {
      case 'create-task':
        return this.createTask(params);
      case 'update-task':
        return this.updateTask(params);
      case 'delete-task':
        return this.deleteTask(params);
      case 'get-tasks':
        return this.getTasks(params);
      case 'complete-task':
        return this.completeTask(params);
      case 'uncomplete-task':
        return this.uncompleteTask(params);
      case 'get-daily-agenda':
        return this.getDailyAgenda(params);
      case 'sync-calendar':
        return this.syncCalendar(params);
      case 'get-suggested-routines':
        return this.getSuggestedRoutines(params);
      case 'approve-routine':
        return this.approveRoutine(params);
      case 'dismiss-routine':
        return this.dismissRoutine(params);
      case 'learn-patterns':
        return this.learnPatterns(params);
      case 'import-calendar-event':
        return this.importCalendarEvent(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Create a new task with duplicate prevention
   */
  private async createTask(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, taskData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!taskData) return { success: false, error: 'Task data is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog(`📝 Creating task: ${taskData.title}`, 'info');

    try {
      // Check for duplicate tasks (same title, same date, not completed)
      const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
      
      if (dueDate) {
        const startOfDay = new Date(dueDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingTask = await prisma.task.findFirst({
          where: {
            userId,
            title: {
              equals: taskData.title,
              mode: 'insensitive'
            },
            dueDate: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: {
              not: 'completed'
            }
          }
        });

        if (existingTask) {
          this.emitLog(`⚠️ Duplicate task found: "${taskData.title}" already exists for this date`, 'warning');
          return { 
            success: false, 
            error: `A task with title "${taskData.title}" already exists for this date. Please use a different title or update the existing task.` 
          };
        }
      }

      const task = await prisma.task.create({
        data: {
          userId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          status: 'pending',
          dueDate: dueDate,
          dueTime: taskData.dueTime,
          duration: taskData.duration,
          isRecurring: taskData.isRecurring || false,
          recurrenceRule: taskData.recurrenceRule,
          category: taskData.category,
          tags: taskData.tags || [],
          syncEnabled: taskData.syncEnabled || false,
          sourceType: 'manual'
        }
      });

      this.emitLog('✅ Task created', 'success');

      // If sync is enabled, create Google Calendar event
      if (taskData.syncEnabled && task.dueDate) {
        await this.createCalendarEvent(userId, task);
      }

      return { success: true, data: { task } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to create task: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing task
   */
  private async updateTask(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, taskId, taskData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const task = await prisma.task.update({
        where: { id: taskId, userId },
        data: {
          ...(taskData?.title && { title: taskData.title }),
          ...(taskData?.description !== undefined && { description: taskData.description }),
          ...(taskData?.priority && { priority: taskData.priority }),
          ...(taskData?.status && { status: taskData.status }),
          ...(taskData?.dueDate && { dueDate: new Date(taskData.dueDate) }),
          ...(taskData?.dueTime !== undefined && { dueTime: taskData.dueTime }),
          ...(taskData?.duration !== undefined && { duration: taskData.duration }),
          ...(taskData?.category !== undefined && { category: taskData.category }),
          ...(taskData?.tags && { tags: taskData.tags }),
          ...(taskData?.isRecurring !== undefined && { isRecurring: taskData.isRecurring }),
          ...(taskData?.recurrenceRule !== undefined && { recurrenceRule: taskData.recurrenceRule })
        }
      });

      this.emitLog('✅ Task updated', 'success');
      return { success: true, data: { task } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a task
   */
  private async deleteTask(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, taskId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      await prisma.task.delete({
        where: { id: taskId, userId }
      });

      this.emitLog('🗑️ Task deleted', 'info');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tasks with optional filters
   */
  private async getTasks(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const where: any = { userId };

      if (filters?.status) where.status = filters.status;
      if (filters?.category) where.category = filters.category;
      if (filters?.priority) where.priority = filters.priority;
      if (!filters?.includeCompleted) {
        where.status = { not: 'completed' };
      }
      if (filters?.dateFrom || filters?.dateTo) {
        where.dueDate = {};
        if (filters.dateFrom) where.dueDate.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.dueDate.lte = new Date(filters.dateTo);
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: configService.get('limits.todo.agent.tasks.maxResults', 100) as number
      });

      return { success: true, data: { tasks } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a task as completed
   */
  private async completeTask(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, taskId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
      
      const task = await prisma.task.update({
        where: { id: taskId, userId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedCount: (existingTask?.completedCount || 0) + 1
        }
      });

      this.emitLog(`✅ Task completed: ${task.title}`, 'success');

      // If recurring, create the next occurrence
      if (task.isRecurring && task.recurrenceRule) {
        await this.createNextRecurrence(userId, task);
      }

      return { success: true, data: { task } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a completed task as pending (uncomplete)
   */
  private async uncompleteTask(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, taskId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!taskId) return { success: false, error: 'Task ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const task = await prisma.task.update({
        where: { id: taskId, userId },
        data: {
          status: 'pending',
          completedAt: null
        }
      });

      this.emitLog(`↩️ Task marked as pending: ${task.title}`, 'info');

      return { success: true, data: { task } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get daily agenda with tasks, routines, calendar events, and suggestions
   */
  private async getDailyAgenda(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, date } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Get manual tasks for the day
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          dueDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          sourceType: 'manual'
        },
        orderBy: { dueTime: 'asc' }
      });

      // Get routine-based tasks
      const routineTasks = await prisma.task.findMany({
        where: {
          userId,
          dueDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          sourceType: 'routine'
        },
        orderBy: { dueTime: 'asc' }
      });

      // Get suggested tasks (AI-generated)
      const suggestedTasks = await prisma.task.findMany({
        where: {
          userId,
          dueDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          sourceType: 'suggested',
          status: 'pending'
        },
        orderBy: { confidence: 'desc' },
        take: configService.get('limits.todo.agent.suggestedTasks.maxResults', 5) as number
      });

      // Get Google Calendar events for the day
      let calendarEvents: CalendarEventForAgenda[] = [];
      try {
        const events = await calendarService.getDayEvents(targetDate);
        calendarEvents = events.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          start: e.start,
          end: e.end,
          isAllDay: e.isAllDay,
          isPocketknifeTask: e.isPocketknifeTask,
          htmlLink: e.htmlLink
        }));
      } catch (calError) {
        // Calendar errors shouldn't fail the entire agenda
        console.warn('Could not fetch calendar events:', calError);
      }

      const allTasks = [...tasks, ...routineTasks];
      const totalDuration = allTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
      const completedCount = allTasks.filter(t => t.status === 'completed').length;

      const agenda: DailyAgenda = {
        date: targetDate.toISOString().split('T')[0],
        tasks,
        routineTasks,
        suggestedTasks,
        calendarEvents,
        totalDuration,
        completedCount
      };

      return { success: true, data: { agenda } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync tasks with Google Calendar
   */
  private async syncCalendar(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('📅 Syncing with Google Calendar...', 'info');

    try {
      const prisma = getPrisma();
      if (!prisma) return { success: false, error: 'Database not available' };

      // Check if calendar service is available
      if (!calendarService.isAvailable()) {
        this.emitLog('⚠️ Google Calendar not connected. Please connect your Google account in Settings.', 'warning');
        return { 
          success: false, 
          error: 'Google Calendar not connected. Please connect your Google account in Settings and re-authenticate with Calendar permissions.' 
        };
      }

      // Check if we have calendar permissions
      if (!calendarService.hasCalendarPermissions()) {
        this.emitLog('⚠️ Calendar permissions not granted. Please re-authenticate with Google.', 'warning');
        return { 
          success: false, 
          error: 'NEEDS_REAUTH: Calendar permissions not granted. Please go to Settings > Google Integration and click "Sign In Again" to grant Calendar access.',
          data: {
            syncResult: {
              synced: 0,
              errors: 0,
              needsReauth: true,
              lastSyncAt: null
            }
          }
        };
      }

      // Get all pending tasks with due dates that have sync enabled
      const tasksToSync = await prisma.task.findMany({
        where: {
          userId,
          status: { not: 'completed' },
          dueDate: { not: null },
          syncEnabled: true
        },
        orderBy: { dueDate: 'asc' }
      });

      this.emitLog(`📅 Found ${tasksToSync.length} tasks to sync`, 'info');

      let syncedCount = 0;
      let errorCount = 0;

      // Sync each task
      for (const task of tasksToSync) {
        try {
          if (task.googleEventId) {
            // Update existing event
            const success = await calendarService.updateEvent(task.googleEventId, {
              id: task.id,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              dueTime: task.dueTime,
              duration: task.duration,
              priority: task.priority,
              category: task.category,
              googleEventId: task.googleEventId
            });
            
            if (success) {
              syncedCount++;
            } else {
              errorCount++;
            }
          } else {
            // Create new event
            const eventId = await calendarService.createEvent({
              id: task.id,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              dueTime: task.dueTime,
              duration: task.duration,
              priority: task.priority,
              category: task.category,
              googleEventId: null
            });

            if (eventId) {
              // Save the calendar event ID back to the task
              await prisma.task.update({
                where: { id: task.id },
                data: { 
                  googleEventId: eventId,
                  lastSyncedAt: new Date()
                }
              });
              syncedCount++;
              this.emitLog(`📅 Created event for: ${task.title}`, 'info');
            } else {
              errorCount++;
            }
          }
        } catch (error: any) {
          // Check if it's a permission error
          if (error.message?.includes('NEEDS_REAUTH') || error.message?.includes('Insufficient Permission')) {
            this.emitLog('🔐 Calendar permissions not granted. Please re-authenticate with Google.', 'error');
            return { 
              success: false, 
              error: 'NEEDS_REAUTH: Calendar permissions not granted. Please go to Settings > Google Integration and click "Sign In Again" to grant Calendar access.',
              data: {
                syncResult: {
                  synced: syncedCount,
                  errors: tasksToSync.length - syncedCount,
                  needsReauth: true,
                  lastSyncAt: null
                }
              }
            };
          }
          errorCount++;
          this.emitLog(`❌ Failed to sync task "${task.title}": ${error.message}`, 'error');
        }
      }

      // Update sync status
      await prisma.calendarSync.upsert({
        where: { userId },
        update: { lastSyncAt: new Date() },
        create: {
          userId,
          lastSyncAt: new Date()
        }
      });

      if (errorCount > 0) {
        this.emitLog(`⚠️ Calendar sync completed with ${errorCount} errors`, 'warning');
      } else {
        this.emitLog(`✅ Successfully synced ${syncedCount} tasks to Google Calendar`, 'success');
      }

      return {
        success: true,
        data: {
          syncResult: {
            synced: syncedCount,
            errors: errorCount,
            lastSyncAt: new Date()
          }
        }
      };
    } catch (error: any) {
      this.emitLog(`❌ Calendar sync failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI-suggested routines based on user patterns
   */
  private async getSuggestedRoutines(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const suggestedRoutines = await prisma.routinePattern.findMany({
        where: {
          userId,
          isApproved: false,
          isDismissed: false,
          confidence: { gte: 0.6 }
        },
        orderBy: { confidence: 'desc' },
        take: configService.get('limits.todo.agent.suggestedRoutines.maxResults', 10) as number
      });

      return { success: true, data: { suggestedRoutines } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve a routine pattern
   */
  private async approveRoutine(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, routineId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!routineId) return { success: false, error: 'Routine ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      await prisma.routinePattern.update({
        where: { id: routineId },
        data: { isApproved: true }
      });

      this.emitLog('✅ Routine approved and will be added to your schedule', 'success');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Dismiss a routine pattern
   */
  private async dismissRoutine(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, routineId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!routineId) return { success: false, error: 'Routine ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      await prisma.routinePattern.update({
        where: { id: routineId },
        data: { isDismissed: true }
      });

      this.emitLog('🚫 Routine dismissed', 'info');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Learn patterns from user's task history using AI
   */
  private async learnPatterns(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog('🧠 Analyzing your task patterns...', 'info');

    try {
      // Get completed tasks from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const completedTasks = await prisma.task.findMany({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: thirtyDaysAgo }
        },
        orderBy: { completedAt: 'desc' },
        take: configService.get('limits.todo.agent.completedTasks.maxResults', 100) as number
      });

      if (completedTasks.length < 5) {
        this.emitLog('📊 Not enough data to learn patterns yet. Complete more tasks!', 'info');
        return { success: true, data: { patternsLearned: 0 } };
      }

      // Use AI to analyze patterns
      const taskSummary = completedTasks.map((t) => ({
        title: t.title,
        category: t.category,
        completedAt: t.completedAt,
        dayOfWeek: t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-US', { weekday: 'long' }) : null,
        hour: t.completedAt ? new Date(t.completedAt).getHours() : null,
        duration: t.duration
      }));

      // Get calendar events from the next week to understand busy times
      let calendarBusyTimes: { day: string; startHour: number; endHour: number; title: string }[] = [];
      try {
        if (calendarService.isAvailable()) {
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          const events = await calendarService.getEvents(new Date(), weekFromNow);
          
          calendarBusyTimes = events
            .filter(event => !event.isAllDay) // Only time-specific events
            .map(event => {
              const start = new Date(event.start);
              const end = new Date(event.end);
              return {
                day: start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
                startHour: start.getHours(),
                endHour: end.getHours() || (start.getHours() + 1),
                title: event.title
              };
            });
        }
      } catch (calError) {
        // Calendar errors shouldn't block pattern learning
        this.emitLog('⚠️ Could not fetch calendar events for pattern optimization', 'warning');
      }

      const prompt = `Analyze these completed tasks and identify recurring patterns/routines.
IMPORTANT: When suggesting times for routines, AVOID the calendar busy times listed below.

Tasks completed in the last 30 days:
${JSON.stringify(taskSummary, null, 2)}

Calendar busy times to AVOID (these are blocked for meetings/events):
${JSON.stringify(calendarBusyTimes, null, 2)}

Find patterns like:
1. Tasks done on specific days of the week
2. Tasks done at similar times
3. Related tasks that happen together
4. Weekly or daily routines

IMPORTANT RULES:
- Suggest times that do NOT conflict with the calendar busy times above
- If a user typically does something at 9:00 but they have recurring meetings at 9:00, suggest an alternative time
- Prioritize time slots that are consistently free based on the calendar data

Respond ONLY with valid JSON:
{
  "patterns": [
    {
      "patternName": "descriptive name",
      "description": "what this routine involves",
      "dayOfWeek": ["monday", "wednesday", "friday"],
      "timeSlot": "morning" | "afternoon" | "evening",
      "preferredTime": "09:00",
      "calendarConflict": false,
      "alternativeTime": null,
      "taskTemplate": {
        "title": "suggested task title",
        "category": "category",
        "duration": 30
      },
      "confidence": 0.0 to 1.0
    }
  ]
}`;

      const response = await claudeService.generateText(prompt, 2000);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);

      // Save discovered patterns
      let patternsLearned = 0;
      for (const pattern of analysis.patterns || []) {
        if (pattern.confidence >= 0.6) {
          await prisma.routinePattern.upsert({
            where: {
              id: `${userId}-${pattern.patternName.toLowerCase().replace(/\s+/g, '-')}`
            },
            update: {
              confidence: pattern.confidence,
              lastOccurred: new Date()
            },
            create: {
              userId,
              patternName: pattern.patternName,
              description: pattern.description,
              dayOfWeek: pattern.dayOfWeek || [],
              timeSlot: pattern.timeSlot,
              preferredTime: pattern.preferredTime,
              taskTemplate: pattern.taskTemplate,
              confidence: pattern.confidence
            }
          });
          patternsLearned++;
        }
      }

      this.emitLog(`🧠 Learned ${patternsLearned} new patterns!`, 'success');

      return { success: true, data: { patternsLearned } };
    } catch (error: any) {
      this.emitLog(`❌ Pattern learning failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Import a Google Calendar event as a task
   */
  private async importCalendarEvent(params: ToDoParams): Promise<AgentResult<ToDoResult>> {
    const { userId, calendarEventData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!calendarEventData) return { success: false, error: 'Calendar event data is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog(`📅 Importing calendar event: ${calendarEventData.title}`, 'info');

    try {
      // Check if this event was already imported
      const existingTask = await prisma.task.findFirst({
        where: {
          userId,
          googleEventId: calendarEventData.id
        }
      });

      if (existingTask) {
        this.emitLog(`⚠️ Event already imported as task: ${existingTask.title}`, 'warning');
        return { success: true, data: { task: existingTask } };
      }

      // Calculate duration from start and end time
      const startDate = new Date(calendarEventData.start);
      const endDate = new Date(calendarEventData.end);
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      // Extract time from start date
      const dueTime = calendarEventData.isAllDay 
        ? undefined 
        : startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      // Create the task from calendar event
      const task = await prisma.task.create({
        data: {
          userId,
          title: calendarEventData.title,
          description: calendarEventData.description || `Imported from Google Calendar`,
          priority: 'medium',
          status: 'pending',
          dueDate: startDate,
          dueTime,
          duration: durationMinutes > 0 ? durationMinutes : 30,
          category: 'work', // Default category for calendar events
          tags: ['calendar-import'],
          isRecurring: false,
          syncEnabled: false, // Don't sync back to avoid duplicates
          sourceType: 'manual',
          googleEventId: calendarEventData.id
        }
      });

      this.emitLog(`✅ Created task from calendar event: ${task.title}`, 'success');

      return { success: true, data: { task } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to import calendar event: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Create the next occurrence of a recurring task
   */
  private async createNextRecurrence(userId: string, task: any): Promise<void> {
    const prisma = getPrisma();
    if (!prisma || !task.dueDate) return;

    const nextDate = this.calculateNextOccurrence(task.dueDate, task.recurrenceRule);
    if (!nextDate) return;

    await prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'pending',
        dueDate: nextDate,
        dueTime: task.dueTime,
        duration: task.duration,
        isRecurring: true,
        recurrenceRule: task.recurrenceRule,
        category: task.category,
        tags: task.tags,
        syncEnabled: task.syncEnabled,
        sourceType: task.sourceType
      }
    });

    this.emitLog(`🔄 Created next occurrence for: ${task.title}`, 'info');
  }

  /**
   * Calculate the next occurrence date based on recurrence rule
   */
  private calculateNextOccurrence(currentDate: Date, rule: string): Date | null {
    const date = new Date(currentDate);

    switch (rule) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'weekdays':
        do {
          date.setDate(date.getDate() + 1);
        } while (date.getDay() === 0 || date.getDay() === 6);
        break;
      default:
        if (rule?.startsWith('custom:')) {
          // Handle custom rules like "custom:MON,WED,FRI"
          const days = rule.replace('custom:', '').split(',');
          const dayMap: Record<string, number> = {
            'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
          };
          const allowedDays = days.map(d => dayMap[d.trim()]).filter(d => d !== undefined);
          
          if (allowedDays.length > 0) {
            do {
              date.setDate(date.getDate() + 1);
            } while (!allowedDays.includes(date.getDay()));
          }
        }
        break;
    }

    return date;
  }

  /**
   * Create a Google Calendar event for a task
   */
  private async createCalendarEvent(userId: string, task: any): Promise<void> {
    if (!calendarService.isAvailable()) {
      this.emitLog('⚠️ Calendar not available, skipping event creation', 'warning');
      return;
    }

    try {
      const eventId = await calendarService.createEvent(task);
      if (eventId) {
        // Update the task with the Google Event ID
        const prisma = getPrisma();
        if (prisma) {
          await prisma.task.update({
            where: { id: task.id },
            data: { googleEventId: eventId, lastSyncedAt: new Date() }
          });
        }
        this.emitLog(`📅 Created calendar event for: ${task.title}`, 'success');
      }
    } catch (error: any) {
      this.emitLog(`⚠️ Failed to create calendar event: ${error.message}`, 'warning');
    }
  }
}

// Export singleton instance
export const todoAgent = new ToDoAgent();
export default todoAgent;

