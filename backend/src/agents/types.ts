/**
 * Agent Types and Interfaces
 *
 * Defines the core contract for all agents in the Pocketknife platform.
 *
 * Agent metadata is self-describing: each agent declares its own identity,
 * keywords, capabilities, and classification. The orchestrator discovers
 * agents via the registry rather than maintaining hardcoded maps.
 */

export type AgentId = 'email' | 'jobs' | 'travel' | 'learning' | 'problems' | 'todo' | 'shopping' | 'cooking' | 'news' | 'diy' | 'assistant';

export type AgentType = 'simple' | 'deep';

export type AgentStatus = 'idle' | 'running' | 'stopping' | 'completed' | 'error';

export type LogType = 'info' | 'success' | 'warning' | 'error';

// =============================================================================
// CAPABILITY TYPES
// =============================================================================

/** A single parameter for an agent capability/action */
export interface CapabilityParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: string | number | boolean;
}

/** A capability (action) that an agent can perform */
export interface AgentCapability {
  action: string;
  description: string;
  parameters: CapabilityParameter[];
  examples?: string[];
}

// =============================================================================
// AGENT METADATA
// =============================================================================

/**
 * Self-describing agent metadata.
 *
 * Every agent declares its full identity and capabilities here.
 * The orchestrator reads this from the registry -- no hardcoded maps needed.
 */
export interface AgentMetadata {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Keywords/hashtags that trigger this agent (e.g., #recipe, #todo) */
  keywords: string[];
  /** Classification: 'simple' agents need fewer iterations, 'deep' agents need more */
  agentType: AgentType;
  /** Actions this agent can perform, used by LLM for intent routing */
  capabilities: AgentCapability[];
}

export interface AgentState {
  status: AgentStatus;
  startedAt: Date | null;
  lastRunAt: Date | null;
  lastError: string | null;
  progress: number; // 0-100
}

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  stopped?: boolean;
  duration?: number;
}

export interface AgentParams {
  userId?: string;
  [key: string]: unknown;
}

/**
 * Core Agent interface - all agents must implement this
 */
export interface IAgent {
  // Identity
  readonly metadata: AgentMetadata;
  
  // Lifecycle
  initialize(): Promise<void>;
  execute(params: AgentParams): Promise<AgentResult>;
  stop(): void;
  
  // State
  getState(): AgentState;
  isRunning(): boolean;
  shouldStop(): boolean;
  
  // Communication
  emitLog(message: string, type?: LogType): void;
  emitProgress(progress: number): void;
}

/**
 * Extended agent with persistence capabilities
 */
export interface IPersistentAgent extends IAgent {
  saveUserActivity(userId: string, action: string, data: unknown): Promise<void>;
  getUserHistory(userId: string, limit?: number): Promise<unknown[]>;
}
