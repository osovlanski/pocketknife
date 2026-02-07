/**
 * Enhanced Assistant Service
 *
 * AI-powered assistant with:
 * - Native Claude tool calling
 * - Response streaming via Socket.io
 * - Parallel agent execution
 * - Plan preview mode
 * - Conversation memory
 * - Image upload support
 */

import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';
import { Server as SocketServer } from 'socket.io';
import {
  getAnthropicClient,
  streamWithToolLoop,
  analyzeImage,
  extractText,
  type ToolCallResult
} from '../../utils/anthropicClient';
import { createAgentTools, executeTool, executeToolsParallel } from './toolCallingService';
import { AGENT_TYPE_CLASSIFICATION } from './agentOrchestratorService';
import { buildComponentKBPrompt } from './componentRegistry';
import type { StructuredCard, CardGroupRenderHints } from './structuredCards';
import { extractStructuredDataFromToolCalls, buildRenderHints } from './structuredCards';
import { conversationMemoryService } from './conversationMemoryService';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import logger from '../../utils/logger';
import {
  parseExecutionPlan,
  sanitizeUserInput,
  validateImageData
} from './schemas';
import {
  withTimeout,
  withConcurrencyLimit
} from '../../utils/resilience';
import { conversationHistoryManager } from '../../utils/messageBuffer';

// =============================================================================
// CONCURRENCY PROTECTION
// =============================================================================

/**
 * Simple mutex implementation for plan execution
 * Prevents race conditions when multiple plan executions happen concurrently
 */
class PlanExecutionLock {
  private locks: Map<string, { promise: Promise<void>; resolve: () => void }> = new Map();

  /**
   * Acquire a lock for a specific plan
   */
  async acquire(planId: string): Promise<void> {
    // Wait for any existing lock to be released
    const existing = this.locks.get(planId);
    if (existing) {
      await existing.promise;
    }

    // Create new lock
    let resolveFunction: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveFunction = resolve;
    });
    this.locks.set(planId, { promise, resolve: resolveFunction! });
  }

  /**
   * Release the lock for a specific plan
   */
  release(planId: string): void {
    const lock = this.locks.get(planId);
    if (lock) {
      lock.resolve();
      this.locks.delete(planId);
    }
  }

  /**
   * Check if a plan is currently locked
   */
  isLocked(planId: string): boolean {
    return this.locks.has(planId);
  }
}

const planExecutionLock = new PlanExecutionLock();

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[];
  toolCalls?: ToolCallResult[];
  sources?: string[];
}

export interface ExecutionPlan {
  id: string;
  steps: PlanStep[];
  explanation: string;
  requiresApproval: boolean;
  estimatedActions: number;
}

export interface PlanStep {
  id: string;
  tool: string;
  description: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall: (toolCall: ToolCallResult) => void;
  onToolResult: (toolName: string, result: unknown) => void;
  onPlanPreview?: (plan: ExecutionPlan) => void;
  onComplete: (response: AssistantResponse) => void;
  onError: (error: Error) => void;
}

export interface AssistantResponse {
  message: string;
  toolCalls: ToolCallResult[];
  sources: string[];
  suggestions: string[];
  plan?: ExecutionPlan;
  structuredData?: StructuredCard[];
  renderHints?: CardGroupRenderHints;
}

