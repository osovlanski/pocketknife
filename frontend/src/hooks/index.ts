/**
 * Custom Hooks Index
 * 
 * Export all custom hooks for easy importing.
 */

export { default as useAgent } from './useAgent';
export { default as useAuth } from './useAuth';
export { default as useAdmin } from './useAdmin';
export { default as useAutocomplete } from './useAutocomplete';
export { default as useNotification } from './useNotification';
export { default as useSearchController } from './useSearchController';
export { default as useSettings } from './useSettings';
export { default as useTodo } from './useTodo';
export { default as useShopping } from './useShopping';
export { default as useGmail } from './useGmail';
export { default as useLearning } from './useLearning';
export { default as useProblems } from './useProblems';
export { default as useCooking } from './useCooking';
export { default as useNews } from './useNews';
export { default as useDIY } from './useDIY';

// Re-export types
export type { UseAuthReturn } from './useAuth';
export type { UseAdminReturn } from './useAdmin';
export type { Notification, UseNotificationReturn } from './useNotification';
export type { UseSettingsReturn } from './useSettings';
export type { UseTodoReturn } from './useTodo';
export type { UseShoppingReturn } from './useShopping';
export type { UseGmailReturn } from './useGmail';
export type { UseLearningReturn } from './useLearning';
export type { UseProblemsReturn } from './useProblems';
export type { UseCookingReturn } from './useCooking';
export type { UseNewsReturn } from './useNews';
export type { UseDIYReturn } from './useDIY';
