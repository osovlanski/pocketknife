/**
 * Admin Panel Components
 *
 * This module exports all admin-related components.
 * The AdminPanel has been refactored to use shared types and constants.
 *
 * Components:
 * - AdminPanel: Main admin dashboard (entry point)
 * - DashboardTab: Platform statistics and metrics
 * - UsersTab: User management
 * - SettingsTab: System settings
 * - ExternalApisTab: External API configuration
 * - AuditTab: Audit log viewer
 *
 * Shared:
 * - types.ts: Shared types, constants, and utility components
 */

// Main component
export { default as AdminPanel } from '../AdminPanel';

// Shared types and components
export {
  type AdminTab,
  type StatCardProps,
  type TabButtonProps,
  StatCard,
  TabButton,
  ROLE_BADGE_CLASSES,
  ROLE_AVATAR_CLASSES,
  STATUS_CLASSES,
  ROLE_ICONS
} from './types';

// Re-export types from adminApi
export type {
  User,
  AuditLog,
  SystemSetting,
  PlatformStats,
  ExternalApiConfig,
  ApiTestResult
} from '../../services/adminApi';
