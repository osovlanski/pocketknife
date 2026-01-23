/**
 * Admin Routes
 * 
 * Protected routes for admin operations.
 */

import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireAdmin, requireSuperAdmin, optionalAuth } from '../middleware/adminMiddleware';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (no auth required)
// =============================================================================

// Initialize admin (one-time setup)
router.post('/initialize', adminController.initializeAdmin);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

// Get current user
router.get('/me', authenticate, adminController.getCurrentUser);

// =============================================================================
// ADMIN ROUTES (require ADMIN or SUPER_ADMIN role)
// =============================================================================

// User management
router.get('/users', authenticate, requireAdmin, adminController.getUsers);
router.get('/users/:id', authenticate, requireAdmin, adminController.getUser);
router.post('/users', authenticate, requireAdmin, adminController.createUser);
router.put('/users/:id', authenticate, requireAdmin, adminController.updateUser);
router.delete('/users/:id', authenticate, requireSuperAdmin, adminController.deleteUser);

// System settings (view)
router.get('/settings', authenticate, requireAdmin, adminController.getSettings);

// Audit logs
router.get('/audit-logs', authenticate, requireAdmin, adminController.getAuditLogs);

// Platform statistics
router.get('/stats', authenticate, requireAdmin, adminController.getStats);

// =============================================================================
// SUPER ADMIN ROUTES
// =============================================================================

// System settings (edit)
router.put('/settings/:id', authenticate, requireSuperAdmin, adminController.updateSetting);

// =============================================================================
// EXTERNAL API MANAGEMENT (ADMIN+)
// =============================================================================

// Get all external API configurations
router.get('/apis', authenticate, requireAdmin, adminController.getExternalApis);

// Test all external APIs (must be before :name route!)
router.post('/apis/test-all', authenticate, requireAdmin, adminController.testAllExternalApis);

// Get single external API configuration
router.get('/apis/:name', authenticate, requireAdmin, adminController.getExternalApi);

// Update external API configuration (SUPER_ADMIN only)
router.put('/apis/:name', authenticate, requireSuperAdmin, adminController.updateExternalApi);

// Toggle external API enabled status (SUPER_ADMIN only)
router.post('/apis/:name/toggle', authenticate, requireSuperAdmin, adminController.toggleExternalApi);

// Test a single external API
router.post('/apis/:name/test', authenticate, requireAdmin, adminController.testExternalApi);

// =============================================================================
// EXTERNAL DATA MANAGEMENT
// =============================================================================

// External companies
router.get('/companies', authenticate, requireAdmin, adminController.listCompanies);
router.get('/companies/:id', authenticate, requireAdmin, adminController.getCompany);
router.post('/companies', authenticate, requireAdmin, adminController.createCompany);
router.put('/companies/:id', authenticate, requireAdmin, adminController.updateCompany);
router.patch('/companies/:id', authenticate, requireAdmin, adminController.updateCompany);
router.delete('/companies/:id', authenticate, requireSuperAdmin, adminController.deleteCompany);
router.post('/companies/:id/verify', authenticate, requireAdmin, adminController.verifyCompany);
router.post('/companies/:id/enrich', authenticate, requireAdmin, adminController.enrichCompany);

// External communities
router.get('/communities', authenticate, requireAdmin, adminController.listCommunities);
router.post('/communities', authenticate, requireAdmin, adminController.createCommunity);

// Learning resources
router.get('/learning-resources', authenticate, requireAdmin, adminController.listLearningResources);
router.post('/learning-resources', authenticate, requireAdmin, adminController.createLearningResource);

// Search site configs
router.get('/search-sites', authenticate, requireAdmin, adminController.listSearchSiteConfigs);
router.post('/search-sites', authenticate, requireAdmin, adminController.createSearchSiteConfig);

// External stores
router.get('/stores', authenticate, requireAdmin, adminController.listExternalStores);
router.post('/stores', authenticate, requireAdmin, adminController.createExternalStore);

// Discovery and migration
router.post('/discovery/run', authenticate, requireAdmin, adminController.runDiscovery);
router.post('/migration/hardcoded-companies', authenticate, requireSuperAdmin, adminController.migrateHardcodedCompanies);
router.post('/migration/all', authenticate, requireSuperAdmin, adminController.migrateAllHardcodedData);
router.post('/enrichment/refresh', authenticate, requireAdmin, adminController.refreshCompanyData);

// Reference data
router.get('/reference/ats-providers', adminController.getATSProviders);
router.get('/reference/size-categories', adminController.getSizeCategories);

// External data statistics
router.get('/stats/companies', authenticate, requireAdmin, adminController.getCompanyStats);
router.get('/stats/external-data', authenticate, requireAdmin, adminController.getExternalDataStats);

export default router;




