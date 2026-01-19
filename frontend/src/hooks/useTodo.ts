/**
 * useTodo Hook
 * 
 * Custom hook for managing ToDo agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as todoApi from '../services/todoApi';
import type { Task, DailyAgenda, RoutinePattern, TaskData, CalendarEvent, CalendarEventImport } from '../services/todoApi';
import logger from '../services/logger';

export interface UseTodoReturn {
  // State
  tasks: Task[];
  agenda: DailyAgenda | null;
  routines: RoutinePattern[];
  selectedDate: Date;
  loading: boolean;
  showAddTask: boolean;
  showEditTask: boolean;
  editingTask: Task | null;
  showRoutines: boolean;
  learningPatterns: boolean;
  syncing: boolean;
  newTask: TaskData;
  lastSyncAt: string | null;
  
  // Computed
  allTasks: Task[];
  completedCount: number;
  progress: number;
  formattedDate: string;
  
  // Actions
  setShowAddTask: (show: boolean) => void;
  setShowEditTask: (show: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setShowRoutines: (show: boolean) => void;
  setNewTask: (task: TaskData) => void;
  navigateDate: (days: number) => void;
  handleCreateTask: () => Promise<void>;
  handleEditTask: (task: Task) => void;
  handleUpdateTask: (taskData: TaskData) => Promise<void>;
  handleCompleteTask: (taskId: string, currentStatus: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleLearnPatterns: () => Promise<void>;
  handleSyncCalendar: () => Promise<void>;
  handleApproveRoutine: (routineId: string) => Promise<void>;
  handleDismissRoutine: (routineId: string) => Promise<void>;
  handleImportCalendarEvent: (event: CalendarEvent) => Promise<void>;
}

const DEFAULT_NEW_TASK: TaskData = {
  title: '',
  priority: 'medium',
  category: 'personal',
  syncEnabled: true  // Auto-sync to Google Calendar enabled by default
};

export const useTodo = (): UseTodoReturn => {
  // Core state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agenda, setAgenda] = useState<DailyAgenda | null>(null);
  const [routines, setRoutines] = useState<RoutinePattern[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showRoutines, setShowRoutines] = useState(false);
  const [learningPatterns, setLearningPatterns] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  
  // Form state
  const [newTask, setNewTask] = useState<TaskData>(DEFAULT_NEW_TASK);

  // Load data on date change
  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  // Data loading functions - use useCallback to ensure stable references and fresh state
  const loadAgendaData = useCallback(async (dateOverride?: Date) => {
    try {
      const targetDate = dateOverride || selectedDate;
      const result = await todoApi.getDailyAgenda(targetDate.toISOString().split('T')[0]);
      setAgenda(result.agenda);
    } catch (error) {
      logger.error('Failed to load agenda', { error });
    }
  }, [selectedDate]);

  const loadTasksData = useCallback(async () => {
    try {
      const result = await todoApi.getTasks({ includeCompleted: false });
      setTasks(result.tasks);
    } catch (error) {
      logger.error('Failed to load tasks', { error });
    }
  }, []);

  const loadRoutinesData = useCallback(async () => {
    try {
      const result = await todoApi.getSuggestedRoutines();
      setRoutines(result.suggestedRoutines || []);
    } catch (error) {
      logger.error('Failed to load routines', { error });
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAgendaData(),
        loadTasksData(),
        loadRoutinesData()
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadAgendaData, loadTasksData, loadRoutinesData]);

  // Actions
  const handleCreateTask = useCallback(async () => {
    if (!newTask.title.trim()) return;

    try {
      setLoading(true);
      const shouldSync = newTask.syncEnabled !== false; // Default to true
      
      await todoApi.createTask({
        ...newTask,
        dueDate: selectedDate.toISOString()
      });
      
      setNewTask(DEFAULT_NEW_TASK);
      setShowAddTask(false);
      
      // Refresh data
      await Promise.all([loadAgendaData(), loadTasksData()]);
      
      // Auto-sync to Google Calendar if enabled
      if (shouldSync) {
        setSyncing(true);
        try {
          const result = await todoApi.syncCalendar();
          setLastSyncAt(result.lastSyncAt || new Date().toISOString());
          await loadAgendaData(); // Refresh to show synced events
        } catch (syncError) {
          logger.warn('Auto-sync to calendar failed', { error: syncError });
          // Don't alert - silent failure for auto-sync
        } finally {
          setSyncing(false);
        }
      }
      
      // Auto-learn patterns in background (silent, no alerts)
      todoApi.learnPatterns()
        .then((result) => {
          if (result.patternsLearned > 0) {
            loadRoutinesData(); // Refresh routines if new patterns learned
          }
        })
        .catch((err) => {
          logger.debug('Background pattern learning skipped', { error: err });
        });
        
    } catch (error) {
      logger.error('Failed to create task', { error });
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [newTask, selectedDate, loadAgendaData, loadTasksData, loadRoutinesData]);

  const handleCompleteTask = useCallback(async (taskId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'completed') {
        await todoApi.uncompleteTask(taskId);
      } else {
        await todoApi.completeTask(taskId);
      }
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      logger.error('Failed to complete task', { error });
    }
  }, [loadAgendaData, loadTasksData]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await todoApi.deleteTask(taskId);
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      logger.error('Failed to delete task', { error });
    }
  }, [loadAgendaData, loadTasksData]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowEditTask(true);
  }, []);

  const handleUpdateTask = useCallback(async (taskData: TaskData) => {
    if (!editingTask) return;

    try {
      setLoading(true);
      await todoApi.updateTask(editingTask.id, taskData);
      
      setEditingTask(null);
      setShowEditTask(false);
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      logger.error('Failed to update task', { error });
      alert('Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [editingTask, loadAgendaData, loadTasksData]);

  const handleLearnPatterns = useCallback(async () => {
    try {
      setLearningPatterns(true);
      const result = await todoApi.learnPatterns();
      alert(`Learned ${result.patternsLearned} new patterns!`);
      await loadRoutinesData();
    } catch (error) {
      logger.error('Failed to learn patterns', { error });
    } finally {
      setLearningPatterns(false);
    }
  }, [loadRoutinesData]);

  const handleSyncCalendar = useCallback(async () => {
    try {
      setSyncing(true);
      const result = await todoApi.syncCalendar();
      
      // Track when last synced
      setLastSyncAt(result.lastSyncAt || new Date().toISOString());
      
      // Refresh agenda to show updated calendar events
      await loadAgendaData();
      
      // Sync completed - success shown via UI state update
    } catch (error: any) {
      logger.error('Failed to sync calendar', { error: error.message });
      alert(error.response?.data?.error || 'Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  }, [loadAgendaData]);

  const handleApproveRoutine = useCallback(async (routineId: string) => {
    try {
      await todoApi.approveRoutine(routineId);
      await loadRoutinesData();
    } catch (error) {
      logger.error('Failed to approve routine', { error });
    }
  }, [loadRoutinesData]);

  const handleDismissRoutine = useCallback(async (routineId: string) => {
    try {
      await todoApi.dismissRoutine(routineId);
      await loadRoutinesData();
    } catch (error) {
      logger.error('Failed to dismiss routine', { error });
    }
  }, [loadRoutinesData]);

  const handleImportCalendarEvent = useCallback(async (event: CalendarEvent) => {
    try {
      setLoading(true);
      const eventData: CalendarEventImport = {
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay
      };
      await todoApi.importCalendarEvent(eventData);
      await loadAgendaData();
    } catch (error) {
      logger.error('Failed to import calendar event', { error });
      alert('Failed to import calendar event. It may have already been imported.');
    } finally {
      setLoading(false);
    }
  }, [loadAgendaData]);

  const navigateDate = useCallback((days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }, [selectedDate]);

  // Computed values
  const allTasks = agenda ? [...agenda.tasks, ...agenda.routineTasks] : [];
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const progress = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0;

  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return {
    // State
    tasks,
    agenda,
    routines,
    selectedDate,
    loading,
    showAddTask,
    showEditTask,
    editingTask,
    showRoutines,
    learningPatterns,
    syncing,
    newTask,
    lastSyncAt,
    
    // Computed
    allTasks,
    completedCount,
    progress,
    formattedDate: formatDate(selectedDate),
    
    // Actions
    setShowAddTask,
    setShowEditTask,
    setEditingTask,
    setShowRoutines,
    setNewTask,
    navigateDate,
    handleCreateTask,
    handleEditTask,
    handleUpdateTask,
    handleCompleteTask,
    handleDeleteTask,
    handleLearnPatterns,
    handleSyncCalendar,
    handleApproveRoutine,
    handleDismissRoutine,
    handleImportCalendarEvent
  };
};

export default useTodo;




