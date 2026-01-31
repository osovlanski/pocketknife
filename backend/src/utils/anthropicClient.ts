/**
 * Shared Anthropic Client Utility
 *
 * Centralizes Anthropic API client initialization to avoid duplication
 * across multiple services.
 *
 * Supports:
 * - Standard message generation
 * - Streaming responses
 * - Tool/function calling
 * - Image analysis (multi-modal)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';

let anthropicInstance: Anthropic | null = null;

// =============================================================================
// TYPES
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolCallResult {
  tool_use_id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCallResult) => void;
  onComplete?: (fullText: string, toolCalls: ToolCallResult[]) => void;
  onError?: (error: Error) => void;
}

export interface MessageWithTools {
  content: ContentBlock[];
  stop_reason: string | null;
  toolCalls: ToolCallResult[];
}

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Get or create the Anthropic client instance (singleton)
 */
export const getAnthropicClient = (): Anthropic => {
  if (anthropicInstance) {
    return anthropicInstance;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }

  anthropicInstance = new Anthropic({ apiKey });
  return anthropicInstance;
};

/**
 * Check if Anthropic API key is configured
 */
export const isAnthropicConfigured = (): boolean => {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
};

// =============================================================================
// STANDARD MESSAGE GENERATION
// =============================================================================

/**
 * Generate a message using Claude
 * Wrapper function to simplify common use case
 */
export const generateClaudeMessage = async (
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<string> => {
  const client = getAnthropicClient();
  const { model = 'claude-sonnet-4-20250514', maxTokens = 1500, systemPrompt } = options;

  const messages: MessageParam[] = [
    { role: 'user', content: prompt }
  ];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages
  });

  const firstBlock = response.content[0];
  return firstBlock.type === 'text' ? firstBlock.text : '';
};

// =============================================================================
// TOOL CALLING
// =============================================================================

/**
 * Generate a message with tool calling support
 * Returns both text content and any tool calls made by the model
 */
export const generateWithTools = async (
  messages: MessageParam[],
  tools: Tool[],
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<MessageWithTools> => {
  const client = getAnthropicClient();
  const { model = 'claude-sonnet-4-20250514', maxTokens = 4000, systemPrompt } = options;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools
  });

  // Extract tool calls from response
  const toolCalls: ToolCallResult[] = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map(block => ({
      tool_use_id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>
    }));

  return {
    content: response.content,
    stop_reason: response.stop_reason,
    toolCalls
  };
};

/**
 * Continue a conversation after tool execution
 * Used to send tool results back to Claude
 */
export const continueWithToolResults = async (
  messages: MessageParam[],
  toolResults: ToolResultBlockParam[],
  tools: Tool[],
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<MessageWithTools> => {
  const client = getAnthropicClient();
  const { model = 'claude-sonnet-4-20250514', maxTokens = 4000, systemPrompt } = options;

  // Add tool results as a user message
  const updatedMessages: MessageParam[] = [
    ...messages,
    {
      role: 'user',
      content: toolResults
    }
  ];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: updatedMessages,
    tools
  });

  const toolCalls: ToolCallResult[] = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map(block => ({
      tool_use_id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>
    }));

  return {
    content: response.content,
    stop_reason: response.stop_reason,
    toolCalls
  };
};

// =============================================================================
// STREAMING
// =============================================================================

/**
 * Stream a message response with callbacks
 * Supports both text streaming and tool call detection
 */
export const streamMessage = async (
  messages: MessageParam[],
  callbacks: StreamCallbacks,
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: Tool[];
  } = {}
): Promise<void> => {
  const client = getAnthropicClient();
  const { model = 'claude-sonnet-4-20250514', maxTokens = 4000, systemPrompt, tools } = options;

  let fullText = '';
  const toolCalls: ToolCallResult[] = [];
  let currentToolCall: Partial<ToolCallResult> | null = null;
  let toolInputJson = '';

  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools
    });

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolCall = {
            tool_use_id: event.content_block.id,
            name: event.content_block.name
          };
          toolInputJson = '';
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          const token = event.delta.text;
          fullText += token;
          callbacks.onToken?.(token);
        } else if (event.delta.type === 'input_json_delta') {
          toolInputJson += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall && currentToolCall.name) {
          try {
            currentToolCall.input = JSON.parse(toolInputJson || '{}');
          } catch {
            currentToolCall.input = {};
          }
          const completedToolCall = currentToolCall as ToolCallResult;
          toolCalls.push(completedToolCall);
          callbacks.onToolCall?.(completedToolCall);
          currentToolCall = null;
        }
      }
    }

    callbacks.onComplete?.(fullText, toolCalls);
  } catch (error) {
    callbacks.onError?.(error as Error);
    throw error;
  }
};

