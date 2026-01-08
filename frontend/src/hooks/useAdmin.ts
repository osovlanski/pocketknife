/**
 * useAdmin Hook
 * 
 * Manages admin panel state and operations.
 */

import { useState, useEffect, useCallback } from 'react';
import * as adminApi from '../services/adminApi';
import { getStoredEmail } from '../services/authApi';
import type { User, AuditLog, SystemSetting, PlatformStats } from '../services/adminApi';

export interface UseAdminReturn {
  // State
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isNotSignedIn: boolean;
  
  // Users
  users: User[];
  usersLoading: boolean;
  usersPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  
  // Settings
  settings: Record<string, SystemSetting[]>;
  settingsLoading: boolean;
  
  // Audit Logs
  auditLogs: AuditLog[];
  logsLoading: boolean;
  logsPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  
  // Stats
  stats: PlatformStats | null;
  statsLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  loadUsers: (page?: number) => Promise<void>;
  loadSettings: () => Promise<void>;
  loadAuditLogs: (page?: number) => Promise<void>;
  loadStats: () => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  updateSetting: (id: string, value: any) => Promise<boolean>;
}

export const useAdmin = (): UseAdminReturn => {
  // Core state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNotSignedIn, setIsNotSignedIn] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Settings state
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Stats state
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsNotSignedIn(false);

      // Check if user is signed in
      const storedEmail = getStoredEmail();
      if (!storedEmail) {
        setIsNotSignedIn(true);
        setIsLoading(false);
        return;
      }

      // Initialize admin
      await adminApi.initializeAdmin();
      setIsInitialized(true);

      // Get current user
      const { user } = await adminApi.getCurrentUser();
      setCurrentUser(user);

      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setError('You do not have admin access. Please sign in with an admin account.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to initialize admin panel');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page = 1) => {
    try {
      setUsersLoading(true);
      const response = await adminApi.getUsers({ page, limit: 10 });
      setUsers(response.users);
      setUsersPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        total: response.pagination.total
      });
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const response = await adminApi.getSettings();
      setSettings(response.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async (page = 1) => {
    try {
      setLogsLoading(true);
      const response = await adminApi.getAuditLogs({ page, limit: 20 });
      setAuditLogs(response.logs);
      setLogsPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        total: response.pagination.total
      });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await adminApi.getStats();
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<boolean> => {
    try {
      // Convert null values to undefined for the API
      const updateData = {
        name: data.name ?? undefined,
        role: data.role ?? undefined,
        status: data.status ?? undefined
      };
      await adminApi.updateUser(id, updateData);
      await loadUsers(usersPagination.page);
      return true;
    } catch (err) {
      console.error('Failed to update user:', err);
      return false;
    }
  }, [loadUsers, usersPagination.page]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      await adminApi.deleteUser(id);
      await loadUsers(usersPagination.page);
      return true;
    } catch (err) {
      console.error('Failed to delete user:', err);
      return false;
    }
  }, [loadUsers, usersPagination.page]);

  const updateSetting = useCallback(async (id: string, value: any): Promise<boolean> => {
    try {
      await adminApi.updateSetting(id, value);
      await loadSettings();
      return true;
    } catch (err) {
      console.error('Failed to update setting:', err);
      return false;
    }
  }, [loadSettings]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    currentUser,
    isLoading,
    error,
    isInitialized,
    isNotSignedIn,
    users,
    usersLoading,
    usersPagination,
    settings,
    settingsLoading,
    auditLogs,
    logsLoading,
    logsPagination,
    stats,
    statsLoading,
    initialize,
    loadUsers,
    loadSettings,
    loadAuditLogs,
    loadStats,
    updateUser,
    deleteUser,
    updateSetting
  };
};

export default useAdmin;

