/**
 * Assistant API Service
 * 
 * API client for the AI Assistant agent.
 * Includes caching, abort controllers, and conversation history.
 */

import axios, { CancelTokenSource } from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with dynamic auth
const assistantAxios = axios.create({ baseURL: API_BASE_URL });
assistantAxios.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// ABORT CONTROLLER
// =============================================================================

let currentCancelToken: CancelTokenSource | null = null;

export const createCancelToken = (): CancelTokenSource => {
  // Cancel any existing request
  if (currentCancelToken) {
    currentCancelToken.cancel('New request started');
  }
  currentCancelToken = axios.CancelToken.source();
  return currentCancelToken;
};

export const cancelCurrentRequest = (): void => {
  if (currentCancelToken) {
    currentCancelToken.cancel('Request cancelled by user');
    currentCancelToken = null;
  }
};

export const isRequestCancelled = (error: any): boolean => {
  return axios.isCancel(error);
};

// =============================================================================
// CONVERSATION HISTORY CACHE (localStorage)
// =============================================================================

const HISTORY_STORAGE_KEY = 'pocketknife_chat_history';
const MAX_SAVED_CONVERSATIONS = 20;

export interface SavedConversation {
  id: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export const getSavedConversations = (): SavedConversation[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveConversation = (conversation: SavedConversation): void => {
  try {
    const conversations = getSavedConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }
    
    // Keep only the last N conversations
    const trimmed = conversations.slice(0, MAX_SAVED_CONVERSATIONS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save conversation', error);
  }
};

export const deleteConversation = (conversationId: string): void => {
  try {
    const conversations = getSavedConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete conversation', error);
  }
};

export const clearAllConversations = (): void => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear conversations', error);
  }
};

// Generate title from first message
export const generateConversationTitle = (firstMessage: string): string => {
  const maxLength = 40;
  const cleaned = firstMessage.replace(/\n/g, ' ').trim();
  return cleaned.length > maxLength 
    ? cleaned.substring(0, maxLength) + '...' 
    : cleaned;
};

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  workflowSteps?: WorkflowStep[];
  sources?: string[];
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  action: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  error?: string;
}

export interface AgentCapability {
  action: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: string | number | boolean;
  }[];
  examples?: string[];
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: AgentCapability[];
  keywords: string[];
  isAvailable: boolean;
}

export interface AssistantResponse {
  response: string;
  conversationId: string;
  workflowSteps?: WorkflowStep[];
  suggestions?: string[];
  sources?: string[];
}

// Thinking step for real-time status updates
export interface ThinkingStep {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  label: string;
  detail?: string;
  timestamp: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Send a chat message to the assistant
 * Supports cancellation via cancel token
 */
export const sendMessage = async (
  message: string,
  conversationId?: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
  cancelToken?: CancelTokenSource
): Promise<AssistantResponse> => {
  const token = cancelToken || createCancelToken();
  
  const response = await assistantAxios.post('/agents/assistant/execute', {
    action: 'chat',
    message,
    conversationId,
    history
  }, {
    cancelToken: token.token,
    timeout: 120000 // 2 minute timeout
  });
  
  return response.data.data || response.data;
};

/**
 * Get available agent capabilities
 */
export const getCapabilities = async (): Promise<{ capabilities: AgentInfo[] }> => {
  const response = await assistantAxios.post('/agents/assistant/execute', {
    action: 'get-capabilities'
  });
  return response.data.data || response.data;
};

/**
 * Get conversation history
 */
export const getConversation = async (
  conversationId: string
): Promise<{ messages: ChatMessage[]; conversationId: string }> => {
  const response = await assistantAxios.post('/agents/assistant/execute', {
    action: 'get-conversation',
    conversationId
  });
  return response.data.data || response.data;
};

/**
 * Clear conversation history
 */
export const clearConversation = async (conversationId: string): Promise<void> => {
  await assistantAxios.post('/agents/assistant/execute', {
    action: 'clear-conversation',
    conversationId
  });
};

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

export const SUGGESTED_PROMPTS = [
  {
    category: 'Cooking',
    icon: '🍳',
    prompts: [
      'What recipes can I make with ingredients I have?',
      'Find me a quick pasta recipe',
      'Add milk and eggs to my shopping list'
    ]
  },
  {
    category: 'Tasks',
    icon: '✅',
    prompts: [
      'What tasks do I have for today?',
      'Add a reminder to call the dentist',
      'Show my upcoming deadlines'
    ]
  },
  {
    category: 'Jobs',
    icon: '💼',
    prompts: [
      'Find remote software engineering jobs',
      'Show my saved jobs',
      'Help me prepare for an interview'
    ]
  },
  {
    category: 'Travel',
    icon: '✈️',
    prompts: [
      'Find flights to Barcelona next month',
      'Plan a 5-day trip to Rome',
      'What are the best places to visit in Tokyo?'
    ]
  },
  {
    category: 'Shopping',
    icon: '🛍️',
    prompts: [
      'Find deals on headphones',
      'Show my saved deals',
      'Search for a laptop under $1000'
    ]
  },
  {
    category: 'Learning',
    icon: '📚',
    prompts: [
      'Find React tutorials for beginners',
      'Show trending tech articles',
      'Recommend machine learning courses'
    ]
  }
];
