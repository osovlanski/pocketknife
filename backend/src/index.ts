// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// =============================================================================
// STARTUP ENV VAR DIAGNOSTICS (using console.log for visual banner formatting)
// =============================================================================
const printStartupBanner = () => {
  const checkEnv = (name: string, required = false): string => {
    const value = process.env[name];
    if (value) return `✅ ${name}`;
    return required ? `❌ ${name} (REQUIRED!)` : `⚪ ${name} (optional)`;
  };

  console.log('\n🔧 ═══════════════════════════════════════════════════════════════');
  console.log('   POCKETKNIFE STARTUP - Environment Variables Check');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📦 Core Services:');
  console.log('   ' + checkEnv('DATABASE_URL', true));
  console.log('   ' + checkEnv('ANTHROPIC_API_KEY', true));
  console.log('   ' + checkEnv('FRONTEND_URL'));

  console.log('\n🔐 Google OAuth:');
  console.log('   ' + checkEnv('GOOGLE_CLIENT_ID', true));
  console.log('   ' + checkEnv('GOOGLE_CLIENT_SECRET', true));

  console.log('\n🔒 Security:');
  console.log('   ' + checkEnv('ENCRYPTION_KEY', process.env.NODE_ENV === 'production'));

  console.log('\n📬 Notification Services:');
  console.log('   ' + checkEnv('TELEGRAM_BOT_TOKEN'));
  console.log('   ' + checkEnv('DISCORD_WEBHOOK_URL'));

  console.log('\n🌐 External APIs:');
  console.log('   ' + checkEnv('RAPIDAPI_KEY'));
  console.log('   ' + checkEnv('GOOGLE_CSE_API_KEY'));
  console.log('   ' + checkEnv('AMADEUS_API_KEY'));

  console.log('\n═══════════════════════════════════════════════════════════════\n');
};

printStartupBanner();

// Now import everything else
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import gmailService from './services/email/gmailService';
import driveService from './services/email/driveService';
import emailNotificationService from './services/email/emailNotificationService';
import emailSchedulerService from './services/email/emailSchedulerService';
import googleAuthService from './services/email/googleAuthService';
import processControlService from './services/core/processControlService';
import { databaseService } from './services/core/databaseService';
import { cacheService } from './services/core/cacheService';
import { configService } from './services/core/configService';
import { initializeAgents, agentRegistry } from './agents';
import { googleSearchService } from './services/core/googleSearchService';
import { ramiLevyService } from './services/cooking/ramiLevyService';
import logger from './utils/logger';

// Middleware imports
import {
  securityMiddleware,
  apiLimiter,
  errorHandler,
  notFoundHandler,
  authenticate
} from './middleware';

// Health controller imports
import { ready, healthDetailed } from './controllers/healthController';

const app = express();
const server = createServer(app);

// CORS configuration - support multiple frontend origins during development
// Development origins are loaded from configService, production uses FRONTEND_URL env var only
const devOrigins: string[] = process.env.NODE_ENV === 'production' 
  ? [] 
  : (configService.get('cors.devOrigins') as unknown as string[]) || [];
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...devOrigins
].filter(Boolean) as string[];

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available to other modules
app.set('io', io);

// =============================================================================
// MIDDLEWARE STACK (Order matters!)
// =============================================================================

// 1. Security headers (Helmet) - first line of defense
securityMiddleware.forEach(mw => app.use(mw));

// 2. CORS configuration - allow configured origins in development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));

// 3. Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate limiting - apply to all API routes
app.use('/api', apiLimiter);

// 5. Authentication - protect all API routes (except public ones)
app.use(authenticate);

// 6. Define routes
app.use('/api', routes);

// Health check endpoint (public - no auth required)
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  // Database health check
  let dbStatus: 'connected' | 'disconnected' | 'not configured' = 'not configured';
  let dbLatency: number | null = null;
  if (process.env.DATABASE_URL) {
    const dbStart = Date.now();
    const dbHealth = await databaseService.healthCheck();
    dbLatency = Date.now() - dbStart;
    dbStatus = dbHealth ? 'connected' : 'disconnected';
  }

  // Cache health check
  const cacheStats = cacheService.getStats();

  // Google Auth status
  const googleAuthStatus = googleAuthService.isAuthenticated() ? 'authenticated' : 'not authenticated';

  // Agent registry status
  const agentCount = agentRegistry.getAll().length;

  // Overall health status
  const isHealthy = dbStatus !== 'disconnected';

  const response = {
    status: isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency ? `${dbLatency}ms` : null
      },
      cache: {
        memory: {
          status: 'connected',
          keys: cacheStats.memory.keys,
          hitRate: `${(cacheStats.memory.hitRate * 100).toFixed(1)}%`
        },
        redis: {
          status: cacheStats.redis.available ? 'connected' : 'not configured'
        }
      },
      googleAuth: googleAuthStatus,
      agents: {
        status: 'running',
        count: agentCount
      }
    },
    // Build timestamp for deployment verification
    buildTime: '2026-01-30T22:00:00Z',
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

