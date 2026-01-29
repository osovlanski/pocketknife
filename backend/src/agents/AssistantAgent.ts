/**
 * AssistantAgent
 * 
 * AI-powered chat assistant that can orchestrate actions across all agents.
 * Uses natural language processing to understand user intent and execute
 * multi-step workflows.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { 
  assistantService, 
  agentOrchestratorService,
  ChatMessage,
  WorkflowStep 
} from '../services/assistant';
import { configService } from '../services/core/configService';
import { cacheService } from '../services/core/cacheService';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

interface AssistantParams extends AgentParams {
  action: 'chat' | 'get-capabilities' | 'get-conversation' | 'clear-conversation';
  message?: string;
  conversationId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface AssistantResult {
  response?: string;
  conversationId?: string;
  workflowSteps?: WorkflowStep[];
  suggestions?: string[];
  sources?: string[];
  capabilities?: ReturnType<typeof agentOrchestratorService.getAvailableAgents>;
  messages?: ChatMessage[];
}

// =============================================================================
// CONVERSATION CACHE KEYS
// =============================================================================

const conversationCacheKey = (userId: string, conversationId: string) => 
  `assistant:conversation:${userId}:${conversationId}`;

// =============================================================================
// ASSISTANT AGENT
// =============================================================================

export class AssistantAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'assistant',
    name: 'AI Assistant',
    description: 'Your intelligent assistant that can help with recipes, jobs, travel, tasks, and more',
    icon: '🤖',
    color: '#8B5CF6' // Purple
  };

  constructor() {
    super({
      rateLimit: configService.get('assistant.agent.rateLimit', 30),
      defaultTimeoutMs: configService.get('assistant.agent.timeoutMs', 120000)
    });
  }

  protected async run(params: AssistantParams): Promise<AgentResult<AssistantResult>> {
    const { action } = params;

    switch (action) {
      case 'chat':
        return this.handleChat(params);
      case 'get-capabilities':
        return this.getCapabilities();
      case 'get-conversation':
        return this.getConversation(params);
      case 'clear-conversation':
        return this.clearConversation(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ===========================================================================
  // CHAT
  // ===========================================================================

  private async handleChat(params: AssistantParams): Promise<AgentResult<AssistantResult>> {
    const { userId, message, conversationId, history } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!message) return { success: false, error: 'Message is required' };

    const convId = conversationId || uuidv4();
    this.emitLog(`💬 Processing: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`, 'info');
    this.emitProgress(10);

    try {
      // Get conversation history from cache or params
      const conversationHistory = await this.getConversationHistory(userId, convId, history);

      // Add user message to history
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      conversationHistory.push(userMessage);

      this.emitProgress(20);
      this.emitLog('🧠 Analyzing your request...', 'info');

      // Process message through assistant service
      const response = await assistantService.handleMessage(
        message,
        userId,
        conversationHistory,
        (step: WorkflowStep) => {
          this.emitLog(`⚡ ${step.agentId}.${step.action}: ${step.status}`, 'info');
          this.emitProgress(20 + (step.status === 'completed' ? 30 : 10));
        }
      );

      this.emitProgress(80);

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        workflowSteps: response.workflowResult?.steps
      };
      conversationHistory.push(assistantMessage);

      // Cache the conversation
      await this.saveConversationHistory(userId, convId, conversationHistory);

      this.emitProgress(100);
      this.emitLog('✅ Response ready', 'success');

      return {
        success: true,
        data: {
          response: response.message,
          conversationId: convId,
          workflowSteps: response.workflowResult?.steps,
          suggestions: response.suggestions,
          sources: response.sources
        }
      };
    } catch (error: any) {
      this.emitLog(`❌ Error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // CONVERSATION MANAGEMENT
  // ===========================================================================

  private async getConversationHistory(
    userId: string,
    conversationId: string,
    providedHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<ChatMessage[]> {
    // If history is provided, use it
    if (providedHistory && providedHistory.length > 0) {
      return providedHistory.map(h => ({
        id: uuidv4(),
        role: h.role,
        content: h.content,
        timestamp: new Date()
      }));
    }

    // Otherwise, try to get from cache
    const cached = await cacheService.get<ChatMessage[]>(
      conversationCacheKey(userId, conversationId)
    );

    return cached || [];
  }

  private async saveConversationHistory(
    userId: string,
    conversationId: string,
    history: ChatMessage[]
  ): Promise<void> {
    const maxHistory = configService.get('assistant.conversation.maxHistory', 20);
    const ttl = configService.get('assistant.cache.conversationTtlSeconds', 3600);

    // Keep only the last N messages
    const trimmedHistory = history.slice(-maxHistory);

    await cacheService.set(
      conversationCacheKey(userId, conversationId),
      trimmedHistory,
      { ttl }
    );
  }

  private async getConversation(params: AssistantParams): Promise<AgentResult<AssistantResult>> {
    const { userId, conversationId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!conversationId) return { success: false, error: 'Conversation ID is required' };

    const messages = await cacheService.get<ChatMessage[]>(
      conversationCacheKey(userId, conversationId)
    );

    return {
      success: true,
      data: { messages: messages || [], conversationId }
    };
  }

  private async clearConversation(params: AssistantParams): Promise<AgentResult<AssistantResult>> {
    const { userId, conversationId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!conversationId) return { success: false, error: 'Conversation ID is required' };

    await cacheService.delete(conversationCacheKey(userId, conversationId));

    this.emitLog('🗑️ Conversation cleared', 'info');

    return { success: true };
  }

  // ===========================================================================
  // CAPABILITIES
  // ===========================================================================

  private async getCapabilities(): Promise<AgentResult<AssistantResult>> {
    try {
      const capabilities = agentOrchestratorService.getAvailableAgents();
      return {
        success: true,
        data: { capabilities }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const assistantAgent = new AssistantAgent();
export default assistantAgent;
