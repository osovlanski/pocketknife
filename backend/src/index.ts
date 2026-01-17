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
import logger from './utils/logger';

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

// CORS configuration - allow configured origins in development
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = process.env.DATABASE_URL ? await databaseService.healthCheck() : null;
  const cacheStats = cacheService.getStats();
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth === null ? 'not configured' : (dbHealth ? 'connected' : 'disconnected'),
      cache: {
        memory: `${cacheStats.memory.keys} keys`,
        redis: cacheStats.redis.available ? 'connected' : 'not configured',
        hitRate: `${(cacheStats.memory.hitRate * 100).toFixed(1)}%`
      }
    },
    version: process.env.npm_package_version || '2.0.0'
  });
});

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