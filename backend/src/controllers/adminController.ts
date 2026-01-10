/**
 * Admin Controller
 * 
 * Handles admin operations: user management, system settings,
 * audit logs, platform statistics, and external API management.
 */

import { Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { logAdminAction } from '../middleware/adminMiddleware';
import externalApiService from '../services/core/externalApiService';

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get all users with pagination and filters
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const roleFilter = req.query.role as string;
    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (roleFilter) where.role = roleFilter;
    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          isVerified: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              activityLogs: true,
              tasks: true,
              savedJobs: true,
              tripPlans: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Get single user details
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        emailStats: true,
        _count: {
          select: {
            activityLogs: true,
            tasks: true,
            savedJobs: true,
            tripPlans: true,
            solvedProblems: true,
            products: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { email, name, role = 'USER', status = 'ACTIVE' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role,
        status,
        isVerified: req.user?.role === 'SUPER_ADMIN',
        verifiedAt: req.user?.role === 'SUPER_ADMIN' ? new Date() : null,
        verifiedBy: req.user?.role === 'SUPER_ADMIN' ? req.user.id : null,
        preferences: {
          create: {
            preferredLanguage: 'javascript',
            preferredJobTypes: [],
            preferredLocations: [],
            preferredCompanies: [],
            preferredAirlines: [],
            completedLists: [],
            favoriteCategories: [],
            favoriteBrands: []
          }
        }
      }
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'create_user',
      'user',
      user.id,
      user.email,
      null,
      { email, name, role, status },
      undefined,
      req
    );

    res.status(201).json({ user });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { id } = req.params;
    const { name, role, status } = req.body;

    // Get current user for audit log
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent demoting yourself or last super admin
    if (role && role !== currentUser.role) {
      if (currentUser.id === req.user?.id && currentUser.role === 'SUPER_ADMIN') {
        return res.status(400).json({ 
          error: 'Cannot change your own super admin role' 
        });
      }

      if (currentUser.role === 'SUPER_ADMIN') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' }
        });
        if (superAdminCount <= 1) {
          return res.status(400).json({ 
            error: 'Cannot demote the last super admin' 
          });
        }
      }

      // Only super admins can create/modify other admins
      if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ 
          error: 'Only super admins can assign admin roles' 
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'update_user',
      'user',
      user.id,
      user.email,
      { name: currentUser.name, role: currentUser.role, status: currentUser.status },
      updateData,
      undefined,
      req
    );

    res.json({ user });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-deletion
    if (user.id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Prevent deleting last super admin
    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' }
      });
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last super admin' });
      }
    }

    await prisma.user.delete({ where: { id } });

    // Log action
    await logAdminAction(
      req.user!.id,
      'delete_user',
      'user',
      id,
      user.email,
      { email: user.email, name: user.name, role: user.role },
      null,
      undefined,
      req
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// =============================================================================
// SYSTEM SETTINGS
// =============================================================================

/**
 * Get all system settings
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const category = req.query.category as string;
    
    const where: any = {};
    if (category) where.category = category;

    // Non-admins only see public settings
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      where.isPublic = true;
    }

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    res.json({ settings: grouped });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

/**
 * Update system setting
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { id } = req.params;
    const { value } = req.body;

    const current = await prisma.systemSetting.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!current.isEditable) {
      return res.status(400).json({ error: 'This setting cannot be edited' });
    }

    const setting = await prisma.systemSetting.update({
      where: { id },
      data: {
        value,
        updatedBy: req.user?.id
      }
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'update_settings',
      'settings',
      id,
      undefined,
      { value: current.value },
      { value },
      undefined,
      req
    );

    res.json({ setting });
  } catch (error: any) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

// =============================================================================
// AUDIT LOGS
// =============================================================================

/**
 * Get audit logs
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const actionFilter = req.query.action as string;
    const adminFilter = req.query.adminId as string;

    const where: any = {};
    if (actionFilter) where.action = actionFilter;
    if (adminFilter) where.adminId = adminFilter;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: { email: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.adminAuditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
};

// =============================================================================
// PLATFORM STATISTICS
// =============================================================================

/**
 * Get platform statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const [
      userCount,
      activeUsers,
      taskCount,
      completedTasks,
      productCount,
      savedJobs,
      tripPlans,
      activityToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'completed' } }),
      prisma.product.count(),
      prisma.savedJob.count(),
      prisma.tripPlan.count(),
      prisma.activityLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    // Get recent activity by agent
    const activityByAgent = await prisma.activityLog.groupBy({
      by: ['agent'],
      _count: true,
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    res.json({
      stats: {
        users: {
          total: userCount,
          active: activeUsers
        },
        tasks: {
          total: taskCount,
          completed: completedTasks,
          completionRate: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
        },
        products: productCount,
        savedJobs,
        tripPlans,
        activityToday,
        activityByAgent: activityByAgent.reduce((acc, { agent, _count }) => {
          acc[agent] = _count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    if (!req.user) {
      console.log('❌ getCurrentUser: No user in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`📋 getCurrentUser: Fetching user ${req.user.email} (role: ${req.user.role})`);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        preferences: true
      }
    });

    console.log(`📋 getCurrentUser: Returning user with role=${user?.role}, email=${user?.email}`);
    res.json({ user });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

/**
 * Initialize admin user if not exists
 */
export const initializeAdmin = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'itayosov@gmail.com').toLowerCase();
    console.log(`🔧 initializeAdmin: Looking for ${adminEmail}`);

    // Check if this user already exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (user) {
      console.log(`🔧 initializeAdmin: Found user with role=${user.role}, status=${user.status}`);
      
      // User exists - upgrade to super admin if not already
      if (user.role !== 'SUPER_ADMIN') {
        console.log(`🔧 initializeAdmin: Upgrading ${adminEmail} from ${user.role} to SUPER_ADMIN`);
        user = await prisma.user.update({
          where: { email: adminEmail },
          data: {
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            isVerified: true,
            verifiedAt: new Date()
          }
        });
        console.log(`✅ initializeAdmin: User upgraded to SUPER_ADMIN`);
      }
      
      // Initialize external API configs
      await externalApiService.initializeDefaults();
      
      return res.json({ 
        message: 'Admin initialized',
        initialized: true,
        admin: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }

    // Create new admin user
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isVerified: true,
        verifiedAt: new Date()
      }
    });

    // Create preferences separately to avoid schema issues
    try {
      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: 'javascript',
          preferredJobTypes: [],
          preferredLocations: [],
          preferredCompanies: [],
          preferredAirlines: [],
          completedLists: []
        }
      });
    } catch (prefError) {
      console.log('Preferences creation skipped:', prefError);
    }

    // Initialize default system settings
    const defaultSettings = [
      { id: 'general.platform_name', category: 'general', name: 'Platform Name', value: 'Pocketknife', isPublic: true },
      { id: 'general.maintenance_mode', category: 'general', name: 'Maintenance Mode', value: false, isPublic: true },
      { id: 'agents.email_enabled', category: 'agents', name: 'Email Agent Enabled', value: true, isPublic: false },
      { id: 'agents.jobs_enabled', category: 'agents', name: 'Jobs Agent Enabled', value: true, isPublic: false },
      { id: 'agents.travel_enabled', category: 'agents', name: 'Travel Agent Enabled', value: true, isPublic: false },
      { id: 'agents.learning_enabled', category: 'agents', name: 'Learning Agent Enabled', value: true, isPublic: false },
      { id: 'agents.problems_enabled', category: 'agents', name: 'Problems Agent Enabled', value: true, isPublic: false },
      { id: 'agents.todo_enabled', category: 'agents', name: 'ToDo Agent Enabled', value: true, isPublic: false },
      { id: 'agents.shopping_enabled', category: 'agents', name: 'Shopping Agent Enabled', value: true, isPublic: false },
      { id: 'notifications.telegram_enabled', category: 'notifications', name: 'Telegram Notifications', value: true, isPublic: false },
      { id: 'notifications.email_enabled', category: 'notifications', name: 'Email Notifications', value: true, isPublic: false },
      { id: 'security.max_login_attempts', category: 'security', name: 'Max Login Attempts', value: 5, isPublic: false },
      { id: 'security.session_timeout_hours', category: 'security', name: 'Session Timeout (hours)', value: 24, isPublic: false }
    ];

    for (const setting of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { id: setting.id },
        update: {},
        create: {
          ...setting,
          value: setting.value as any,
          description: null,
          isEditable: true
        }
      });
    }

    // Initialize external API configs
    await externalApiService.initializeDefaults();

    res.json({
      message: 'Admin initialized successfully',
      initialized: true,
      admin: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Initialize admin error:', error);
    res.status(500).json({ error: 'Failed to initialize admin' });
  }
};

