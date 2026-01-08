import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance - dynamically adds auth header on each request
const adminApi = axios.create({
  baseURL: API_BASE_URL
});

// Add request interceptor to dynamically set auth header
adminApi.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  isVerified: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    activityLogs: number;
    tasks: number;
    savedJobs: number;
    tripPlans: number;
    solvedProblems?: number;
    products?: number;
  };
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetEmail: string | null;
  previousValue: any;
  newValue: any;
  ipAddress: string | null;
  reason: string | null;
  createdAt: string;
  admin: {
    email: string;
    name: string | null;
  };
}

export interface AuditLogsResponse extends PaginatedResponse<AuditLog> {
  logs: AuditLog[];
}

export interface SystemSetting {
  id: string;
  category: string;
  name: string;
  value: any;
  description: string | null;
  isPublic: boolean;
  isEditable: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsResponse {
  settings: Record<string, SystemSetting[]>;
}

export interface PlatformStats {
  users: {
    total: number;
    active: number;
  };
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
  };
  products: number;
  savedJobs: number;
  tripPlans: number;
  activityToday: number;
  activityByAgent: Record<string, number>;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export const initializeAdmin = async (): Promise<{ initialized: boolean; message: string; admin?: { email: string; role: string } }> => {
  const response = await adminApi.post('/admin/initialize');
  return response.data;
};

// =============================================================================
// CURRENT USER
// =============================================================================

export const getCurrentUser = async (): Promise<{ user: User }> => {
  const response = await adminApi.get('/admin/me');
  return response.data;
};

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}): Promise<UsersResponse> => {
  const response = await adminApi.get('/admin/users', { params });
  return response.data;
};

export const getUser = async (id: string): Promise<{ user: User }> => {
  const response = await adminApi.get(`/admin/users/${id}`);
  return response.data;
};

export const createUser = async (data: {
  email: string;
  name?: string;
  role?: string;
  status?: string;
}): Promise<{ user: User }> => {
  const response = await adminApi.post('/admin/users', data);
  return response.data;
};

export const updateUser = async (id: string, data: {
  name?: string;
  role?: string;
  status?: string;
}): Promise<{ user: User }> => {
  const response = await adminApi.put(`/admin/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<{ success: boolean }> => {
  const response = await adminApi.delete(`/admin/users/${id}`);
  return response.data;
};

// =============================================================================
// SYSTEM SETTINGS
// =============================================================================

export const getSettings = async (category?: string): Promise<SettingsResponse> => {
  const response = await adminApi.get('/admin/settings', { params: { category } });
  return response.data;
};

export const updateSetting = async (id: string, value: any): Promise<{ setting: SystemSetting }> => {
  const response = await adminApi.put(`/admin/settings/${id}`, { value });
  return response.data;
};

// =============================================================================
// AUDIT LOGS
// =============================================================================

export const getAuditLogs = async (params?: {
  page?: number;
  limit?: number;
  action?: string;
  adminId?: string;
}): Promise<AuditLogsResponse> => {
  const response = await adminApi.get('/admin/audit-logs', { params });
  return response.data;
};

// =============================================================================
// STATISTICS
// =============================================================================

export const getStats = async (): Promise<{ stats: PlatformStats }> => {
  const response = await adminApi.get('/admin/stats');
  return response.data;
};

