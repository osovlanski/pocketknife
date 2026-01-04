/**
 * Admin Controller
 * 
 * Handles admin operations: user management, system settings,
 * audit logs, and platform statistics.
 */

import { Request, Response } from 'express';
import { getPrisma } from '../services/core/databaseService';
import { logAdminAction } from '../middleware/adminMiddleware';

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

