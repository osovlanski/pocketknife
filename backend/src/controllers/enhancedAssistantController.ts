/**
 * Enhanced Assistant Controller
 *
 * Handles HTTP and WebSocket requests for the enhanced AI assistant.
 * Supports streaming responses, image uploads, and plan preview.
 */

import { Request, Response } from 'express';
import { Server as SocketServer } from 'socket.io';
import { enhancedAssistantService } from '../services/assistant/enhancedAssistantService';
import { conversationMemoryService } from '../services/assistant/conversationMemoryService';
import logger from '../utils/logger';

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
   */
  private setupSocketHandlers(io: SocketServer): void {
    io.on('connection', (socket) => {
      const userId = socket.handshake.auth?.userId;

      if (userId) {
        // Join user's room for targeted events
        socket.join(`user:${userId}`);
        logger.connect(`Assistant socket connected: ${userId}`);
      }

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
              userId: userId || 'anonymous',
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
                socket.emit('assistant:error', { error: error.message });
              }
            }
          );
        } catch (error: any) {
          logger.fail('Socket chat error', { error: error.message });
          socket.emit('assistant:error', { error: error.message });
        }
      });

      // Handle plan execution
      socket.on('assistant:execute_plan', async (data: PlanExecutionRequest) => {
        try {
          await enhancedAssistantService.executePlan(
            data.plan,
            userId || 'anonymous',
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
                socket.emit('assistant:error', { error: error.message });
              }
            }
          );
        } catch (error: any) {
          logger.fail('Socket plan execution error', { error: error.message });
          socket.emit('assistant:error', { error: error.message });
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
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, conversationId, conversationHistory, enablePlanPreview } = req.body as ChatRequest;
      const userId = (req as any).user?.id || 'anonymous';

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
          userId,
          conversationId: conversationId || `conv-${Date.now()}`,
          enablePlanPreview
        }
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      logger.fail('Chat endpoint error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/assistant/chat-with-image
   * Chat with image upload
   */
  async chatWithImage(req: Request, res: Response): Promise<void> {
    try {
      const { message, image, imageType, conversationId, conversationHistory } = req.body as ImageChatRequest;
      const userId = (req as any).user?.id || 'anonymous';

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
          userId,
          conversationId: conversationId || `conv-${Date.now()}`
        }
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      logger.fail('Chat with image error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/assistant/generate-plan
   * Generate an execution plan without executing
   */
  async generatePlan(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      const userId = (req as any).user?.id || 'anonymous';

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const plan = await enhancedAssistantService.generatePlan(message, userId);

      res.json({
        success: true,
        data: plan
      });
    } catch (error: any) {
      logger.fail('Generate plan error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/assistant/execute-plan
   * Execute a previously generated plan
   */
  async executePlan(req: Request, res: Response): Promise<void> {
    try {
      const { plan } = req.body as PlanExecutionRequest;
      const userId = (req as any).user?.id || 'anonymous';

      if (!plan) {
        res.status(400).json({ error: 'Plan is required' });
        return;
      }

      const response = await enhancedAssistantService.executePlan(plan, userId);

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      logger.fail('Execute plan error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/assistant/store-conversation
   * Store conversation in memory
   */
  async storeConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId, messages } = req.body;
      const userId = (req as any).user?.id || 'anonymous';

      if (!conversationId || !messages) {
        res.status(400).json({ error: 'conversationId and messages are required' });
        return;
      }

      await enhancedAssistantService.storeConversation(
        userId,
        conversationId,
        messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp)
        }))
      );

      res.json({ success: true });
    } catch (error: any) {
      logger.fail('Store conversation error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/assistant/memory
   * Get conversation memory context
   */
  async getMemory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const limit = parseInt(req.query.limit as string) || 5;

      const memories = await conversationMemoryService.getRecentMemories(userId, limit);

      res.json({
        success: true,
        data: memories
      });
    } catch (error: any) {
      logger.fail('Get memory error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/assistant/preferences
   * Get user preferences from memory
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';

      const preferences = await conversationMemoryService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error: any) {
      logger.fail('Get preferences error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/assistant/action-items
   * Get pending action items from memory
   */
  async getActionItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';

      const actionItems = await conversationMemoryService.getPendingActionItems(userId);

      res.json({
        success: true,
        data: actionItems
      });
    } catch (error: any) {
      logger.fail('Get action items error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/assistant/memory
   * Clean up old memories
   */
  async cleanupMemory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const maxAgeDays = parseInt(req.query.maxAgeDays as string) || 30;

      const deleted = await conversationMemoryService.cleanupOldMemories(
        userId,
        maxAgeDays * 24 * 60 * 60 * 1000
      );

      res.json({
        success: true,
        data: { deletedCount: deleted }
      });
    } catch (error: any) {
      logger.fail('Cleanup memory error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
}

export const enhancedAssistantController = new EnhancedAssistantController();
export default enhancedAssistantController;
