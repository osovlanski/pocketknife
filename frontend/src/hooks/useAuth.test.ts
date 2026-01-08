/**
 * useAuth Hook Tests
 * 
 * Tests the authentication hook functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import * as authApi from '../services/authApi';

// Mock the authApi module
vi.mock('../services/authApi', () => ({
  getCurrentUser: vi.fn(),
  getGoogleAuthStatus: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn()
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(null);
    vi.mocked(authApi.getGoogleAuthStatus).mockResolvedValue({
      authenticated: false,
      email: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading state true', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isLoading).toBe(true);
    });

    it('should load user on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const
      };
      
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.isSignedIn).toBe(true);
    });

    it('should load Google status on mount', async () => {
      const mockGoogleStatus = {
        authenticated: true,
        email: 'google@example.com'
      };
      
      vi.mocked(authApi.getGoogleAuthStatus).mockResolvedValue(mockGoogleStatus);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.googleStatus).toEqual(mockGoogleStatus);
      });
    });

    it('should set isSignedIn to false when no user', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isSignedIn).toBe(false);
    });
  });

  describe('Admin Detection', () => {
    it('should detect ADMIN role', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const
      };
      
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockAdmin);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(false);
    });

    it('should detect SUPER_ADMIN role', async () => {
      const mockSuperAdmin = {
        id: '1',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN' as const
      };
      
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockSuperAdmin);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(true);
    });

    it('should not grant admin to regular USER', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER' as const
      };
      
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
    });
  });

  describe('Sign In', () => {
    it('should call signIn API and update state on success', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const
      };
      
      vi.mocked(authApi.signIn).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.signIn('test@example.com');
        expect(response.success).toBe(true);
      });

      expect(result.current.currentUser).toEqual(mockUser);
    });

    it('should return error on sign in failure', async () => {
      vi.mocked(authApi.signIn).mockResolvedValue({
        success: false,
        error: 'Invalid email'
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.signIn('invalid@example.com');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid email');
      });
    });
  });

  describe('Sign Out', () => {
    it('should clear user state on sign out', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const
      };
      
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.currentUser).toEqual(mockUser);
      });

      act(() => {
        result.current.signOut();
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isSignedIn).toBe(false);
      expect(authApi.signOut).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle getCurrentUser API errors gracefully', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toBeNull();
      expect(result.current.isSignedIn).toBe(false);
    });

    it('should handle getGoogleAuthStatus API errors gracefully', async () => {
      vi.mocked(authApi.getGoogleAuthStatus).mockRejectedValue(new Error('Google API Error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not crash, googleStatus remains null
      expect(result.current.googleStatus).toBeNull();
    });
  });
});

