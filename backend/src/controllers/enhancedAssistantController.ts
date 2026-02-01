/**
 * Enhanced Assistant Controller
 *
 * Handles HTTP and WebSocket requests for the enhanced AI assistant.
 * Supports streaming responses, image uploads, and plan preview.
 *
 * Security features:
 * - Requires authentication for all endpoints
 * - Socket.io authentication validation
 * - Sanitized error responses
 */

import { Request, Response } from 'express';
import { Server as SocketServer, Socket } from 'socket.io';
import { enhancedAssistantService } from '../services/assistant/enhancedAssistantService';
import { conversationMemoryService } from '../services/assistant/conversationMemoryService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { databaseService } from '../services/core/databaseService';
import googleAuthService from '../services/email/googleAuthService';
import logger from '../utils/logger';

// =============================================================================
// ERROR SANITIZATION
// =============================================================================

/**
 * Sanitize error messages to prevent internal information leakage
 */
function sanitizeErrorMessage(error: unknown): string {
  // Known safe error messages that can be shown to users
  const safePatterns = [
    /^Message is required$/,
    /^Image is required$/,
    /^Plan is required$/,
    /^conversationId and messages are required$/,
    /^Invalid base64/,
    /^Image too large/,
    /^Authentication required$/,
    /^Invalid or expired session$/,
  ];

  const message = error instanceof Error ? error.message : String(error);

  // Check if error message is safe to display
  for (const pattern of safePatterns) {
    if (pattern.test(message)) {
      return message;
    }
  }

  // Log the actual error internally
  logger.error('Sanitized error', { originalError: message });

  // Return generic message
  return 'An error occurred processing your request. Please try again.';
}

// =============================================================================
// SOCKET AUTHENTICATION
// =============================================================================

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail?: string;
}

/**
 * Validate socket.io authentication
 * Returns userId if valid, null if invalid
 */
async function validateSocketAuth(socket: Socket): Promise<{ userId: string; userEmail?: string } | null> {
  const auth = socket.handshake.auth;

  // Check for token-based auth
  if (auth?.token) {
    try {
      // Validate token against database
      const user = await databaseService.findUserByToken(auth.token);
      if (user && user.status === 'ACTIVE') {
        return { userId: user.id, userEmail: user.email };
      }
    } catch {
      // Token validation failed
    }
  }

  // Check for userId with session validation
  if (auth?.userId && auth?.sessionToken) {
    try {
      const user = await databaseService.findUserById(auth.userId);
      if (user && user.status === 'ACTIVE') {
        return { userId: user.id, userEmail: user.email };
      }
    } catch {
      // Session validation failed
    }
  }

  // Fallback: Check if Google OAuth is authenticated (development mode)
  if (googleAuthService.isAuthenticated()) {
    const defaultUser = await databaseService.getDefaultUser();
    if (defaultUser) {
      return { userId: defaultUser.id, userEmail: defaultUser.email };
    }
  }

  return null;
}

// =============================================================================
// TYPES
// =============================================================================

interface ChatRequest {
  message: string;
  conversationId: string;
  conversationHistory?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  enablePlanPreview?: boolean;
  enableStreaming?: boolean;
}

interface ImageChatRequest extends ChatRequest {
  image: string; // Base64 encoded image
  imageType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

interface PlanExecutionRequest {
  planId: string;
  plan: {
    id: string;
    steps: Array<{
      id: string;
      tool: string;
      description: string;
      params: Record<string, unknown>;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    }>;
    explanation: string;
    requiresApproval: boolean;
    estimatedActions: number;
  };
}

// =============================================================================
// CONTROLLER
// =============================================================================

class EnhancedAssistantController {
  private io: SocketServer | null = null;

  /**
   * Set Socket.io server for streaming
   */
  setSocketServer(io: SocketServer): void {
    this.io = io;
    enhancedAssistantService.setSocketServer(io);
    this.setupSocketHandlers(io);
  }

  /**
   * Setup Socket.io event handlers for streaming
   * Includes authentication validation for all socket connections
   */
  private setupSocketHandlers(io: SocketServer): void {
    // Add authentication middleware for socket connections
    io.use(async (socket, next) => {
      const authResult = await validateSocketAuth(socket);
      if (!authResult) {
        logger.warn('Socket authentication failed', { socketId: socket.id });
        return next(new Error('Authentication required'));
      }

      // Attach auth info to socket
      (socket as AuthenticatedSocket).userId = authResult.userId;
      (socket as AuthenticatedSocket).userEmail = authResult.userEmail;
      next();
    });

    io.on('connection', (socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const userId = authSocket.userId;

      // userId is guaranteed by middleware, but double-check
      if (!userId) {
        socket.emit('assistant:error', { error: 'Authentication required' });
        socket.disconnect();
        return;
      }

      // Join user's room for targeted events
      socket.join(`user:${userId}`);
      logger.connect(`Assistant socket connected: ${userId}`);

      // Handle streaming chat request
      socket.on('assistant:chat', async (data: ChatRequest) => {
        try {
          const history = (data.conversationHistory || []).map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp)
          }));

          await enhancedAssistantService.chat(
            data.message,
            history,
            {
              userId, // Authenticated userId - never anonymous
              conversationId: data.conversationId,
              enableStreaming: true,
              enablePlanPreview: data.enablePlanPreview
            },
            {
              onToken: (token) => {
                socket.emit('assistant:token', { token });
              },
              onToolCall: (toolCall) => {
                socket.emit('assistant:tool_call', { toolCall });
              },
              onToolResult: (toolName, result) => {
                socket.emit('assistant:tool_result', { toolName, result });
              },
              onPlanPreview: (plan) => {
                socket.emit('assistant:plan_preview', { plan });
              },
              onComplete: (response) => {
                socket.emit('assistant:complete', { response });
              },
              onError: (error) => {
                socket.emit('assistant:error', { error: sanitizeErrorMessage(error) });
              }
            }
          );
        } catch (error: unknown) {
          logger.fail('Socket chat error', { error: error instanceof Error ? error.message : String(error) });
          socket.emit('assistant:error', { error: sanitizeErrorMessage(error) });
        }
      });