// =============================================================================
// EXTERNAL API MANAGEMENT
// =============================================================================

/**
 * Get all external API configurations
 */
export const getExternalApis = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    console.log(`📡 getExternalApis: Fetching APIs (category: ${category || 'all'})`);
    
    const apis = await externalApiService.getAll(category);
    console.log(`📦 getExternalApis: Got ${apis.length} APIs`);

    // Group by category
    const grouped = apis.reduce((acc, api) => {
      if (!acc[api.category]) {
        acc[api.category] = [];
      }
      acc[api.category].push(api);
      return acc;
    }, {} as Record<string, typeof apis>);

    console.log(`📊 getExternalApis: Grouped into ${Object.keys(grouped).length} categories`);
    res.json({ apis: grouped, flat: apis });
  } catch (error: any) {
    console.error('❌ Get external APIs error:', error);
    res.status(500).json({ error: 'Failed to get external APIs' });
  }
};

/**
 * Get single external API configuration
 */
export const getExternalApi = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const api = await externalApiService.getByName(name);

    if (!api) {
      return res.status(404).json({ error: 'API configuration not found' });
    }

    res.json({ api });
  } catch (error: any) {
    console.error('Get external API error:', error);
    res.status(500).json({ error: 'Failed to get external API' });
  }
};

/**
 * Update external API configuration
 */
