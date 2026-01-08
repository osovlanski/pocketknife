/**
 * useAuth Hook
 * 
 * Handles authentication state and operations.
 * Separates auth logic from UI components.
 */

import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../services/authApi';
import type { CurrentUser, AuthStatus } from '../services/authApi';

export interface UseAuthReturn {
  // State
  currentUser: CurrentUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  googleStatus: AuthStatus | null;
  
  // Actions
  signIn: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  refreshGoogleStatus: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleStatus, setGoogleStatus] = useState<AuthStatus | null>(null);

  // Load user and Google status on mount
  useEffect(() => {
    loadUser();
    loadGoogleStatus();
  }, []);

  const loadGoogleStatus = async () => {
    try {
      const status = await authApi.getGoogleAuthStatus();
      setGoogleStatus(status);
    } catch (error) {
      console.error('Failed to load Google status:', error);
    }
  };

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    const user = await authApi.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const refreshGoogleStatus = useCallback(async () => {
    try {
      const status = await authApi.getGoogleAuthStatus();
      setGoogleStatus(status);
    } catch (error) {
      console.error('Failed to load Google status:', error);
    }
  }, []);

  const signIn = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authApi.signIn(email);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }
  }, []);

  const signOut = useCallback(() => {
    authApi.signOut();
    setCurrentUser(null);
  }, []);

  const isSignedIn = !!currentUser;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return {
    currentUser,
    isLoading,
    isSignedIn,
    isAdmin,
    isSuperAdmin,
    googleStatus,
    signIn,
    signOut,
    refreshUser,
    refreshGoogleStatus
  };
};

export default useAuth;