      // Handle plan execution
      socket.on('assistant:execute_plan', async (data: PlanExecutionRequest) => {
        try {
          await enhancedAssistantService.executePlan(
            data.plan,
            userId, // Authenticated userId - never anonymous
            {
              onToken: (token) => {
                socket.emit('assistant:token', { token });
              },
              onToolCall: (toolCall) => {
                socket.emit('assistant:tool_call', { toolCall });
              },
              onToolResult: (toolName, result) => {
                socket.emit('assistant:tool_result', { toolName, result });
              },
              onComplete: (response) => {
                socket.emit('assistant:complete', { response });
              },
              onError: (error) => {
                socket.emit('assistant:error', { error: sanitizeErrorMessage(error) });
              }
            }
          );
        } catch (error: unknown) {
          logger.fail('Socket plan execution error', { error: error instanceof Error ? error.message : String(error) });
          socket.emit('assistant:error', { error: sanitizeErrorMessage(error) });
        }
      });

      // Handle stop request
      socket.on('assistant:stop', () => {
        // TODO: Implement cancellation token
        socket.emit('assistant:stopped', {});
      });

      socket.on('disconnect', () => {
        logger.disconnect(`Assistant socket disconnected: ${userId}`);
      });
    });
  }

  /**
   * POST /api/assistant/chat
   * Non-streaming chat endpoint
   * Requires authentication
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      // Authentication is required - no anonymous fallback
      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { message, conversationId, conversationHistory, enablePlanPreview } = req.body as ChatRequest;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const history = (conversationHistory || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp)
      }));

      const response = await enhancedAssistantService.chat(
        message,
        history,
        {
          userId: authReq.userId,
          conversationId: conversationId || `conv-${Date.now()}`,
          enablePlanPreview
        }
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: unknown) {
      logger.fail('Chat endpoint error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * POST /api/assistant/chat-with-image
   * Chat with image upload
   * Requires authentication
   */
  async chatWithImage(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { message, image, conversationId, conversationHistory } = req.body as ImageChatRequest;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      if (!image) {
        res.status(400).json({ error: 'Image is required' });
        return;
      }

      const history = (conversationHistory || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp)
      }));

      const response = await enhancedAssistantService.chatWithImage(
        message,
        image,
        history,
        {
          userId: authReq.userId,
          conversationId: conversationId || `conv-${Date.now()}`
        }
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: unknown) {
      logger.fail('Chat with image error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * POST /api/assistant/generate-plan
   * Generate an execution plan without executing
   * Requires authentication
   */
  async generatePlan(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { message } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const plan = await enhancedAssistantService.generatePlan(message, authReq.userId);

      res.json({
        success: true,
        data: plan
      });
    } catch (error: unknown) {
      logger.fail('Generate plan error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * POST /api/assistant/execute-plan
   * Execute a previously generated plan
   * Requires authentication
   */
  async executePlan(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { plan } = req.body as PlanExecutionRequest;

      if (!plan) {
        res.status(400).json({ error: 'Plan is required' });
        return;
      }

      const response = await enhancedAssistantService.executePlan(plan, authReq.userId);

      res.json({
        success: true,
        data: response
      });
    } catch (error: unknown) {
      logger.fail('Execute plan error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * POST /api/assistant/store-conversation
   * Store conversation in memory
   * Requires authentication
   */
  async storeConversation(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { conversationId, messages } = req.body;

      if (!conversationId || !messages) {
        res.status(400).json({ error: 'conversationId and messages are required' });
        return;
      }

      // Type-safe message mapping
      interface MessageInput {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
      }

      await enhancedAssistantService.storeConversation(
        authReq.userId,
        conversationId,
        (messages as MessageInput[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp)
        }))
      );

      res.json({ success: true });
    } catch (error: unknown) {
      logger.fail('Store conversation error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * GET /api/assistant/memory
   * Get conversation memory context
   * Requires authentication
   */
  async getMemory(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const memories = await conversationMemoryService.getRecentMemories(authReq.userId, limit);

      res.json({
        success: true,
        data: memories
      });
    } catch (error: unknown) {
      logger.fail('Get memory error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * GET /api/assistant/preferences
   * Get user preferences from memory
   * Requires authentication
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const preferences = await conversationMemoryService.getUserPreferences(authReq.userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error: unknown) {
      logger.fail('Get preferences error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * GET /api/assistant/action-items
   * Get pending action items from memory
   * Requires authentication
   */
  async getActionItems(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const actionItems = await conversationMemoryService.getPendingActionItems(authReq.userId);

      res.json({
        success: true,
        data: actionItems
      });
    } catch (error: unknown) {
      logger.fail('Get action items error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }

  /**
   * DELETE /api/assistant/memory
   * Clean up old memories
   * Requires authentication
   */
  async cleanupMemory(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.userId || !authReq.isAuthenticated) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const maxAgeDays = parseInt(req.query.maxAgeDays as string) || 30;

      const deleted = await conversationMemoryService.cleanupOldMemories(
        authReq.userId,
        maxAgeDays * 24 * 60 * 60 * 1000
      );

      res.json({
        success: true,
        data: { deletedCount: deleted }
      });
    } catch (error: unknown) {
      logger.fail('Cleanup memory error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: sanitizeErrorMessage(error) });
    }
  }
}

export const enhancedAssistantController = new EnhancedAssistantController();
export default enhancedAssistantController;