export const updateExternalApi = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { isEnabled, priority, description } = req.body;

    const current = await externalApiService.getByName(name);
    if (!current) {
      return res.status(404).json({ error: 'API configuration not found' });
    }

    const updated = await externalApiService.update(name, {
      isEnabled,
      priority,
      description
    });

    // Log admin action
    await logAdminAction(
      req.user!.id,
      'update_api_config',
      'api',
      name,
      undefined,
      { isEnabled: current.isEnabled, priority: current.priority },
      { isEnabled, priority, description },
      undefined,
      req
    );

    res.json({ api: updated });
  } catch (error: any) {
    console.error('Update external API error:', error);
    res.status(500).json({ error: 'Failed to update external API' });
  }
};

/**
 * Toggle external API enabled status
 */
export const toggleExternalApi = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const current = await externalApiService.getByName(name);
    if (!current) {
      return res.status(404).json({ error: 'API configuration not found' });
    }

    const updated = await externalApiService.toggle(name);

    // Log admin action
    await logAdminAction(
      req.user!.id,
      'toggle_api',
      'api',
      name,
      undefined,
      { isEnabled: current.isEnabled },
      { isEnabled: updated?.isEnabled },
      undefined,
      req
    );

    res.json({ 
      api: updated,
      message: `${current.displayName} is now ${updated?.isEnabled ? 'enabled' : 'disabled'}`
    });
  } catch (error: any) {
    console.error('Toggle external API error:', error);
    res.status(500).json({ error: 'Failed to toggle external API' });
  }
};

/**
 * Test an external API
 */
