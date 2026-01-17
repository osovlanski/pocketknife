/**
 * useGmail Hook
 * 
 * Custom hook for managing Gmail agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { processAllEmails, testNotification } from '../services/api';
import * as authApi from '../services/authApi';
import useSearchController from './useSearchController';
import { SOCKET_URL, API_BASE_URL } from '../config';
import logger from '../services/logger';

export interface GmailStats {
  invoices: number;
  jobOffers: number;
  official: number;
  spam: number;
  processed: number;
}

export interface GmailConfig {
  notificationMethod: string;
  checkInterval: number;
}

export interface UseGmailReturn {
  // State
  stats: GmailStats;
  config: GmailConfig;
  isAuthenticated: boolean | null;
  authUrl: string | null;
  userEmail: string | null;
  isProcessing: boolean;
  
  // Search controller
  searchController: ReturnType<typeof useSearchController>;
  
  // Actions
  handleProcessAll: () => Promise<void>;
  handleStop: () => void;
  handleTestNotification: () => Promise<void>;
  handleGoogleLogin: () => void;
  setConfig: React.Dispatch<React.SetStateAction<GmailConfig>>;
}

export const useGmail = (): UseGmailReturn => {
  const searchController = useSearchController('email');
  const location = useLocation();
  const [stats, setStats] = useState<GmailStats>({ 
    invoices: 0, 
    jobOffers: 0, 
    official: 0, 
    spam: 0, 
    processed: 0 
  });
  const [config, setConfig] = useState<GmailConfig>({
    notificationMethod: 'email',
    checkInterval: 60
  });
  const socketRef = useRef<Socket | null>(null);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check Google auth status
  const checkAuthStatus = useCallback(async () => {
    try {
      const data = await authApi.getGoogleAuthStatus();
      setIsAuthenticated(data.authenticated);
      setAuthUrl(authApi.getGoogleAuthUrl());
      setUserEmail(data.email || null);
    } catch (error) {
      logger.error('Failed to check auth status', { error });
      setIsAuthenticated(false);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Re-check auth when returning from OAuth (URL has auth param)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('auth') === 'success') {
      checkAuthStatus();
    }
  }, [location.search, checkAuthStatus]);

  // Re-check auth when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only re-check if currently not authenticated
      if (!isAuthenticated) {
        checkAuthStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, checkAuthStatus]);

  // Connect to Socket.io for real-time stats updates
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('log', (data: { message: string; type: string; details?: any }) => {
      if (data.details) {
        setStats(prev => ({
          ...prev,
          ...(data.details.invoices !== undefined && { invoices: data.details.invoices }),
          ...(data.details.jobOffers !== undefined && { jobOffers: data.details.jobOffers }),
          ...(data.details.official !== undefined && { official: data.details.official }),
          ...(data.details.spam !== undefined && { spam: data.details.spam }),
          ...(data.details.processed !== undefined && { processed: data.details.processed })
        }));
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleProcessAll = useCallback(async () => {
    searchController.start();
    
    try {
      const result = await processAllEmails();
      
      if (result.results) {
        setStats({
          processed: result.results.processed,
          invoices: result.results.invoices,
          jobOffers: result.results.jobOffers,
          official: result.results.official || 0,
          spam: result.results.spam
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Email processing error', { error: error.message });
      }
    } finally {
      searchController.reset();
    }
  }, [searchController]);

  const handleStop = useCallback(() => {
    searchController.stop();
  }, [searchController]);

  const handleTestNotification = useCallback(async () => {
    try {
      await testNotification();
      // Notification test result is shown via toast
    } catch (error: any) {
      // Error is handled by the calling component
      throw error;
    }
  }, []);

  const handleGoogleLogin = useCallback(() => {
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      window.location.href = `${API_BASE_URL}/auth/google`;
    }
  }, [authUrl]);

  return {
    stats,
    config,
    isAuthenticated,
    authUrl,
    userEmail,
    isProcessing: searchController.state.isSearching,
    searchController,
    handleProcessAll,
    handleStop,
    handleTestNotification,
    handleGoogleLogin,
    setConfig
  };
};

export default useGmail;



