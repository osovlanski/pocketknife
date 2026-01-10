/**
 * useNotification Hook
 * 
 * Manages toast notifications across the app.
 */

import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export interface UseNotificationReturn {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotification = (defaultDuration = 5000): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = notification.duration ?? defaultDuration;

    setNotifications(prev => [...prev, { ...notification, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, [defaultDuration]);

  const showSuccess = useCallback((message: string, title = 'Success') => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((message: string, title = 'Error') => {
    showNotification({ type: 'error', title, message });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title = 'Warning') => {
    showNotification({ type: 'warning', title, message });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title = 'Info') => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
    clearAll
  };
};

export default useNotification;




