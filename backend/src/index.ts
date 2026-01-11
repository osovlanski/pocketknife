// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// =============================================================================
// STARTUP ENV VAR DIAGNOSTICS
// =============================================================================
console.log('\n🔧 ═══════════════════════════════════════════════════════════════');
console.log('   POCKETKNIFE STARTUP - Environment Variables Check');
console.log('═══════════════════════════════════════════════════════════════\n');

// Helper to check env vars with visual status
const checkEnv = (name: string, required = false): string => {
  const value = process.env[name];
  if (value) {
    return `✅ ${name}`;
  }
  return required ? `❌ ${name} (REQUIRED - MISSING!)` : `⚪ ${name} (optional)`;
};

// Core Services
console.log('📦 Core Services:');
console.log('   ' + checkEnv('DATABASE_URL', true));
console.log('   ' + checkEnv('ANTHROPIC_API_KEY', true));
console.log('   ' + checkEnv('FRONTEND_URL'));

// Google OAuth
console.log('\n🔐 Google OAuth:');
console.log('   ' + checkEnv('GOOGLE_CLIENT_ID', true));
console.log('   ' + checkEnv('GOOGLE_CLIENT_SECRET', true));

// Social Auth Providers
console.log('\n👥 Social Auth Providers:');
console.log('   ' + checkEnv('FACEBOOK_APP_ID'));
console.log('   ' + checkEnv('FACEBOOK_APP_SECRET'));
console.log('   ' + checkEnv('LINKEDIN_CLIENT_ID'));
console.log('   ' + checkEnv('LINKEDIN_CLIENT_SECRET'));
console.log('   ' + checkEnv('SSO_ISSUER_URL'));
console.log('   ' + checkEnv('SSO_CLIENT_ID'));

// Notification Services
console.log('\n📬 Notification Services:');
console.log('   ' + checkEnv('TELEGRAM_BOT_TOKEN'));
console.log('   ' + checkEnv('TELEGRAM_CHAT_ID'));
console.log('   ' + checkEnv('DISCORD_WEBHOOK_URL'));

// External APIs
console.log('\n🌐 External APIs:');
console.log('   ' + checkEnv('RAPIDAPI_KEY'));
console.log('   ' + checkEnv('GOOGLE_CSE_API_KEY'));
console.log('   ' + checkEnv('GOOGLE_CSE_ID'));
console.log('   ' + checkEnv('AMADEUS_API_KEY'));
console.log('   ' + checkEnv('AMADEUS_API_SECRET'));
console.log('   ' + checkEnv('ADZUNA_APP_ID'));
console.log('   ' + checkEnv('ADZUNA_API_KEY'));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('💡 TIP: After adding new env vars to .env, RESTART the server!');
console.log('═══════════════════════════════════════════════════════════════\n');

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

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io available to other modules
app.set('io', io);

// CORS configuration - allow all origins in development
app.use(cors());
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
  console.log('✅ A user connected');

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    // Validate configuration
    const configValidation = configService.validate();
    if (!configValidation.valid) {
      console.warn('⚠️ Configuration warnings:', configValidation.errors);
    }
    
    // Initialize Database (if configured)
    if (process.env.DATABASE_URL) {
      console.log('🗄️ Initializing Database service...');
      await databaseService.connect();
      
      // Initialize config from database
      await configService.init();
    } else {
      console.log('ℹ️ Database not configured, running in memory-only mode');
    }
    
    // Initialize Cache service
    console.log('💨 Initializing Cache service...');
    await cacheService.init();
    
    // Initialize Process Control service first (for stop signals)
    console.log('🎛️ Initializing Process Control service...');
    processControlService.initialize(io);
    
    // Check Google Search configuration (lazy init happens here)
    console.log('🔍 Checking Google Search service...');
    googleSearchService.isAvailable(); // Triggers lazy init and logs status
    
    // Initialize Agent Registry
    console.log('🤖 Initializing Agent Registry...');
    initializeAgents();
    agentRegistry.initialize(io);
    
    // Initialize Google Auth service
    console.log('🔐 Initializing Google Auth service...');
    googleAuthService.initialize();
    
    // Initialize Calendar service (depends on Google Auth)
    console.log('📅 Initializing Google Calendar service...');
    const calendarService = await import('./services/calendar/calendarService');
    calendarService.default.initialize();
    
    // Initialize services that don't require OAuth yet
    console.log('📧 Initializing Gmail service...');
    await gmailService.initialize();
    
    console.log('💾 Initializing Drive service...');
    await driveService.initialize();
    
    console.log('📬 Initializing Email notification service...');
    await emailNotificationService.initialize();
    
    console.log('📅 Initializing Email scheduler service...');
    emailSchedulerService.initialize(io);
    
    console.log('✅ All services initialized successfully');
    
    // Show auth status
    if (googleAuthService.isAuthenticated()) {
      console.log('🔗 Google account connected');
    } else {
      console.log('⚠️  Google account not connected. Visit http://localhost:5000/api/auth/google to connect.');
    }
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    console.error('Stack:', (error as Error).stack);
    // Don't exit - some services are optional
  }
}

// Start the server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🔧 Pocketknife - Multi-Agent AI Platform`);
      console.log(`   📧 Email Agent | 💼 Jobs Agent | ✈️ Travel Agent | 📚 Learning Agent`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await cacheService.close();
  await databaseService.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await cacheService.close();
  await databaseService.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});