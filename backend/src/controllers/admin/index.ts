/**
 * Admin Controllers Index
 *
 * Re-exports all admin controller functions from the main adminController.ts
 * This structure allows for future incremental splitting of the controller
 * into domain-specific modules (users, settings, audit, stats, etc.)
 *
 * Future structure:
 * - admin/userAdminController.ts - User CRUD, role management
 * - admin/configAdminController.ts - System settings
 * - admin/auditAdminController.ts - Audit logs
 * - admin/statsAdminController.ts - Statistics and analytics
 * - admin/apiAdminController.ts - External API management
 * - admin/companyAdminController.ts - Company management
 * - admin/dataAdminController.ts - External data management
 *
 * @module controllers/admin
 */

// For now, re-export everything from the main adminController
// This provides a migration path without breaking existing imports
export {
  // User Management
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  initializeAdmin,

  // System Settings
  getSettings,
  updateSetting,

  // Audit Logs
  getAuditLogs,

  // Statistics
  getStats,

  // External APIs
  getExternalApis,
  getExternalApi,
  updateExternalApi,
  toggleExternalApi,
  testExternalApi,
  testAllExternalApis,

  // Company Management
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  verifyCompany,
  enrichCompany,
  runDiscovery,
  migrateHardcodedCompanies,
  refreshCompanyData,
  getCompanyStats,
  getATSProviders,
  getSizeCategories,

  // Data Migration
  migrateAllHardcodedData,
  getExternalDataStats,

  // External Communities
  listCommunities,
  createCommunity,

  // Learning Resources
  listLearningResources,
  createLearningResource,

  // Search Site Configs
  listSearchSiteConfigs,
  createSearchSiteConfig,

  // External Stores
  listExternalStores,
  createExternalStore
} from '../adminController';