// Diagnostic endpoint for verifying deployed capabilities
app.get('/health/capabilities', (req, res) => {
  // Dynamic import to avoid circular dependencies
  import('./services/assistant/agentOrchestratorService').then(({ agentOrchestratorService }) => {
    const cookingCaps = agentOrchestratorService.getAgentCapabilities('cooking');
    const ramiLevyCaps = cookingCaps.filter(c => c.action.startsWith('rami-levy'));
    
    res.json({
      timestamp: new Date().toISOString(),
      buildTime: '2026-01-30T22:00:00Z',
      cookingCapabilities: cookingCaps.map(c => c.action),
      ramiLevyCapabilities: ramiLevyCaps.map(c => ({ action: c.action, description: c.description })),
      hasRamiLevy: ramiLevyCaps.length > 0
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Readiness probe endpoint (public - for Kubernetes/load balancers)
app.get('/ready', ready);

// Detailed health endpoint (for debugging, protected in production)
app.get('/health/detailed', healthDetailed);

// 404 handler for unmatched routes (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Socket.io setup
io.on('connection', (socket) => {
  logger.connect('Socket client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.disconnect('Socket client disconnected', { socketId: socket.id });
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.start('Initializing services...');
    
    // Validate configuration
    const configValidation = configService.validate();
    if (!configValidation.valid) {
      logger.warn('Configuration warnings', { errors: configValidation.errors });
    }
    
    // Initialize Database (if configured)
    if (process.env.DATABASE_URL) {
      logger.db('Initializing Database service...');
      await databaseService.connect();
      
      // Initialize config from database
      await configService.init();
    } else {
      logger.skip('Database not configured, running in memory-only mode');
    }
    
    // Initialize Cache service
    logger.cache('Initializing Cache service...');
    await cacheService.init();
    
    // Initialize Process Control service first (for stop signals)
    logger.init('Initializing Process Control service...');
    processControlService.initialize(io);
    
    // Check Google Search configuration (lazy init happens here)
    logger.search('Checking Google Search service...');
    googleSearchService.isAvailable(); // Triggers lazy init and logs status
    
    // Initialize Agent Registry
    logger.agent('Initializing Agent Registry...');
    initializeAgents();
    agentRegistry.initialize(io);
    
    // Initialize Google Auth service
    logger.auth('Initializing Google Auth service...');
    googleAuthService.initialize();
    
    // Initialize Calendar service (depends on Google Auth)
    logger.withIcon('calendar', 'Initializing Google Calendar service...');
    const calendarService = await import('./services/calendar/calendarService');
    calendarService.default.initialize();
    
    // Initialize services that don't require OAuth yet
    logger.email('Initializing Gmail service...');
    await gmailService.initialize();
    
    logger.withIcon('database', 'Initializing Drive service...');
    await driveService.initialize();
    
    logger.email('Initializing Email notification service...');
    await emailNotificationService.initialize();
    
    logger.withIcon('calendar', 'Initializing Email scheduler service...');
    emailSchedulerService.initialize(io);

    // Initialize Rami Levy session cleanup scheduler (every hour)
    logger.init('Initializing Rami Levy session cleanup scheduler...');
    const RAMI_LEVY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    setInterval(() => {
      ramiLevyService.cleanupSessions();
    }, RAMI_LEVY_CLEANUP_INTERVAL);

    logger.success('All services initialized successfully');
    
    // Show auth status
    if (googleAuthService.isAuthenticated()) {
      logger.connect('Google account connected');
    } else {
      const authEndpoint = '/api/auth/google';
      logger.warn('Google account not connected', { authEndpoint });
    }
  } catch (error) {
    logger.fail('Error initializing services', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't exit - some services are optional
  }
}

// Start the server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.success('Server started successfully', { 
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.fail('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.stop('SIGTERM received, shutting down gracefully...');
  await cacheService.close();
  await databaseService.disconnect();
  server.close(() => {
    logger.complete('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.stop('SIGINT received, shutting down gracefully...');
  await cacheService.close();
  await databaseService.disconnect();
  server.close(() => {
    logger.complete('Server closed');
    process.exit(0);
  });
});