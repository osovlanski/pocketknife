/**
 * Admin Panel Shared Types and Constants
 */

import React from 'react';
import { Crown, Shield, User as UserIcon } from 'lucide-react';
import styles from '../../styles/admin.module.css';

// =============================================================================
// TYPES
// =============================================================================

export type AdminTab = 'dashboard' | 'users' | 'settings' | 'apis' | 'audit';

// Re-export types from adminApi
export type {
  User,
  AuditLog,
  SystemSetting,
  PlatformStats,
  ExternalApiConfig,
  ApiTestResult
} from '../../services/adminApi';

// =============================================================================
// CONSTANTS
// =============================================================================

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  SUPER_ADMIN: styles.badgeSuperAdmin,
  ADMIN: styles.badgeAdmin,
  USER: styles.badgeUser
};

export const ROLE_AVATAR_CLASSES: Record<string, string> = {
  SUPER_ADMIN: styles.userAvatarSuperAdmin,
  ADMIN: styles.userAvatarAdmin,
  USER: styles.userAvatarUser
};

export const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: styles.statusActive,
  INACTIVE: styles.statusInactive,
  SUSPENDED: styles.statusSuspended,
  PENDING: styles.statusPending
};

export const ROLE_ICONS: Record<string, React.ReactNode> = {
  SUPER_ADMIN: React.createElement(Crown, { style: { width: '0.75rem', height: '0.75rem' } }),
  ADMIN: React.createElement(Shield, { style: { width: '0.75rem', height: '0.75rem' } }),
  USER: React.createElement(UserIcon, { style: { width: '0.75rem', height: '0.75rem' } })
};

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

export interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'purple' | 'emerald' | 'blue' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};

export interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? 'bg-purple-500 text-white'
        : 'text-slate-400 hover:text-white hover:bg-white/10'
    }`}
  >
    {icon}
    {label}
  </button>
);