/**
 * Stream with tool execution loop
 * Automatically executes tools and continues until complete
 */
export const streamWithToolLoop = async (
  initialMessages: MessageParam[],
  tools: Tool[],
  toolExecutor: (toolCall: ToolCallResult) => Promise<unknown>,
  callbacks: StreamCallbacks & {
    onToolResult?: (toolName: string, result: unknown) => void;
  },
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    maxIterations?: number;
  } = {}
): Promise<{ fullText: string; allToolCalls: ToolCallResult[] }> => {
  const { maxIterations = 10, ...streamOptions } = options;

  let messages = [...initialMessages];
  let fullText = '';
  const allToolCalls: ToolCallResult[] = [];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    let iterationText = '';
    const iterationToolCalls: ToolCallResult[] = [];

    await streamMessage(
      messages,
      {
        onToken: (token) => {
          iterationText += token;
          callbacks.onToken?.(token);
        },
        onToolCall: (toolCall) => {
          iterationToolCalls.push(toolCall);
          allToolCalls.push(toolCall);
          callbacks.onToolCall?.(toolCall);
        },
        onError: callbacks.onError
      },
      { ...streamOptions, tools }
    );

    fullText += iterationText;

    // If no tool calls, we're done
    if (iterationToolCalls.length === 0) {
      break;
    }

    // Execute tools and build results
    const toolResults: ToolResultBlockParam[] = [];

    for (const toolCall of iterationToolCalls) {
      try {
        const result = await toolExecutor(toolCall);
        callbacks.onToolResult?.(toolCall.name, result);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.tool_use_id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      } catch (error: any) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.tool_use_id,
          content: `Error: ${error.message}`,
          is_error: true
        });
      }
    }

    // Add assistant message with tool calls and user message with results
    messages = [
      ...messages,
      {
        role: 'assistant',
        content: iterationToolCalls.map(tc => ({
          type: 'tool_use' as const,
          id: tc.tool_use_id,
          name: tc.name,
          input: tc.input
        }))
      },
      {
        role: 'user',
        content: toolResults
      }
    ];
  }

  callbacks.onComplete?.(fullText, allToolCalls);
  return { fullText, allToolCalls };
};

// =============================================================================
// IMAGE ANALYSIS (MULTI-MODAL)
// =============================================================================

/**
 * Analyze an image using Claude's vision capabilities
 */
export const analyzeImage = async (
  imageData: string | Buffer,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  } = {}
): Promise<string> => {
  const client = getAnthropicClient();
  const { model = 'claude-sonnet-4-20250514', maxTokens = 2000, mediaType = 'image/jpeg' } = options;

  // Convert Buffer to base64 if needed
  const base64Data = Buffer.isBuffer(imageData)
    ? imageData.toString('base64')
    : imageData;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  });

  const firstBlock = response.content[0];
  return firstBlock.type === 'text' ? firstBlock.text : '';
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
export const parseClaudeJSON = <T>(responseText: string): T => {
  const cleanText = responseText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleanText);
};

/**
 * Convert a tool definition to Anthropic's Tool format
 */
export const createTool = (definition: ToolDefinition): Tool => {
  return {
    name: definition.name,
    description: definition.description,
    input_schema: definition.input_schema
  };
};

/**
 * Extract text content from a message response
 */
export const extractText = (content: ContentBlock[]): string => {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');
};

export default {
  getAnthropicClient,
  isAnthropicConfigured,
  generateClaudeMessage,
  generateWithTools,
  continueWithToolResults,
  streamMessage,
  streamWithToolLoop,
  analyzeImage,
  parseClaudeJSON,
  createTool,
  extractText
};









