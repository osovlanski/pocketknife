/**
 * Health Check Controller
 *
 * Provides endpoints for liveness and readiness probes.
 * Used by load balancers and Kubernetes for health monitoring.
 */

import { Request, Response } from 'express';
import { databaseService } from '../services/core/databaseService';
import { cacheService } from '../services/core/cacheService';
import logger from '../utils/logger';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
}

interface ReadinessStatus extends HealthStatus {
  checks: {
    database: boolean;
    cache: {
      memory: boolean;
      redis: boolean;
    };
  };
}

/**
 * Liveness probe - indicates if the service is running
 * GET /health
 */
export const health = (_req: Request, res: Response): void => {
  const response: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime()
  };

  res.json(response);
};

/**
 * Readiness probe - indicates if the service can accept traffic
 * GET /ready
 *
 * Checks:
 * - Database connection (if configured)
 * - Cache connection (memory always, Redis if configured)
 */
export const ready = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check database health
    const dbConfigured = databaseService.isConfigured();
    const dbHealthy = dbConfigured ? await databaseService.healthCheck() : true;

    // Check cache health
    const cacheStats = cacheService.getStats();
    const memoryHealthy = true; // Memory cache is always available
    const redisHealthy = !cacheStats.redis.available || cacheStats.redis.connected;

    const allHealthy = dbHealthy && memoryHealthy && redisHealthy;

    const response: ReadinessStatus = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy,
        cache: {
          memory: memoryHealthy,
          redis: redisHealthy
        }
      }
    };

    if (allHealthy) {
      res.json(response);
    } else {
      // Return 503 for Kubernetes/load balancer to mark as unhealthy
      res.status(503).json(response);
    }
  } catch (error) {
    logger.error('Health check error', { error: error instanceof Error ? error.message : String(error) });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checks: {
        database: false,
        cache: {
          memory: false,
          redis: false
        }
      }
    });
  }
};

/**
 * Detailed health check - provides full system status
 * GET /health/detailed
 *
 * Returns more detailed information for debugging.
 * Should be protected in production.
 */
export const healthDetailed = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbConfigured = databaseService.isConfigured();
    const dbHealthy = dbConfigured ? await databaseService.healthCheck() : true;
    const cacheStats = cacheService.getStats();

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      checks: {
        database: {
          configured: dbConfigured,
          healthy: dbHealthy
        },
        cache: {
          memory: {
            healthy: true,
            keys: cacheStats.memory.keys,
            hitRate: (cacheStats.memory.hitRate * 100).toFixed(1) + '%'
          },
          redis: {
            configured: cacheStats.redis.available,
            connected: cacheStats.redis.connected
          }
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Detailed health check error', { error: error instanceof Error ? error.message : String(error) });

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
