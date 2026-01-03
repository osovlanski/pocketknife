/**
 * Database Service - Prisma Client Singleton
 * 
 * Provides a single instance of PrismaClient for the entire application.
 * Handles connection management, logging, and graceful shutdown.
 * 
 * Note: Prisma 7+ requires an adapter for direct database connections
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Lazy initialization variables
let pool: pg.Pool | null = null;
let adapter: PrismaPg | null = null;
let prismaInstance: PrismaClient | null = null;
let initialized = false;

// Declare global type for PrismaClient singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Initialize the database connection lazily
 * Called during app startup after dotenv is loaded
 */
const initializePrisma = (): PrismaClient | null => {
  if (initialized) return prismaInstance;
  initialized = true;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('ℹ️ DATABASE_URL not set, database features disabled');
    return null;
  }

  try {
    // Create PostgreSQL pool
    pool = new pg.Pool({ connectionString: databaseUrl });
    
    // Create Prisma adapter
    adapter = new PrismaPg(pool);
    
    // Create PrismaClient with adapter
    prismaInstance = globalThis.prisma ?? new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error']
    });

    if (process.env.NODE_ENV !== 'production') {
      globalThis.prisma = prismaInstance;
    }

    console.log('✅ Prisma client initialized with pg adapter');
    return prismaInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error);
    return null;
  }
};

// Export getter for prisma client (lazily initialized)
export const getPrisma = (): PrismaClient | null => {
  if (!initialized) {
    initializePrisma();
  }
  return prismaInstance;
};

// Legacy export for backwards compatibility
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrisma();
    if (!client) {
      throw new Error('Database not initialized. Call databaseService.connect() first.');
    }
    return (client as any)[prop];
  }
});

/**
 * Database service with helper methods
 */
export const databaseService = {
  /**
   * Check if database is configured
   */
  isConfigured: () => {
    if (!initialized) initializePrisma();
    return !!prismaInstance;
  },

  /**
   * Get Prisma client instance
   */
  getClient: () => getPrisma(),

  /**
   * Check database connection health
   */
  healthCheck: async (): Promise<boolean> => {
    const client = getPrisma();
    if (!client) return false;
    try {
      await client.$queryRaw`SELECT 1`;
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
    // Initialize prisma lazily
    const client = initializePrisma();
    if (!client) {
      console.log('ℹ️ Database not configured, skipping connection');
      return;
    }
    try {
      await client.$connect();
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
    if (!prismaInstance) return;
    try {
      await prismaInstance.$disconnect();
      if (pool) await pool.end();
      console.log('✅ Database disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  },

  /**
   * Get or create default user (for single-user mode)
   */
  getDefaultUser: async () => {
    const client = getPrisma();
    if (!client) return null;
    
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || 'default@pocketknife.local';
    
    let user = await client.user.findUnique({
      where: { email: defaultEmail },
      include: { preferences: true }
    });

    if (!user) {
      user = await client.user.create({
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
    const client = getPrisma();
    if (!client) return;
    
    try {
      await client.activityLog.create({
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
    const client = getPrisma();
    if (!client) return defaultValue;
    
    const config = await client.appConfig.findUnique({
      where: { id: key }
    });
    return config?.value as T ?? defaultValue;
  },

  /**
   * Set app configuration value
   */
  setConfig: async <T>(key: string, value: T, category?: string): Promise<void> => {
    const client = getPrisma();
    if (!client) return;
    
    await client.appConfig.upsert({
      where: { id: key },
      update: { value: value as object, category },
      create: { id: key, value: value as object, category }
    });
  }
};

export default databaseService;

