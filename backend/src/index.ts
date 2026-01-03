// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Debug: Verify Anthropic API key is loaded
console.log('🔑 ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'YES (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : '❌ MISSING');

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

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
    
    // Initialize Process Control service first (for stop signals)
    console.log('🎛️ Initializing Process Control service...');
    processControlService.initialize(io);
    
    // Initialize Google Auth service
    console.log('🔐 Initializing Google Auth service...');
    googleAuthService.initialize();
    
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