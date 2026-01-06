/**
 * useTodo Hook
 * 
 * Custom hook for managing ToDo agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as todoApi from '../services/todoApi';
import type { Task, DailyAgenda, RoutinePattern, TaskData } from '../services/todoApi';

export interface UseTodoReturn {
  // State
  tasks: Task[];
  agenda: DailyAgenda | null;
  routines: RoutinePattern[];
  selectedDate: Date;
  loading: boolean;
  showAddTask: boolean;
  showRoutines: boolean;
  learningPatterns: boolean;
  syncing: boolean;
  newTask: TaskData;
  
  // Computed
  allTasks: Task[];
  completedCount: number;
  progress: number;
  formattedDate: string;
  
  // Actions
  setShowAddTask: (show: boolean) => void;
  setShowRoutines: (show: boolean) => void;
  setNewTask: (task: TaskData) => void;
  navigateDate: (days: number) => void;
  handleCreateTask: () => Promise<void>;
  handleCompleteTask: (taskId: string, currentStatus: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleLearnPatterns: () => Promise<void>;
  handleSyncCalendar: () => Promise<void>;
  handleApproveRoutine: (routineId: string) => Promise<void>;
  handleDismissRoutine: (routineId: string) => Promise<void>;
}

const DEFAULT_NEW_TASK: TaskData = {
  title: '',
  priority: 'medium',
  category: 'personal'
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
  const [showRoutines, setShowRoutines] = useState(false);
  const [learningPatterns, setLearningPatterns] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Form state
  const [newTask, setNewTask] = useState<TaskData>(DEFAULT_NEW_TASK);

  // Load data on date change
  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  // Data loading functions
  const loadAllData = async () => {
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
  };

  const loadAgendaData = async () => {
    try {
      const result = await todoApi.getDailyAgenda(selectedDate.toISOString().split('T')[0]);
      setAgenda(result.agenda);
    } catch (error) {
      console.error('Failed to load agenda:', error);
    }
  };

  const loadTasksData = async () => {
    try {
      const result = await todoApi.getTasks({ includeCompleted: false });
      setTasks(result.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadRoutinesData = async () => {
    try {
      const result = await todoApi.getSuggestedRoutines();
      setRoutines(result.suggestedRoutines || []);
    } catch (error) {
      console.error('Failed to load routines:', error);
    }
  };

  // Actions
  const handleCreateTask = useCallback(async () => {
    if (!newTask.title.trim()) return;

    try {
      setLoading(true);
      await todoApi.createTask({
        ...newTask,
        dueDate: selectedDate.toISOString()
      });
      
      setNewTask(DEFAULT_NEW_TASK);
      setShowAddTask(false);
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [newTask, selectedDate]);

  const handleCompleteTask = useCallback(async (taskId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'completed') {
        await todoApi.uncompleteTask(taskId);
      } else {
        await todoApi.completeTask(taskId);
      }
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await todoApi.deleteTask(taskId);
      await Promise.all([loadAgendaData(), loadTasksData()]);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, []);

  const handleLearnPatterns = useCallback(async () => {
    try {
      setLearningPatterns(true);
      const result = await todoApi.learnPatterns();
      alert(`Learned ${result.patternsLearned} new patterns!`);
      await loadRoutinesData();
    } catch (error) {
      console.error('Failed to learn patterns:', error);
    } finally {
      setLearningPatterns(false);
    }
  }, []);

  const handleSyncCalendar = useCallback(async () => {
    try {
      setSyncing(true);
      const result = await todoApi.syncCalendar();
      alert(`Synced ${result.synced} tasks with Google Calendar!`);
    } catch (error: any) {
      console.error('Failed to sync calendar:', error);
      alert(error.response?.data?.error || 'Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleApproveRoutine = useCallback(async (routineId: string) => {
    try {
      await todoApi.approveRoutine(routineId);
      await loadRoutinesData();
    } catch (error) {
      console.error('Failed to approve routine:', error);
    }
  }, []);

  const handleDismissRoutine = useCallback(async (routineId: string) => {
    try {
      await todoApi.dismissRoutine(routineId);
      await loadRoutinesData();
    } catch (error) {
      console.error('Failed to dismiss routine:', error);
    }
  }, []);

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
    showRoutines,
    learningPatterns,
    syncing,
    newTask,
    
    // Computed
    allTasks,
    completedCount,
    progress,
    formattedDate: formatDate(selectedDate),
    
    // Actions
    setShowAddTask,
    setShowRoutines,
    setNewTask,
    navigateDate,
    handleCreateTask,
    handleCompleteTask,
    handleDeleteTask,
    handleLearnPatterns,
    handleSyncCalendar,
    handleApproveRoutine,
    handleDismissRoutine
  };
};

export default useTodo;



