/**
 * Database Service - Prisma Client Singleton
 * 
 * Provides a single instance of PrismaClient for the entire application.
 * Handles connection management, logging, and graceful shutdown.
 * 
 * Note: Prisma 7+ requires datasource URL to be passed to constructor
 */

import { PrismaClient } from '@prisma/client';

// Extend PrismaClient with custom logging
const prismaClientSingleton = () => {
  const options: any = {
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error']
  };
  
  // Prisma 7+ requires datasourceUrl in constructor
  if (process.env.DATABASE_URL) {
    options.datasourceUrl = process.env.DATABASE_URL;
  }
  
  return new PrismaClient(options);
};

// Declare global type for PrismaClient singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use global variable in development to prevent multiple instances during hot reload
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Database service with helper methods
 */
export const databaseService = {
  /**
   * Get Prisma client instance
   */
  getClient: () => prisma,

  /**
   * Check database connection health
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  },

  /**
   * Connect to database (called on app startup)
   */
  connect: async (): Promise<void> => {
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  },

  /**
   * Disconnect from database (called on app shutdown)
   */
  disconnect: async (): Promise<void> => {
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  },

  /**
   * Get or create default user (for single-user mode)
   */
  getDefaultUser: async () => {
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || 'default@pocketknife.local';
    
    let user = await prisma.user.findUnique({
      where: { email: defaultEmail },
      include: { preferences: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: defaultEmail,
          name: 'Default User',
          preferences: {
            create: {
              preferredLanguage: 'javascript',
              preferredJobTypes: ['Remote', 'Hybrid'],
              preferredLocations: [],
              preferredCompanies: [],
              preferredAirlines: [],
              completedLists: []
            }
          }
        },
        include: { preferences: true }
      });
      console.log('✅ Created default user:', defaultEmail);
    }

    return user;
  },

  /**
   * Log activity to database
   */
  logActivity: async (params: {
    userId?: string;
    agent: string;
    action: string;
    details?: string;
    metadata?: Record<string, unknown>;
    status?: 'success' | 'error' | 'warning';
    error?: string;
  }) => {
    try {
      await prisma.activityLog.create({
        data: {
          userId: params.userId,
          agent: params.agent,
          action: params.action,
          details: params.details,
          metadata: params.metadata as any,
          status: params.status || 'success',
          error: params.error
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  },

  /**
   * Get app configuration value
   */
  getConfig: async <T>(key: string, defaultValue?: T): Promise<T | undefined> => {
    const config = await prisma.appConfig.findUnique({
      where: { id: key }
    });
    return config?.value as T ?? defaultValue;
  },

  /**
   * Set app configuration value
   */
  setConfig: async <T>(key: string, value: T, category?: string): Promise<void> => {
    await prisma.appConfig.upsert({
      where: { id: key },
      update: { value: value as object, category },
      create: { id: key, value: value as object, category }
    });
  }
};

export default databaseService;

