/**
 * useAssistant Hook
 * 
 * Custom hook for managing AI Assistant state and logic.
 * Features:
 * - Chat messages with real-time updates
 * - Thinking steps visualization
 * - Conversation history persistence
 * - Stop/cancel functionality
 * - Caching for performance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import * as assistantApi from '../services/assistantApi';
import { SOCKET_URL } from '../config';
import logger from '../services/logger';
import type {
  ChatMessage,
  WorkflowStep,
  AgentInfo,
  ThinkingStep,
  SavedConversation,
  ExecutionPlan,
  ToolCallInfo
} from '../services/assistantApi';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAssistantReturn {
  // State
  messages: ChatMessage[];
  isProcessing: boolean;
  conversationId: string | null;
  capabilities: AgentInfo[];
  currentWorkflow: WorkflowStep[];
  thinkingSteps: ThinkingStep[];
  error: string | null;
  savedConversations: SavedConversation[];
  currentPlan: ExecutionPlan | null;
  isStreaming: boolean;
  activeToolCalls: ToolCallInfo[];

  // Actions
  sendMessage: (message: string, enablePlanPreview?: boolean) => Promise<void>;
  sendMessageWithImage: (message: string, imageBase64: string, imageType?: string) => Promise<void>;
  stopProcessing: () => void;
  clearConversation: () => void;
  startNewChat: () => void;
  loadConversation: (conversation: SavedConversation) => void;
  deleteConversation: (conversationId: string) => void;
  loadCapabilities: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  refreshSavedConversations: () => void;
  approvePlan: () => Promise<void>;
  rejectPlan: () => void;
}

// =============================================================================
// THINKING STEPS FACTORY
// =============================================================================

const createThinkingSteps = (): ThinkingStep[] => [
  { id: 'analyze', status: 'pending', label: 'Analyzing request', timestamp: Date.now() },
  { id: 'plan', status: 'pending', label: 'Planning approach', timestamp: Date.now() },
  { id: 'execute', status: 'pending', label: 'Executing actions', timestamp: Date.now() },
  { id: 'synthesize', status: 'pending', label: 'Synthesizing response', timestamp: Date.now() }
];

// =============================================================================
// HOOK
// =============================================================================

export const useAssistant = (): UseAssistantReturn => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<AgentInfo[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowStep[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const abortRef = useRef<boolean>(false);
  const currentConversationRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentConversationRef.current = conversationId;
  }, [conversationId]);

  // Load saved conversations on mount
  useEffect(() => {
    refreshSavedConversations();
  }, []);

  // Initialize socket connection for real-time updates
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    // Listen for agent logs to update thinking steps
    socketRef.current.on('agent-log', (data: { agentId: string; message: string; type: string }) => {
      if (data.agentId === 'assistant') {
        logger.info(`[Assistant] ${data.message}`);
        
        // Update thinking steps based on log messages
        const messageLower = data.message.toLowerCase();
        
        if (messageLower.includes('analyzing') || messageLower.includes('processing')) {
          updateThinkingStep('analyze', 'active', data.message);
        } else if (messageLower.includes('planning') || messageLower.includes('workflow')) {
          updateThinkingStep('analyze', 'completed');
          updateThinkingStep('plan', 'active', data.message);
        } else if (messageLower.includes('executing') || messageLower.includes('action')) {
          updateThinkingStep('plan', 'completed');
          updateThinkingStep('execute', 'active', data.message);
        } else if (messageLower.includes('response') || messageLower.includes('ready')) {
          updateThinkingStep('execute', 'completed');
          updateThinkingStep('synthesize', 'active', data.message);
        }
      }
    });

    socketRef.current.on('agent-progress', (data: { agentId: string; progress: number }) => {
      if (data.agentId === 'assistant') {
        logger.debug(`[Assistant] Progress: ${data.progress}%`);
      }
    });

    // Enhanced assistant streaming events
    socketRef.current.on('assistant:token', (data: { token: string }) => {
      setStreamingContent(prev => prev + data.token);
    });

    socketRef.current.on('assistant:tool_call', (data: { toolCall: ToolCallInfo }) => {
      setActiveToolCalls(prev => [...prev, data.toolCall]);
      updateThinkingStep('execute', 'active', `Calling ${data.toolCall.name}...`);
    });

    socketRef.current.on('assistant:tool_result', (data: { toolName: string; result: unknown }) => {
      logger.debug(`[Assistant] Tool result: ${data.toolName}`);
    });

    socketRef.current.on('assistant:plan_preview', (data: { plan: ExecutionPlan }) => {
      setCurrentPlan(data.plan);
      setIsProcessing(false);
      updateThinkingStep('plan', 'completed', 'Plan ready for approval');
    });

    socketRef.current.on('assistant:complete', (data: { response: unknown }) => {
      setIsStreaming(false);
      logger.debug('[Assistant] Response complete');
    });

    socketRef.current.on('assistant:error', (data: { error: string }) => {
      setError(data.error);
      setIsStreaming(false);
      setIsProcessing(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Load capabilities on mount (with caching)
  useEffect(() => {
    loadCapabilities();
  }, []);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  const updateThinkingStep = (
    stepId: string, 
    status: ThinkingStep['status'], 
    detail?: string
  ) => {
    setThinkingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, detail, timestamp: Date.now() }
        : step
    ));
  };

  const refreshSavedConversations = useCallback(() => {
    setSavedConversations(assistantApi.getSavedConversations());
  }, []);

  const saveCurrentConversation = useCallback((msgs: ChatMessage[], convId: string) => {
    if (msgs.length < 2) return; // Need at least user + assistant message
    
    const firstUserMessage = msgs.find(m => m.role === 'user');
    if (!firstUserMessage) return;

    const lastMessage = msgs[msgs.length - 1];
    const conversation: SavedConversation = {
      id: convId,
      title: assistantApi.generateConversationTitle(firstUserMessage.content),
      preview: lastMessage.role === 'assistant' 
        ? lastMessage.content.slice(0, 100) 
        : firstUserMessage.content.slice(0, 100),
      messages: msgs,
      createdAt: msgs[0]?.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    assistantApi.saveConversation(conversation);
    refreshSavedConversations();
  }, [refreshSavedConversations]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const loadCapabilities = useCallback(async () => {
    // Check cache first
    const cacheKey = 'assistant_capabilities';
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setCapabilities(data);
          return;
        }
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    try {
      const result = await assistantApi.getCapabilities();
      const caps = result.capabilities || [];
      setCapabilities(caps);
      
      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: caps,
        timestamp: Date.now()
      }));
    } catch (err: any) {
      logger.error('Failed to load capabilities', { error: err.message });
    }
  }, []);

  const sendMessage = useCallback(async (message: string, enablePlanPreview?: boolean) => {
    if (!message.trim() || isProcessing) return;

    setError(null);
    setIsProcessing(true);
    abortRef.current = false;
    
    // Initialize thinking steps
    setThinkingSteps(createThinkingSteps());
    setCurrentWorkflow([]);

    // Generate or use existing conversation ID
    const convId = conversationId || uuidv4();
    if (!conversationId) {
      setConversationId(convId);
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Add a placeholder for assistant response
    const placeholderId = `assistant-${Date.now()}`;
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, placeholderMessage]);

    // Start analyzing step
    updateThinkingStep('analyze', 'active', 'Understanding your request...');

    try {
      // Check if aborted before making request
      if (abortRef.current) {
        throw new Error('Request cancelled');
      }

      // Build history for context (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const cancelToken = assistantApi.createCancelToken();
      
      const response = await assistantApi.sendMessage(
        message,
        convId,
        history,
        cancelToken
      );

      // Check if aborted after request
      if (abortRef.current) {
        throw new Error('Request cancelled');
      }

      // Update workflow steps if present
      if (response.workflowSteps) {
        setCurrentWorkflow(response.workflowSteps);
      }

      // Complete all thinking steps
      setThinkingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));

      // Replace placeholder with actual response
      const finalMessages = updatedMessages.map(m => m).concat([{
        ...placeholderMessage,
        content: response.response,
        workflowSteps: response.workflowSteps,
        sources: response.sources
      }]);
      
      setMessages(prev => prev.map(m => 
        m.id === placeholderId
          ? {
              ...m,
              content: response.response,
              workflowSteps: response.workflowSteps,
              sources: response.sources
            }
          : m
      ));

      // Save conversation to history
      setTimeout(() => {
        saveCurrentConversation(finalMessages, convId);
      }, 100);

    } catch (err: any) {
      if (assistantApi.isRequestCancelled(err) || abortRef.current) {
        logger.info('Request was cancelled');
        // Mark thinking steps as cancelled
        setThinkingSteps(prev => prev.map(step => 
          step.status === 'active' || step.status === 'pending'
            ? { ...step, status: 'failed' as const, detail: 'Cancelled' }
            : step
        ));
        // Remove placeholder
        setMessages(prev => prev.filter(m => m.id !== placeholderId));
      } else {
        logger.error('Failed to send message', { error: err.message });
        setError(err.message || 'Failed to get response');

        // Mark thinking steps as failed
        setThinkingSteps(prev => prev.map(step => 
          step.status === 'active' || step.status === 'pending'
            ? { ...step, status: 'failed' as const }
            : step
        ));

        // Update placeholder with error
        setMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? {
                ...m,
                content: 'Sorry, I encountered an error processing your request. Please try again.'
              }
            : m
        ));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, messages, isProcessing, saveCurrentConversation]);

  const stopProcessing = useCallback(() => {
    abortRef.current = true;
    assistantApi.cancelCurrentRequest();
    setIsProcessing(false);
    
    // Mark current thinking steps as cancelled
    setThinkingSteps(prev => prev.map(step => 
      step.status === 'active' || step.status === 'pending'
        ? { ...step, status: 'failed' as const, detail: 'Stopped' }
        : step
    ));
  }, []);

  const clearConversation = useCallback(() => {
    if (conversationId) {
      try {
        assistantApi.clearConversation(conversationId);
      } catch (err: any) {
        logger.error('Failed to clear conversation on server', { error: err.message });
      }
    }

    setMessages([]);
    setConversationId(null);
    setCurrentWorkflow([]);
    setThinkingSteps([]);
    setError(null);
  }, [conversationId]);

  const startNewChat = useCallback(() => {
    // Save current conversation if it has messages
    if (messages.length > 0 && conversationId) {
      saveCurrentConversation(messages, conversationId);
    }
    
    // Reset state
    setMessages([]);
    setConversationId(null);
    setCurrentWorkflow([]);
    setThinkingSteps([]);
    setError(null);
  }, [messages, conversationId, saveCurrentConversation]);

  const loadConversation = useCallback((conversation: SavedConversation) => {
    setMessages(conversation.messages);
    setConversationId(conversation.id);
    setCurrentWorkflow([]);
    setThinkingSteps([]);
    setError(null);
  }, []);

  const deleteConversationHandler = useCallback((convId: string) => {
    assistantApi.deleteConversation(convId);
    refreshSavedConversations();

    // If deleting current conversation, start new chat
    if (convId === conversationId) {
      startNewChat();
    }
  }, [conversationId, refreshSavedConversations, startNewChat]);

  /**
   * Send a message with an attached image
   */
  const sendMessageWithImage = useCallback(async (
    message: string,
    imageBase64: string,
    imageType?: string
  ) => {
    if (!message.trim() || isProcessing) return;

    setError(null);
    setIsProcessing(true);
    abortRef.current = false;
    setThinkingSteps(createThinkingSteps());

    const convId = conversationId || uuidv4();
    if (!conversationId) {
      setConversationId(convId);
    }

    // Add user message with image indicator
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `[Image attached]\n${message}`,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Add placeholder for assistant response
    const placeholderId = `assistant-${Date.now()}`;
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, placeholderMessage]);

    updateThinkingStep('analyze', 'active', 'Analyzing image...');

    try {
      const history = messages.slice(-10).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp
      }));

      const response = await assistantApi.sendMessageWithImage(
        message,
        imageBase64,
        convId,
        history,
        imageType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      );

      if (abortRef.current) {
        throw new Error('Request cancelled');
      }

      setThinkingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));

      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? {
              ...m,
              content: response.message,
              sources: response.sources
            }
          : m
      ));

      // Save conversation
      const finalMessages = [...updatedMessages, {
        ...placeholderMessage,
        content: response.message,
        sources: response.sources
      }];
      setTimeout(() => saveCurrentConversation(finalMessages, convId), 100);

    } catch (err: any) {
      if (!abortRef.current) {
        setError(err.message || 'Failed to process image');
        setMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { ...m, content: 'Sorry, I had trouble processing the image. Please try again.' }
            : m
        ));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, messages, isProcessing, saveCurrentConversation]);

  /**
   * Approve and execute a pending plan
   */
  const approvePlan = useCallback(async () => {
    if (!currentPlan) return;

    setIsProcessing(true);
    setError(null);
    updateThinkingStep('execute', 'active', 'Executing approved plan...');

    try {
      const response = await assistantApi.executePlan(currentPlan);

      setThinkingSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));

      // Add assistant response with plan results
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentPlan(null);

    } catch (err: any) {
      setError(err.message || 'Failed to execute plan');
      setThinkingSteps(prev => prev.map(step =>
        step.status === 'active' ? { ...step, status: 'failed' as const } : step
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [currentPlan]);

  /**
   * Reject the current pending plan
   */
  const rejectPlan = useCallback(() => {
    setCurrentPlan(null);
    setThinkingSteps([]);

    // Add a message indicating the plan was rejected
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'Plan cancelled. Let me know if you\'d like to try a different approach.',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, assistantMessage]);
  }, []);

  return {
    // State
    messages,
    isProcessing,
    conversationId,
    capabilities,
    currentWorkflow,
    thinkingSteps,
    error,
    savedConversations,
    currentPlan,
    isStreaming,
    activeToolCalls,

    // Actions
    sendMessage,
    sendMessageWithImage,
    stopProcessing,
    clearConversation,
    startNewChat,
    loadConversation,
    deleteConversation: deleteConversationHandler,
    loadCapabilities,
    setMessages,
    refreshSavedConversations,
    approvePlan,
    rejectPlan
  };
};

export default useAssistant;