export interface AssistantOptions {
  userId: string;
  conversationId: string;
  enableStreaming?: boolean;
  enablePlanPreview?: boolean;
  maxToolIterations?: number;
  systemPrompt?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are Pocketknife AI, a helpful assistant with access to multiple productivity tools.

You can help users with:
- **Cooking**: Find recipes, manage kitchen inventory, order groceries from Rami Levy
- **Jobs**: Search for jobs, get company info, prepare for interviews
- **Travel**: Search flights and hotels, plan trips, check weather
- **Tasks**: Manage todos, create tasks, view agenda
- **Shopping**: Find deals, compare prices
- **Learning**: Search tutorials, get topic summaries
- **Problems**: Practice coding problems, get code reviews
- **Email**: Process and categorize emails
- **News**: Get personalized news feeds
- **DIY**: Generate project ideas with instructions

Guidelines:
- Use the available tools to help users accomplish their goals
- Be concise but helpful in your responses
- If you're unsure what the user wants, ask for clarification
- When displaying data from tools, format it nicely for the user
- Remember context from the conversation to provide relevant help
- If a task requires multiple steps, explain what you're doing
- For simple lookups (tasks, emails, saved items), use a single tool call and respond directly
- Reserve multi-step reasoning for complex queries (recipes, travel planning, job searches)
- Use the agent_cross_call tool to chain actions across agents (e.g., find a recipe then order its ingredients, or search jobs then create a follow-up task)

${buildComponentKBPrompt()}`;

// =============================================================================
// SERVICE
// =============================================================================

class EnhancedAssistantService {
  private io: SocketServer | null = null;
  private tools: Tool[] = [];
  private readonly model: string;

  constructor() {
    this.model = configService.get('ai.claude.defaultModel', 'claude-sonnet-4-20250514');
    this.tools = createAgentTools();
  }

  /**
   * Set Socket.io server for streaming
   */
  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  /**
   * Process a chat message with streaming support
   */
  async chat(
    message: string,
    conversationHistory: ChatMessage[],
    options: AssistantOptions,
    callbacks?: StreamCallbacks
  ): Promise<AssistantResponse> {
    const { userId, conversationId, enablePlanPreview = false } = options;

    // Sanitize user input to prevent prompt injection
    const sanitizedMessage = sanitizeUserInput(message);

    logger.agent('Processing chat message', {
      userId,
      conversationId,
      messageLength: sanitizedMessage.length,
      historyLength: conversationHistory.length
    });

    // Get memory context
    const memoryContext = await conversationMemoryService.getMemoryContext(userId);

    // Build system prompt with memory
    const systemPrompt = this.buildSystemPrompt(options.systemPrompt, memoryContext);

    // Convert conversation history to Claude format
    const messages = this.buildMessages(conversationHistory, sanitizedMessage);

    // If plan preview is enabled and this looks like a complex request
    if (enablePlanPreview && this.shouldPreviewPlan(sanitizedMessage)) {
      const plan = await this.generatePlan(sanitizedMessage, userId);
      if (plan.requiresApproval) {
        callbacks?.onPlanPreview?.(plan);
        return {
          message: `I've created a plan to help you. Please review and approve it before I proceed.`,
          toolCalls: [],
          sources: [],
          suggestions: ['Approve plan', 'Modify plan', 'Cancel'],
          plan
        };
      }
    }

    // Determine dynamic iteration limit based on message complexity
    const maxIterations = this.getMaxIterationsForMessage(sanitizedMessage);

    // Execute with streaming if callbacks provided
    if (callbacks) {
      return this.streamChat(messages, systemPrompt, userId, callbacks, maxIterations);
    }

    // Non-streaming execution
    return this.executeChat(messages, systemPrompt, userId, maxIterations);
  }

  /**
   * Stream chat response with tool execution
   */
  private async streamChat(
    messages: MessageParam[],
    systemPrompt: string,
    userId: string,
    callbacks: StreamCallbacks,
    maxIterations?: number
  ): Promise<AssistantResponse> {
    const allToolCalls: ToolCallResult[] = [];
    const sources: string[] = [];
    const streamToolResults: Map<string, { success: boolean; data?: unknown }> = new Map();
    let fullText = '';

    try {
      const result = await streamWithToolLoop(
        messages,
        this.tools,
        async (toolCall) => {
          // Execute tool and return result
          const result = await executeTool(toolCall.name, toolCall.input, userId);
          streamToolResults.set(toolCall.name, result);
          if (result.success) {
            sources.push(toolCall.name.replace('_', ' '));
          }
          return result;
        },
        {
          onToken: callbacks.onToken,
          onToolCall: (toolCall) => {
            allToolCalls.push(toolCall);
            callbacks.onToolCall(toolCall);
          },
          onToolResult: callbacks.onToolResult,
          onError: callbacks.onError
        },
        {
          model: this.model,
          maxTokens: configService.get('assistant.ai.maxTokens', 4000),
          systemPrompt,
          maxIterations: maxIterations ?? configService.get('assistant.workflow.maxIterations', 5)
        }
      );

      fullText = result.fullText;

      const structuredCards = extractStructuredDataFromToolCalls(streamToolResults);
      const hints = structuredCards.length > 0 ? buildRenderHints(structuredCards) : undefined;
      const response: AssistantResponse = {
        message: fullText,
        toolCalls: allToolCalls,
        sources: [...new Set(sources)],
        suggestions: this.generateSuggestions(allToolCalls),
        structuredData: structuredCards.length > 0 ? structuredCards : undefined,
        renderHints: hints
      };

      callbacks.onComplete(response);
      return response;
    } catch (error: unknown) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute chat without streaming
   */
  private async executeChat(
    messages: MessageParam[],
    systemPrompt: string,
    userId: string,
    dynamicMaxIterations?: number
  ): Promise<AssistantResponse> {
    const client = getAnthropicClient();
    const allToolCalls: ToolCallResult[] = [];
    const sources: string[] = [];
    const allToolResults: Map<string, { success: boolean; data?: unknown }> = new Map();

    let currentMessages = [...messages];
    let iterations = 0;
    const maxIterations = dynamicMaxIterations ?? configService.get('assistant.workflow.maxIterations', 5);

    while (iterations < maxIterations) {
      iterations++;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: configService.get('assistant.ai.maxTokens', 4000),
        system: systemPrompt,
        messages: currentMessages,
        tools: this.tools
      });

      // Check for tool calls
      const toolCalls = response.content
        .filter((block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
          block.type === 'tool_use'
        )
        .map(block => ({
          tool_use_id: block.id,
          name: block.name,
          input: block.input
        }));

      if (toolCalls.length === 0) {
        // No more tool calls, return the response
        const text = extractText(response.content);
        const structuredData = extractStructuredDataFromToolCalls(allToolResults);
        const hints = structuredData.length > 0 ? buildRenderHints(structuredData) : undefined;
        return {
          message: text,
          toolCalls: allToolCalls,
          sources: [...new Set(sources)],
          suggestions: this.generateSuggestions(allToolCalls),
          structuredData: structuredData.length > 0 ? structuredData : undefined,
          renderHints: hints
        };
      }

      // Execute tools in parallel
      const toolResults = await executeToolsParallel(
        toolCalls.map(tc => ({ name: tc.name, input: tc.input })),
        userId
      );

      // Record tool calls, sources, and accumulate results for structured data
      for (const toolCall of toolCalls) {
        allToolCalls.push(toolCall);
        const result = toolResults.get(toolCall.name);
        if (result) {
          allToolResults.set(toolCall.name, result);
        }
        if (result?.success) {
          sources.push(toolCall.name.replace('_', ' '));
        }
      }

      // Add to conversation
      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant' as const,
          content: toolCalls.map(tc => ({
            type: 'tool_use' as const,
            id: tc.tool_use_id,
            name: tc.name,
            input: tc.input
          }))
        },
        {
          role: 'user' as const,
          content: toolCalls.map(tc => ({
            type: 'tool_result' as const,
            tool_use_id: tc.tool_use_id,
            content: JSON.stringify(toolResults.get(tc.name) || { error: 'Tool not found' })
          }))
        }
      ];
    }

    // Max iterations reached
    const structuredData = extractStructuredDataFromToolCalls(allToolResults);
    const hints = structuredData.length > 0 ? buildRenderHints(structuredData) : undefined;
    return {
      message: 'I reached the maximum number of actions. Here\'s what I accomplished so far.',
      toolCalls: allToolCalls,
      sources: [...new Set(sources)],
      suggestions: ['Continue', 'Start over'],
      structuredData: structuredData.length > 0 ? structuredData : undefined,
      renderHints: hints
    };
  }

  /**
   * Process a message with an image
   */
  async chatWithImage(
    message: string,
    imageData: string,
    conversationHistory: ChatMessage[],
    options: AssistantOptions
  ): Promise<AssistantResponse> {
    const { userId } = options;

    logger.agent('Processing chat with image', { userId });

    // Validate image data
    const imageValidation = validateImageData(imageData, 10);
    if (!imageValidation.valid) {
      logger.warn('Image validation failed', { error: imageValidation.error });
      return {
        message: imageValidation.error || 'Image validation failed',
        toolCalls: [],
        sources: [],
        suggestions: ['Try a smaller image', 'Use a different format']
      };
    }

    // Sanitize user message
    const sanitizedMessage = sanitizeUserInput(message);

    try {
      // Analyze the image first
      const imageAnalysis = await analyzeImage(
        imageData,
        `Analyze this image and describe what you see. ${sanitizedMessage}`,
        { maxTokens: 1000 }
      );

      // Add image analysis to the message
      const enhancedMessage = `[User shared an image]\n\nImage Analysis: ${imageAnalysis}\n\nUser's message: ${sanitizedMessage}`;

      // Continue with normal chat flow
      return this.chat(enhancedMessage, conversationHistory, options);
    } catch (error: unknown) {
      logger.fail('Image analysis failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        message: 'I had trouble analyzing the image. Could you describe what you\'re showing me?',
        toolCalls: [],
        sources: [],
        suggestions: ['Try again', 'Describe the image']
      };
    }
  }

  /**
   * Generate an execution plan for complex requests
   */
  async generatePlan(
    message: string,
    userId: string
  ): Promise<ExecutionPlan> {
    const client = getAnthropicClient();

    const prompt = `Analyze this user request and create an execution plan:

Request: "${message}"

Create a plan with specific tool calls needed to fulfill this request.
Consider which tools to use and in what order.

Respond with JSON:
{
  "steps": [
    { "tool": "tool_name", "description": "What this step does", "params": {} }
  ],
  "explanation": "Brief explanation of the plan",
  "requiresApproval": true/false (true if involves sensitive actions like ordering, payments, etc.)
}`;

    const response = await client.messages.create({
      model: this.model,
      max_tokens: configService.get('assistant.ai.planningMaxTokens', 1000),
      messages: [{ role: 'user', content: prompt }]
    });

    const text = extractText(response.content);

    // Use Zod schema validation for safe parsing
    const parsed = parseExecutionPlan(text || '');

    return {
      id: `plan-${Date.now()}`,
      steps: parsed.steps.map((step, index) => ({
        id: `step-${index}`,
        tool: step.tool,
        description: step.description,
        params: step.params,
        status: 'pending' as const
      })),
      explanation: parsed.explanation,
      requiresApproval: parsed.requiresApproval,
      estimatedActions: parsed.steps.length
    };
  }

  /**
   * Execute an approved plan
   * Uses mutex to prevent concurrent modifications to the same plan
   */
  async executePlan(
    plan: ExecutionPlan,
    userId: string,
    callbacks?: StreamCallbacks
  ): Promise<AssistantResponse> {
    // Check if plan is already being executed
    if (planExecutionLock.isLocked(plan.id)) {
      const errorMessage = 'Plan is already being executed';
      callbacks?.onError?.(new Error(errorMessage));
      return {
        message: errorMessage,
        toolCalls: [],
        sources: [],
        suggestions: []
      };
    }

    // Acquire lock for this plan
    await planExecutionLock.acquire(plan.id);

    try {
      const results: ToolCallResult[] = [];
      const sources: string[] = [];
      const toolTimeoutMs = configService.get('assistant.tools.timeoutMs', 30000);

      for (const step of plan.steps) {
        step.status = 'running';
        callbacks?.onToolCall?.({
          tool_use_id: step.id,
          name: step.tool,
          input: step.params
        });

        try {
          // Execute with timeout to prevent blocking on slow tools
          const result = await withTimeout(
            () => executeTool(step.tool, step.params, userId),
            toolTimeoutMs,
            `Tool '${step.tool}' timed out after ${toolTimeoutMs}ms`
          );

          step.status = result.success ? 'completed' : 'failed';
          step.result = result.data;
          step.error = result.error;

          if (result.success) {
            sources.push(step.tool.replace('_', ' '));
          }

          callbacks?.onToolResult?.(step.tool, result);
          results.push({
            tool_use_id: step.id,
            name: step.tool,
            input: step.params
          });
        } catch (error: unknown) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : 'Unknown error';
          logger.warn('Plan step execution failed', {
            stepId: step.id,
            tool: step.tool,
            error: step.error
          });
        }
      }

      // Generate summary
      const completedSteps = plan.steps.filter(s => s.status === 'completed');
      const failedSteps = plan.steps.filter(s => s.status === 'failed');

      let message = `Plan executed. ${completedSteps.length}/${plan.steps.length} steps completed.`;
      if (failedSteps.length > 0) {
        message += ` ${failedSteps.length} steps failed.`;
      }

      const response: AssistantResponse = {
        message,
        toolCalls: results,
        sources: [...new Set(sources)],
        suggestions: this.generateSuggestions(results),
        plan
      };

      callbacks?.onComplete?.(response);
      return response;
    } finally {
      // Always release the lock
      planExecutionLock.release(plan.id);
    }
  }

  /**
   * Store conversation in memory
   */
  async storeConversation(
    userId: string,
    conversationId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    await conversationMemoryService.storeMemory(
      userId,
      conversationId,
      messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp
      }))
    );
  }

  /**
   * Emit a streaming event via Socket.io
   */
  emitStreamEvent(
    userId: string,
    event: string,
    data: unknown
  ): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Determine max tool iterations based on message content.
   * Simple-agent-targeting messages get fewer iterations to save tokens.
   */
  private getMaxIterationsForMessage(message: string): number {
    const defaultMax = configService.get('assistant.workflow.maxIterations', 5);
    const lowerMessage = message.toLowerCase();

    // Keywords that signal simple, single-step lookups
    const simpleSignals = ['show my', 'list my', 'get my', 'check my', 'what tasks', 'my emails', 'my todos'];
    const isSimple = simpleSignals.some(signal => lowerMessage.includes(signal));

    // Keywords that signal deep, multi-step reasoning
    const deepSignals = ['recipe', 'cook', 'plan', 'travel', 'flight', 'search for', 'find me', 'order', 'compare'];
    const isDeep = deepSignals.some(signal => lowerMessage.includes(signal));

    if (isSimple && !isDeep) {
      return Math.min(2, defaultMax);
    }

    return defaultMax;
  }

  private buildSystemPrompt(customPrompt?: string, memoryContext?: string): string {
    let prompt = customPrompt || DEFAULT_SYSTEM_PROMPT;

    if (memoryContext) {
      prompt += `\n\n${memoryContext}`;
    }

    return prompt;
  }

  private buildMessages(history: ChatMessage[], currentMessage: string): MessageParam[] {
    const messages: MessageParam[] = [];
    const maxHistory = configService.get('assistant.conversation.maxHistory', 20);

    // Add conversation history (limited to prevent context overflow)
    for (const msg of history.slice(-maxHistory)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  private shouldPreviewPlan(message: string): boolean {
    const complexKeywords = configService.get(
      'assistant.planPreview.keywords',
      ['order', 'buy', 'purchase', 'delete', 'remove', 'book', 'schedule', 'cancel', 'send', 'transfer', 'pay']
    ) as string[];

    const lowerMessage = message.toLowerCase();
    return complexKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private generateSuggestions(toolCalls: ToolCallResult[]): string[] {
    const suggestions: string[] = [];

    for (const call of toolCalls) {
      if (call.name.includes('cooking') || call.name.includes('recipe')) {
        suggestions.push('Save this recipe');
        suggestions.push('Order ingredients');
      }
      if (call.name.includes('jobs')) {
        suggestions.push('Save interesting jobs');
        suggestions.push('Prepare for interview');
      }
      if (call.name.includes('travel')) {
        suggestions.push('Create itinerary');
        suggestions.push('Check weather');
      }
      if (call.name.includes('todo') || call.name.includes('task')) {
        suggestions.push('Set reminder');
        suggestions.push('View agenda');
      }
    }

    // Deduplicate and limit
    return [...new Set(suggestions)].slice(0, 4);
  }
}

export const enhancedAssistantService = new EnhancedAssistantService();
export default enhancedAssistantService;