export const testExternalApi = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    const api = await externalApiService.getByName(name);
    if (!api) {
      return res.status(404).json({ error: 'API configuration not found' });
    }

    // Import axios dynamically for testing
    const axios = await import('axios');
    
    let isHealthy = false;
    let error: string | undefined;
    let responseTime: number = 0;
    
    const startTime = Date.now();
    
    try {
      // Different test strategies based on API
      switch (name) {
        case 'remoteok':
          await axios.default.get('https://remoteok.com/api', {
            headers: { 'User-Agent': 'JobSearchAgent/1.0' },
            timeout: 10000,
            httpsAgent
          });
          isHealthy = true;
          break;
          
        case 'remotive':
          await axios.default.get('https://remotive.com/api/remote-jobs', {
            timeout: 10000,
            httpsAgent
          });
          isHealthy = true;
          break;
          
        case 'arbeitnow':
          await axios.default.get('https://www.arbeitnow.com/api/job-board-api', {
            timeout: 10000,
            httpsAgent
          });
          isHealthy = true;
          break;
          
        case 'themuse':
          const museRes = await axios.default.get('https://www.themuse.com/api/public/jobs', {
            params: { page: 0, api_key: 'public' },
            timeout: 10000,
            httpsAgent
          });
          isHealthy = museRes.status === 200;
          break;
          
        case 'findwork':
          const findworkRes = await axios.default.get('https://findwork.dev/api/jobs/', {
            headers: { 'Authorization': 'Token public' },
            timeout: 10000,
            httpsAgent,
            validateStatus: (s) => s < 500
          });
          isHealthy = findworkRes.status !== 401 && findworkRes.status !== 403;
          if (!isHealthy) error = 'Authentication required';
          break;
          
        case 'himalayas':
          const himRes = await axios.default.get('https://himalayas.app/jobs.json', {
            timeout: 10000,
            httpsAgent,
            validateStatus: (s) => s < 500
          });
          isHealthy = himRes.status === 200;
          break;
          
        case 'jsearch':
          if (!process.env.RAPIDAPI_KEY) {
            isHealthy = false;
            error = 'RAPIDAPI_KEY not configured';
          } else {
            const jsearchRes = await axios.default.get('https://jsearch.p.rapidapi.com/search', {
              params: { query: 'developer', page: '1', num_pages: '1' },
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
              },
              timeout: 20000,
              httpsAgent
            });
            isHealthy = jsearchRes.status === 200;
          }
          break;
          
        case 'adzuna':
          if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
            isHealthy = false;
            error = 'ADZUNA_APP_ID or ADZUNA_APP_KEY not configured';
          } else {
            const adzunaRes = await axios.default.get('https://api.adzuna.com/v1/api/jobs/us/search/1', {
              params: {
                app_id: process.env.ADZUNA_APP_ID,
                app_key: process.env.ADZUNA_APP_KEY,
                what: 'developer',
                results_per_page: 1
              },
              timeout: 15000,
              httpsAgent
            });
            isHealthy = adzunaRes.status === 200;
          }
          break;
          
        case 'israeli_tech':
          // This is a local service, always healthy
          isHealthy = true;
          break;
        
        // Google APIs - explicitly check for GOOGLE_CSE_API_KEY
        case 'google_cse':
        case 'google_places':
          if (!process.env.GOOGLE_CSE_API_KEY) {
            isHealthy = false;
            error = 'GOOGLE_CSE_API_KEY not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // GitHub API - explicitly check for GITHUB_TOKEN
        case 'github_api':
          if (!process.env.GITHUB_TOKEN) {
            isHealthy = false;
            error = 'GITHUB_TOKEN not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // Telegram - explicitly check for token
        case 'telegram_bot':
          if (!process.env.TELEGRAM_BOT_TOKEN) {
            isHealthy = false;
            error = 'TELEGRAM_BOT_TOKEN not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // Discord - explicitly check for webhook URL
        case 'discord_webhook':
          if (!process.env.DISCORD_WEBHOOK_URL) {
            isHealthy = false;
            error = 'DISCORD_WEBHOOK_URL not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // Anthropic Claude - explicitly check
        case 'anthropic_claude':
          if (!process.env.ANTHROPIC_API_KEY) {
            isHealthy = false;
            error = 'ANTHROPIC_API_KEY not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // Gmail API - check OAuth is configured
        case 'gmail_api':
          if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            isHealthy = false;
            error = 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // DEV.to API - free, no auth needed
        case 'dev_to':
          try {
            const devtoRes = await axios.default.get('https://dev.to/api/articles?per_page=1', {
              timeout: 10000
            });
            isHealthy = devtoRes.status === 200;
          } catch {
            isHealthy = false;
            error = 'DEV.to API unreachable';
          }
          break;
        
        // Amadeus API - check OAuth credentials
        case 'amadeus':
          if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
            isHealthy = false;
            error = 'AMADEUS_API_KEY or AMADEUS_API_SECRET not configured';
          } else {
            isHealthy = true;
          }
          break;
        
        // LeetCode GraphQL - no auth needed
        case 'leetcode_graphql':
          try {
            const leetcodeRes = await axios.default.post('https://leetcode.com/graphql', 
              { query: '{ __typename }' },
              { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
            );
            isHealthy = leetcodeRes.status === 200;
          } catch {
            isHealthy = false;
            error = 'LeetCode API unreachable';
          }
          break;
        
        // Scrapers - mark as healthy if they exist (can't test without actual scraping)
        case 'zap_scraper':
        case 'ksp_scraper':
          isHealthy = true; // Internal scrapers, always available
          break;
          
        default:
          // For any API not explicitly handled, try a simple GET if it has a baseUrl
          if (api.baseUrl) {
            try {
              const response = await axios.default.get(api.baseUrl, {
                timeout: 10000,
                validateStatus: (s: number) => s < 500
              });
              isHealthy = response.status === 200;
              if (!isHealthy) error = `HTTP ${response.status}`;
            } catch (e: any) {
              isHealthy = false;
              error = e.message || 'Connection failed';
            }
          } else {
            error = 'Unknown API';
          }
      }
    } catch (testError: any) {
      isHealthy = false;
      error = testError.message || 'Connection failed';
    }
    
    responseTime = Date.now() - startTime;
    
    // Update health status in database
    await externalApiService.updateHealth(name, isHealthy, error);

    res.json({
      api: name,
      displayName: api.displayName,
      isHealthy,
      responseTime,
      error,
      hasApiKey: api.hasApiKey,
      requiresAuth: api.requiresAuth
    });
  } catch (error: any) {
    console.error('Test external API error:', error);
    res.status(500).json({ error: 'Failed to test external API' });
  }
};

/**
 * Test all external APIs
 */
export const testAllExternalApis = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Starting test of all external APIs...');
    
    // If category provided, test only that category; otherwise test all
    const category = req.query.category as string | undefined;
    
    let apis;
    try {
      apis = await externalApiService.getAll(category);
    } catch (fetchError: any) {
      console.error('❌ Error fetching API configs:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch API configurations', 
        details: fetchError.message 
      });
    }
    
    console.log(`📋 Found ${apis.length} APIs to test in category: ${category}`);
    
    if (!apis || apis.length === 0) {
      console.log('⚠️ No APIs found to test');
      return res.json({
        results: [],
        summary: { total: 0, healthy: 0, unhealthy: 0, healthPercentage: 0 }
      });
    }
    
    const results: Array<{
      name: string;
      displayName: string;
      isHealthy: boolean;
      responseTime: number;
      error?: string;
      hasApiKey: boolean;
    }> = [];

    // Import axios for HTTP testing
    let axios;
    let https;
    try {
      axios = await import('axios');
      https = await import('https');
    } catch (importError: any) {
      console.error('❌ Failed to import axios:', importError);
      return res.status(500).json({ 
        error: 'Failed to load HTTP client', 
        details: importError.message 
      });
    }

    // Create HTTPS agent that ignores SSL errors (for health checks only)
    // This is needed because Railway/cloud platforms may use proxies with self-signed certs
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    // Test each API sequentially to avoid rate limits
    for (const api of apis) {
      console.log(`  Testing ${api.displayName}...`);
      const startTime = Date.now();
      let isHealthy = false;
      let error: string | undefined;
      
      try {
        // Skip disabled APIs
        if (!api.isEnabled) {
          error = 'API disabled';
          isHealthy = false;
        }
        // ============ Explicit API checks (override database values) ============
        // Local/internal services
        else if (api.name === 'israeli_tech') {
          isHealthy = true;
        }
        // Google APIs - explicitly check for GOOGLE_CSE_API_KEY
        else if (api.name === 'google_cse' || api.name === 'google_places') {
          if (process.env.GOOGLE_CSE_API_KEY) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'GOOGLE_CSE_API_KEY not configured';
          }
        }
        // GitHub API
        else if (api.name === 'github_api') {
          if (process.env.GITHUB_TOKEN) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'GITHUB_TOKEN not configured';
          }
        }
        // Telegram
        else if (api.name === 'telegram_bot') {
          if (process.env.TELEGRAM_BOT_TOKEN) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'TELEGRAM_BOT_TOKEN not configured';
          }
        }
        // Discord
        else if (api.name === 'discord_webhook') {
          if (process.env.DISCORD_WEBHOOK_URL) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'DISCORD_WEBHOOK_URL not configured';
          }
        }
        // Anthropic Claude
        else if (api.name === 'anthropic_claude') {
          if (process.env.ANTHROPIC_API_KEY) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'ANTHROPIC_API_KEY not configured';
          }
        }
        // Gmail API
        else if (api.name === 'gmail_api') {
          if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            isHealthy = true;
          } else {
            isHealthy = false;
            error = 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured';
          }
        }
        // ============ Generic checks for remaining APIs ============
        // GraphQL APIs need POST request
        else if (api.authType === 'graphql') {
          const response = await axios.default.post(api.baseUrl!, 
            { query: '{ __typename }' }, // Minimal GraphQL introspection
            {
              timeout: 10000,
              httpsAgent,
              validateStatus: (s: number) => s < 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
          isHealthy = response.status === 200;
          if (!isHealthy) error = `HTTP ${response.status}`;
        }
        // Web scrapers - just check if site is reachable
        else if (api.authType === 'scraper') {
          const response = await axios.default.get(api.baseUrl!, {
            timeout: 10000,
            httpsAgent,
            validateStatus: (s: number) => s < 500,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml'
            }
          });
          // 403 is common for scrapers, still consider working if we get any response
          isHealthy = response.status === 200 || response.status === 403;
          if (response.status === 403) {
            error = 'Blocked (403) - may work with browser headers';
            isHealthy = true; // Mark as "working" since site is reachable
          } else if (!isHealthy) {
            error = `HTTP ${response.status}`;
          }
        }
        // OAuth2 APIs - just mark as available if credentials exist
        else if (api.authType === 'oauth2') {
          if (api.hasApiKey) {
            isHealthy = true;
          } else {
            error = `${api.apiKeyEnvVar} not configured`;
          }
        }
        // APIs requiring auth - check if key is configured
        else if (api.requiresAuth) {
          if (api.hasApiKey) {
            isHealthy = true;
          } else {
            error = `${api.apiKeyEnvVar} not configured`;
          }
        }
        // Free APIs - simple GET test
        else if (api.baseUrl) {
          const response = await axios.default.get(api.baseUrl, {
            timeout: 10000,
            httpsAgent,
            validateStatus: (s: number) => s < 500,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/html'
            }
          });
          isHealthy = response.status === 200;
          if (!isHealthy) {
            error = `HTTP ${response.status}`;
          }
        }
      } catch (e: any) {
        error = e.code === 'ECONNREFUSED' ? 'Connection refused' :
                e.code === 'ETIMEDOUT' ? 'Connection timed out' :
                e.response?.status ? `HTTP ${e.response.status}` :
                e.message || 'Connection failed';
      }
      
      const responseTime = Date.now() - startTime;
      
      console.log(`    ${isHealthy ? '✅' : '❌'} ${api.displayName}: ${isHealthy ? 'OK' : error} (${responseTime}ms)`);
      
      // Update health in DB (silently fails if table doesn't exist)
      try {
        await externalApiService.updateHealth(api.name, isHealthy, error);
      } catch (dbError) {
        // Ignore DB update errors
      }
      
      // Compute hasApiKey based on actual env vars, not database cache
      let hasApiKey = false;
      switch (api.name) {
        case 'google_cse':
        case 'google_places':
          hasApiKey = !!process.env.GOOGLE_CSE_API_KEY;
          break;
        case 'github_api':
          hasApiKey = !!process.env.GITHUB_TOKEN;
          break;
        case 'telegram_bot':
          hasApiKey = !!process.env.TELEGRAM_BOT_TOKEN;
          break;
        case 'discord_webhook':
          hasApiKey = !!process.env.DISCORD_WEBHOOK_URL;
          break;
        case 'anthropic_claude':
          hasApiKey = !!process.env.ANTHROPIC_API_KEY;
          break;
        case 'gmail_api':
          hasApiKey = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
          break;
        case 'jsearch':
          hasApiKey = !!process.env.RAPIDAPI_KEY;
          break;
        case 'adzuna':
          hasApiKey = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
          break;
        case 'amadeus':
          hasApiKey = !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
          break;
        default:
          // For APIs without specific key requirements, use the database value or true for free APIs
          hasApiKey = api.requiresAuth ? (api.hasApiKey || false) : true;
      }
      
      results.push({
        name: api.name,
        displayName: api.displayName,
        isHealthy,
        responseTime,
        error,
        hasApiKey
      });
    }

    // Summary
    const healthy = results.filter(r => r.isHealthy).length;
    const unhealthy = results.filter(r => !r.isHealthy).length;

    console.log(`\n📊 Test Summary: ${healthy}/${results.length} APIs healthy (${Math.round((healthy / results.length) * 100)}%)`);

    res.json({
      results,
      summary: {
        total: results.length,
        healthy,
        unhealthy,
        healthPercentage: results.length > 0 ? Math.round((healthy / results.length) * 100) : 0
      }
    });
  } catch (error: any) {
    console.error('❌ Test all external APIs error:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to test external APIs', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

