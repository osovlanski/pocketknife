import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with dynamic auth
const todoAxios = axios.create({ baseURL: API_BASE_URL });
todoAxios.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  dueTime?: string;
  duration?: number;
  isRecurring: boolean;
  recurrenceRule?: string;
  category?: string;
  tags: string[];
  syncEnabled: boolean;
  sourceType: 'manual' | 'routine' | 'suggested';
  confidence?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isPocketknifeTask: boolean;
  htmlLink?: string;
}

export interface DailyAgenda {
  date: string;
  tasks: Task[];
  routineTasks: Task[];
  suggestedTasks: Task[];
  calendarEvents: CalendarEvent[];
  totalDuration: number;
  completedCount: number;
}

export interface RoutinePattern {
  id: string;
  patternName: string;
  description?: string;
  dayOfWeek: string[];
  timeSlot?: string;
  preferredTime?: string;
  taskTemplate: any;
  frequency: number;
  confidence: number;
  isApproved: boolean;
}

export interface TaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  dueTime?: string;
  duration?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  category?: string;
  tags?: string[];
  syncEnabled?: boolean;
}

export interface TaskFilters {
  status?: string;
  category?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCompleted?: boolean;
}

// Task CRUD
export const createTask = async (taskData: TaskData): Promise<{ task: Task }> => {
  const response = await todoAxios.post('/todo/tasks', taskData);
  return response.data;
};

export const updateTask = async (id: string, taskData: Partial<TaskData>): Promise<{ task: Task }> => {
  const response = await todoAxios.put(`/todo/tasks/${id}`, taskData);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await todoAxios.delete(`/todo/tasks/${id}`);
};

export const getTasks = async (filters?: TaskFilters): Promise<{ tasks: Task[] }> => {
  const response = await todoAxios.get('/todo/tasks', { params: filters });
  return response.data;
};

export const completeTask = async (id: string): Promise<{ task: Task }> => {
  const response = await todoAxios.post(`/todo/tasks/${id}/complete`);
  return response.data;
};

export const uncompleteTask = async (id: string): Promise<{ task: Task }> => {
  const response = await todoAxios.post(`/todo/tasks/${id}/uncomplete`);
  return response.data;
};

// Daily agenda
export const getDailyAgenda = async (date?: string): Promise<{ agenda: DailyAgenda }> => {
  const response = await todoAxios.get('/todo/agenda', { params: date ? { date } : {} });
  return response.data;
};

// Calendar sync
export const syncCalendar = async (): Promise<{ synced: number; lastSyncAt: string }> => {
  const response = await todoAxios.post('/todo/calendar/sync');
  return response.data.syncResult;
};

// Routine patterns
export const getSuggestedRoutines = async (): Promise<{ suggestedRoutines: RoutinePattern[] }> => {
  const response = await todoAxios.get('/todo/routines');
  return response.data;
};

export const approveRoutine = async (id: string): Promise<void> => {
  await todoAxios.post(`/todo/routines/${id}/approve`);
};

export const dismissRoutine = async (id: string): Promise<void> => {
  await todoAxios.post(`/todo/routines/${id}/dismiss`);
};

export const learnPatterns = async (): Promise<{ patternsLearned: number }> => {
  const response = await todoAxios.post('/todo/patterns/learn');
  return response.data;
};

export interface CalendarEventImport {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

export const importCalendarEvent = async (event: CalendarEventImport): Promise<{ task: Task }> => {
  const response = await todoAxios.post('/todo/calendar/import', { event });
  return response.data;
};

