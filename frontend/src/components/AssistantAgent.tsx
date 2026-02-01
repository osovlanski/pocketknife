/**
 * AssistantAgent Component
 * 
 * AI-powered chat interface that can orchestrate actions across all agents.
 * Features:
 * - Conversation history sidebar
 * - Thinking steps visualization
 * - Stop processing button
 * - New chat button
 * - Rich markdown rendering
 * - Copy, regenerate, edit messages
 * - Message feedback (thumbs up/down)
 * - Auto-resize textarea
 * - Follow-up suggestions
 * - Keyboard shortcuts
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Sparkles,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Globe,
  Cpu,
  Database,
  Square,
  Plus,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp,
  Brain,
  Lightbulb,
  Search,
  FileText,
  X,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Command,
  CornerDownLeft,
  Image,
  AlertTriangle,
  Play,
  XOctagon
} from 'lucide-react';
import AgentPageLayout from './common/AgentPageLayout';
import VoiceInputButton from './common/VoiceInputButton';
import MarkdownContent from './common/MarkdownContent';
import { findAgentById, type AgentTagConfig } from './common/AgentTags';
import useAssistant from '../hooks/useAssistant';
import { useTranslation } from '../i18n';
import { SUGGESTED_PROMPTS, type SavedConversation, type ThinkingStep, type ExecutionPlan, type PlanStep } from '../services/assistantApi';
import type { ChatMessage, WorkflowStep } from '../services/assistantApi';
import styles from '../styles/assistant.module.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_INPUT_LENGTH = 4000;

const FOLLOW_UP_SUGGESTIONS = [
  'Tell me more about this',
  'Can you explain that differently?',
  'What are the alternatives?',
  'How can I get started?',
  'Give me an example'
];

// =============================================================================
// THINKING STEPS COMPONENT
// =============================================================================

interface ThinkingPanelProps {
  steps: ThinkingStep[];
  isProcessing: boolean;
  onStop: () => void;
}

const ThinkingPanel: React.FC<ThinkingPanelProps> = ({ steps, isProcessing, onStop }) => {
  if (steps.length === 0 && !isProcessing) return null;

  const getStepIcon = (step: ThinkingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.thinkingStepCompleted} />;
      case 'active':
        return <Loader2 size={14} className={`${styles.thinkingStepActive} animate-spin`} />;
      case 'failed':
        return <XCircle size={14} className={styles.thinkingStepFailed} />;
      default:
        return <Clock size={14} className={styles.thinkingStepPending} />;
    }
  };

  const getStepEmoji = (stepId: string) => {
    switch (stepId) {
      case 'analyze': return <Brain size={12} />;
      case 'plan': return <Lightbulb size={12} />;
      case 'execute': return <Search size={12} />;
      case 'synthesize': return <FileText size={12} />;
      default: return <Zap size={12} />;
    }
  };

  return (
    <div className={styles.thinkingPanel}>
      <div className={styles.thinkingHeader}>
        <div className={styles.thinkingTitle}>
          <Brain size={16} />
          <span>Thinking...</span>
        </div>
        {isProcessing && (
          <button
            className={styles.stopButton}
            onClick={onStop}
            aria-label="Stop processing"
          >
            <Square size={12} />
            Stop
          </button>
        )}
      </div>
      <div className={styles.thinkingSteps}>
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`${styles.thinkingStep} ${styles[`thinking${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}
          >
            <span className={styles.thinkingStepIcon}>{getStepEmoji(step.id)}</span>
            <span className={styles.thinkingStepLabel}>{step.label}</span>
            {getStepIcon(step)}
            {step.detail && step.status === 'active' && (
              <span className={styles.thinkingStepDetail}>{step.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CONVERSATION HISTORY SIDEBAR
// =============================================================================

interface HistorySidebarProps {
  conversations: SavedConversation[];
  currentConversationId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (conversation: SavedConversation) => void;
  onDelete: (conversationId: string) => void;
  onNewChat: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  conversations,
  currentConversationId,
  isOpen,
  onToggle,
  onSelect,
  onDelete,
  onNewChat
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`${styles.historySidebar} ${isOpen ? styles.historySidebarOpen : ''}`}>
      <div className={styles.historyHeader}>
        <button
          className={styles.historyToggle}
          onClick={onToggle}
          aria-label={isOpen ? 'Close history' : 'Open history'}
        >
          <History size={18} />
          {isOpen && <span>History</span>}
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        {isOpen && (
          <button
            className={styles.newChatButton}
            onClick={onNewChat}
            aria-label="Start new chat"
          >
            <Plus size={16} />
            New Chat
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className={styles.historyList}>
          {conversations.length === 0 ? (
            <div className={styles.historyEmpty}>
              <MessageSquare size={24} />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`${styles.historyItem} ${conv.id === currentConversationId ? styles.historyItemActive : ''}`}
                onClick={() => onSelect(conv)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(conv)}
              >
                <div className={styles.historyItemContent}>
                  <span className={styles.historyItemTitle}>{conv.title}</span>
                  <span className={styles.historyItemDate}>{formatDate(conv.updatedAt)}</span>
                </div>
                <button
                  className={styles.historyItemDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  aria-label="Delete conversation"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MESSAGE ACTIONS MENU
// =============================================================================

interface MessageActionsProps {
  message: ChatMessage;
  onCopy: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onFeedback?: (positive: boolean) => void;
  copied: boolean;
  feedbackGiven?: 'positive' | 'negative' | null;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  onCopy,
  onRegenerate,
  onEdit,
  onFeedback,
  copied,
  feedbackGiven
}) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={styles.messageActions}>
      <button
        className={styles.actionButton}
        onClick={onCopy}
        title="Copy message"
        aria-label="Copy message"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      
      {isUser && onEdit && (
        <button
          className={styles.actionButton}
          onClick={onEdit}
          title="Edit message"
          aria-label="Edit message"
        >
          <Pencil size={14} />
        </button>
      )}
      
      {!isUser && onRegenerate && (
        <button
          className={styles.actionButton}
          onClick={onRegenerate}
          title="Regenerate response"
          aria-label="Regenerate response"
        >
          <RefreshCw size={14} />
        </button>
      )}
      
      {!isUser && onFeedback && (
        <>
          <button
            className={`${styles.actionButton} ${feedbackGiven === 'positive' ? styles.feedbackActive : ''}`}
            onClick={() => onFeedback(true)}
            title="Good response"
            aria-label="Good response"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            className={`${styles.actionButton} ${feedbackGiven === 'negative' ? styles.feedbackActiveNeg : ''}`}
            onClick={() => onFeedback(false)}
            title="Poor response"
            aria-label="Poor response"
          >
            <ThumbsDown size={14} />
          </button>
        </>
      )}
    </div>
  );
};

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  onTagClick?: (tag: AgentTagConfig) => void;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLast, 
  onTagClick,
  onRegenerate,
  onEdit
}) => {
  const isUser = message.role === 'user';
  const isLoading = message.role === 'assistant' && !message.content && isLast;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  // Get agent tag from workflow if present
  const agentTagFromWorkflow = message.workflowSteps?.[0]?.agentId 
    ? findAgentById(message.workflowSteps[0].agentId) 
    : undefined;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (positive: boolean) => {
    setFeedback(positive ? 'positive' : 'negative');
    // Could send to analytics/backend here
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent);
      setIsEditing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className={`${styles.messageBubble} ${styles.assistantMessage}`}>
        <div className={styles.messageIcon}>
          <Bot size={20} />
        </div>
        <div className={styles.messageContent}>
          <div className={styles.typingIndicator}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.messageBubble} ${isUser ? styles.userMessage : styles.assistantMessage}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={styles.messageIcon}>
        {isUser ? (
          <User size={20} />
        ) : agentTagFromWorkflow ? (
          <span className={styles.agentIconEmoji}>
            {agentTagFromWorkflow.agentId === 'cooking' ? '🍳' :
             agentTagFromWorkflow.agentId === 'jobs' ? '💼' :
             agentTagFromWorkflow.agentId === 'travel' ? '✈️' :
             agentTagFromWorkflow.agentId === 'todo' ? '✅' :
             agentTagFromWorkflow.agentId === 'email' ? '📧' :
             agentTagFromWorkflow.agentId === 'shopping' ? '🛍️' :
             agentTagFromWorkflow.agentId === 'learning' ? '📚' : '🤖'}
          </span>
        ) : (
          <Bot size={20} />
        )}
      </div>
      <div className={styles.messageContent}>
        {isEditing ? (
          <div className={styles.editContainer}>
            <textarea
              className={styles.editTextarea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className={styles.editActions}>
              <button 
                className={styles.editCancel}
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.editSubmit}
                onClick={handleEditSubmit}
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        ) : isUser ? (
          <p className={styles.messageText}>{message.content}</p>
        ) : (
          <>
            <MarkdownContent 
              content={message.content}
              showAgentTags={true}
              onTagClick={onTagClick}
            />
            
            {/* Sources used */}
            {message.sources && message.sources.length > 0 && (
              <div className={styles.sourcesContainer}>
                <div className={styles.sourcesTitle}>
                  <Database size={12} />
                  Sources
                </div>
                <div className={styles.sourcesList}>
                  {message.sources.map((source, idx) => (
                    <SourceBadge key={idx} source={source} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Workflow steps if present */}
            {message.workflowSteps && message.workflowSteps.length > 0 && (
              <div className={styles.workflowSteps}>
                <div className={styles.workflowTitle}>
                  <Zap size={14} />
                  Actions Taken
                </div>
                {message.workflowSteps.map((step) => (
                  <WorkflowStepBadge key={step.id} step={step} />
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Timestamp */}
        <span className={styles.messageTimestamp}>
          {formatTimestamp(message.timestamp)}
        </span>
        
        {/* Actions */}
        {showActions && !isEditing && (
          <MessageActions
            message={message}
            onCopy={handleCopy}
            onRegenerate={!isUser ? onRegenerate : undefined}
            onEdit={isUser ? () => setIsEditing(true) : undefined}
            onFeedback={!isUser ? handleFeedback : undefined}
            copied={copied}
            feedbackGiven={feedback}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SOURCE BADGE
// =============================================================================

interface SourceBadgeProps {
  source: string;
}

const SourceBadge: React.FC<SourceBadgeProps> = ({ source }) => {
  const getSourceIcon = () => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('web') || sourceLower.includes('search')) {
      return <Globe size={12} />;
    }
    if (sourceLower.includes('ai') || sourceLower.includes('knowledge')) {
      return <Cpu size={12} />;
    }
    return <Database size={12} />;
  };

  const getSourceClass = () => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('web')) return styles.sourceWeb;
    if (sourceLower.includes('ai')) return styles.sourceAI;
    return styles.sourceAgent;
  };

  return (
    <span className={`${styles.sourceBadge} ${getSourceClass()}`}>
      {getSourceIcon()}
      {source}
    </span>
  );
};

// =============================================================================
// WORKFLOW STEP BADGE
// =============================================================================

interface WorkflowStepBadgeProps {
  step: WorkflowStep;
}

const WorkflowStepBadge: React.FC<WorkflowStepBadgeProps> = ({ step }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.stepCompleted} />;
      case 'failed':
        return <XCircle size={14} className={styles.stepFailed} />;
      case 'running':
        return <Loader2 size={14} className="animate-spin" />;
      case 'pending':
        return <Clock size={14} className={styles.stepPending} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.workflowStep} ${styles[`step${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}>
      {getStatusIcon()}
      <span className={styles.stepAgent}>{step.agentId}</span>
      <ChevronRight size={12} />
      <span className={styles.stepAction}>{step.action}</span>
    </div>
  );
};

// =============================================================================
// FOLLOW-UP SUGGESTIONS
// =============================================================================

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({ suggestions, onSelect }) => {
  return (
    <div className={styles.followUpContainer}>
      <span className={styles.followUpLabel}>
        <Sparkles size={12} />
        Continue the conversation:
      </span>
      <div className={styles.followUpButtons}>
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            className={styles.followUpButton}
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onSelect }) => {
  return (
    <div className={styles.suggestedPrompts}>
      <h3 className={styles.suggestedTitle}>
        <Sparkles size={18} />
        What can I help you with?
      </h3>
      <div className={styles.promptCategories}>
        {SUGGESTED_PROMPTS.map((category) => (
          <div key={category.category} className={styles.promptCategory}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryIcon}>{category.icon}</span>
              <span className={styles.categoryName}>{category.category}</span>
            </div>
            <div className={styles.prompts}>
              {category.prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className={styles.promptButton}
                  onClick={() => onSelect(prompt)}
                  tabIndex={0}
                  aria-label={`Send: ${prompt}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// KEYBOARD SHORTCUTS HINT
// =============================================================================

const KeyboardHints: React.FC = () => {
  return (
    <div className={styles.keyboardHints}>
      <span className={styles.keyHint}>
        <CornerDownLeft size={12} />
        Send
      </span>
      <span className={styles.keyHint}>
        <span className={styles.keyCombo}>Shift + Enter</span>
        New line
      </span>
      <span className={styles.keyHint}>
        <span className={styles.keyCombo}>Esc</span>
        Cancel
      </span>
    </div>
  );
};

// =============================================================================
// PLAN PREVIEW PANEL
// =============================================================================

interface PlanPreviewPanelProps {
  plan: ExecutionPlan;
  onApprove: () => void;
  onReject: () => void;
  isExecuting: boolean;
}

const PlanPreviewPanel: React.FC<PlanPreviewPanelProps> = ({
  plan,
  onApprove,
  onReject,
  isExecuting
}) => {
  const getStepStatusIcon = (step: PlanStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.stepCompleted} />;
      case 'running':
        return <Loader2 size={14} className="animate-spin" />;
      case 'failed':
        return <XCircle size={14} className={styles.stepFailed} />;
      case 'skipped':
        return <XOctagon size={14} className={styles.stepSkipped} />;
      default:
        return <Clock size={14} className={styles.stepPending} />;
    }
  };

  return (
    <div className={styles.planPreviewPanel}>
      <div className={styles.planHeader}>
        <div className={styles.planTitle}>
          <AlertTriangle size={18} className={styles.planWarningIcon} />
          <span>Execution Plan Preview</span>
        </div>
        <span className={styles.planStepCount}>
          {plan.estimatedActions} action{plan.estimatedActions !== 1 ? 's' : ''}
        </span>
      </div>

      <p className={styles.planExplanation}>{plan.explanation}</p>

      <div className={styles.planSteps}>
        <div className={styles.planStepsTitle}>
          <Zap size={14} />
          Steps to execute:
        </div>
        {plan.steps.map((step, index) => (
          <div key={step.id} className={styles.planStep}>
            <span className={styles.planStepNumber}>{index + 1}</span>
            {getStepStatusIcon(step)}
            <span className={styles.planStepTool}>{step.tool.replace(/_/g, ' ')}</span>
            <span className={styles.planStepDesc}>{step.description}</span>
          </div>
        ))}
      </div>

      {plan.requiresApproval && (
        <div className={styles.planActions}>
          <button
            className={styles.planRejectButton}
            onClick={onReject}
            disabled={isExecuting}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            className={styles.planApproveButton}
            onClick={onApprove}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play size={16} />
                Approve & Execute
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// IMAGE UPLOAD BUTTON
// =============================================================================

interface ImageUploadButtonProps {
  onImageSelect: (base64: string, type: string) => void;
  disabled?: boolean;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onImageSelect, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix
      const base64Data = base64.split(',')[1];
      onImageSelect(base64Data, file.type);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className={styles.imageUploadButton}
        onClick={handleClick}
        disabled={disabled}
        title="Upload image"
        aria-label="Upload image"
      >
        <Image size={18} />
      </button>
    </>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AssistantAgent: React.FC = () => {
  const { t } = useTranslation();
  const assistant = useAssistant();
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; type: string } | null>(null);
  const [enablePlanPreview, setEnablePlanPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle clicking on an agent tag to navigate
  const handleTagClick = (tag: AgentTagConfig) => {
    window.location.href = `/agents/${tag.agentId}`;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistant.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight, with min and max constraints
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || assistant.isProcessing) return;

    const message = inputValue;
    setInputValue('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // If there's a pending image, send with image
    if (pendingImage) {
      await assistant.sendMessageWithImage(message, pendingImage.base64, pendingImage.type);
      setPendingImage(null);
    } else {
      await assistant.sendMessage(message, enablePlanPreview);
    }
  };

  const handleImageSelect = (base64: string, type: string) => {
    setPendingImage({ base64, type });
  };

  const handleRemovePendingImage = () => {
    setPendingImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      if (assistant.isProcessing) {
        assistant.stopProcessing();
      }
    }
  };

  const handlePromptSelect = async (prompt: string) => {
    setInputValue('');
    await assistant.sendMessage(prompt);
  };

  const handleVoiceTranscript = (text: string) => {
    setInputValue(prev => prev ? `${prev} ${text}` : text);
  };

  // Regenerate last response
  const handleRegenerate = useCallback(() => {
    const lastUserMessage = [...assistant.messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove last assistant message and resend
      assistant.setMessages(prev => prev.slice(0, -1));
      assistant.sendMessage(lastUserMessage.content);
    }
  }, [assistant]);

  // Edit and resend a message
  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    const messageIndex = assistant.messages.findIndex(m => m.id === messageId);
    if (messageIndex >= 0) {
      // Remove all messages after this one
      assistant.setMessages(prev => prev.slice(0, messageIndex));
      // Send the new message
      assistant.sendMessage(newContent);
    }
  }, [assistant]);

  const showWelcomeScreen = assistant.messages.length === 0;
  const showFollowUp = assistant.messages.length > 0 && 
    !assistant.isProcessing && 
    assistant.messages[assistant.messages.length - 1]?.role === 'assistant';

  return (
    <AgentPageLayout
      agentId="assistant"
      title="AI Assistant"
      subtitle="Your intelligent helper for recipes, tasks, jobs, travel, and more"
      icon="🤖"
      isLoading={false}
      onRefresh={assistant.startNewChat}
    >
      <div className={styles.container}>
        {/* History Sidebar */}
        <HistorySidebar
          conversations={assistant.savedConversations}
          currentConversationId={assistant.conversationId}
          isOpen={showHistory}
          onToggle={() => setShowHistory(!showHistory)}
          onSelect={assistant.loadConversation}
          onDelete={assistant.deleteConversation}
          onNewChat={assistant.startNewChat}
        />

        {/* Main Chat Area */}
        <div className={styles.chatArea}>
          {/* Plan Preview Panel - shown when there's a pending plan */}
          {assistant.currentPlan && (
            <PlanPreviewPanel
              plan={assistant.currentPlan}
              onApprove={assistant.approvePlan}
              onReject={assistant.rejectPlan}
              isExecuting={assistant.isProcessing}
            />
          )}

          {/* Thinking Panel - shown during processing */}
          {assistant.isProcessing && assistant.thinkingSteps.length > 0 && (
            <ThinkingPanel
              steps={assistant.thinkingSteps}
              isProcessing={assistant.isProcessing}
              onStop={assistant.stopProcessing}
            />
          )}

          {/* Chat Messages */}
          <div className={styles.messagesContainer}>
            {showWelcomeScreen ? (
              <SuggestedPrompts onSelect={handlePromptSelect} />
            ) : (
              <div className={styles.messagesList}>
                {assistant.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === assistant.messages.length - 1}
                    onTagClick={handleTagClick}
                    onRegenerate={index === assistant.messages.length - 1 ? handleRegenerate : undefined}
                    onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                  />
                ))}
                
                {/* Follow-up suggestions */}
                {showFollowUp && (
                  <FollowUpSuggestions
                    suggestions={FOLLOW_UP_SUGGESTIONS}
                    onSelect={handlePromptSelect}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            {/* New Chat Button - only show when there are messages */}
            {!showWelcomeScreen && (
              <button
                className={styles.newChatButtonInline}
                onClick={assistant.startNewChat}
                title="Start new chat (⌘N)"
                aria-label="Start new chat"
                tabIndex={0}
              >
                <Plus size={18} />
              </button>
            )}

            {assistant.messages.length > 0 && (
              <button
                className={styles.clearButton}
                onClick={assistant.clearConversation}
                title="Clear conversation"
                aria-label="Clear conversation"
                tabIndex={0}
              >
                <Trash2 size={18} />
              </button>
            )}
            
            <form onSubmit={handleSubmit} className={styles.inputForm}>
              <div className={styles.inputWrapper}>
                <textarea
                  ref={inputRef}
                  className={styles.messageInput}
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={assistant.isProcessing}
                  rows={1}
                  maxLength={MAX_INPUT_LENGTH}
                  aria-label="Message input"
                />
                <div className={styles.inputMeta}>
                  {/* Character count */}
                  <span className={`${styles.charCount} ${inputValue.length > MAX_INPUT_LENGTH * 0.9 ? styles.charCountWarn : ''}`}>
                    {inputValue.length}/{MAX_INPUT_LENGTH}
                  </span>
                </div>
                {/* Pending image preview */}
                {pendingImage && (
                  <div className={styles.pendingImagePreview}>
                    <Image size={14} />
                    <span>Image attached</span>
                    <button
                      type="button"
                      className={styles.removePendingImage}
                      onClick={handleRemovePendingImage}
                      aria-label="Remove attached image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className={styles.inputActions}>
                  <ImageUploadButton
                    onImageSelect={handleImageSelect}
                    disabled={assistant.isProcessing}
                  />
                  <VoiceInputButton
                    onTranscript={handleVoiceTranscript}
                    size="sm"
                    title="Voice input"
                    ariaLabel="Start voice input"
                  />
                  {assistant.isProcessing ? (
                    <button
                      type="button"
                      className={styles.stopButtonInline}
                      onClick={assistant.stopProcessing}
                      aria-label="Stop processing (Esc)"
                      title="Stop (Esc)"
                      tabIndex={0}
                    >
                      <Square size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className={styles.sendButton}
                      disabled={!inputValue.trim()}
                      aria-label="Send message (Enter)"
                      title="Send (Enter)"
                      tabIndex={0}
                    >
                      <Send size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Keyboard hints */}
              <KeyboardHints />
            </form>
          </div>

          {/* Error Display */}
          {assistant.error && (
            <div className={styles.errorBanner}>
              <XCircle size={16} />
              {assistant.error}
            </div>
          )}
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AssistantAgent;
