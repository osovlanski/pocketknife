/**
 * Toast Component
 * 
 * Notification toast for displaying messages.
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Notification } from '../../hooks/useNotification';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const colorMap = {
  success: {
    bg: 'rgba(16, 185, 129, 0.2)',
    border: 'rgba(16, 185, 129, 0.5)',
    icon: 'rgb(110, 231, 183)',
    title: 'rgb(110, 231, 183)'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.2)',
    border: 'rgba(239, 68, 68, 0.5)',
    icon: 'rgb(248, 113, 113)',
    title: 'rgb(248, 113, 113)'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.2)',
    border: 'rgba(245, 158, 11, 0.5)',
    icon: 'rgb(252, 211, 77)',
    title: 'rgb(252, 211, 77)'
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.2)',
    border: 'rgba(59, 130, 246, 0.5)',
    icon: 'rgb(147, 197, 253)',
    title: 'rgb(147, 197, 253)'
  }
};

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  return (
    <div
      style={{
        maxWidth: '28rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        background: colors.bg,
        border: `1px solid ${colors.border}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Icon style={{ width: '1.5rem', height: '1.5rem', color: colors.icon, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {notification.title && (
            <p style={{ fontWeight: 600, color: colors.title }}>
              {notification.title}
            </p>
          )}
          <p style={{ fontSize: '0.875rem', color: 'rgb(226, 232, 240)', marginTop: notification.title ? '0.25rem' : 0 }}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgb(148, 163, 184)',
            cursor: 'pointer',
            padding: 0
          }}
          aria-label="Dismiss notification"
        >
          <X style={{ width: '1.25rem', height: '1.25rem' }} />
        </button>
      </div>
    </div>
  );
};

export interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '5rem', // Below the header (header is ~4rem tall)
        right: '1.5rem',
        zIndex: 9999, // Ensure it's above everything including modals
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: 'calc(100vw - 3rem)', // Prevent overflow on mobile
        pointerEvents: 'none' // Allow clicks to pass through container
      }}
    >
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          style={{ 
            pointerEvents: 'auto', // But toasts themselves are clickable
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <Toast notification={notification} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export default Toast;




