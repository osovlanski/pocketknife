/**
 * Shared Anthropic Client Utility
 * 
 * Centralizes Anthropic API client initialization to avoid duplication
 * across multiple services.
 */

import Anthropic from '@anthropic-ai/sdk';

let anthropicInstance: Anthropic | null = null;

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

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
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

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
export const parseClaudeJSON = <T>(responseText: string): T => {
  const cleanText = responseText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleanText);
};

export default {
  getAnthropicClient,
  isAnthropicConfigured,
  generateClaudeMessage,
  parseClaudeJSON
};

