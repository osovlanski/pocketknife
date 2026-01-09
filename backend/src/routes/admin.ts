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

export default router;



