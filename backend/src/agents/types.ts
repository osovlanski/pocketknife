/**
 * Agent Types and Interfaces
 * 
 * Defines the core contract for all agents in the Pocketknife platform.
 */

export type AgentId = 'email' | 'jobs' | 'travel' | 'learning' | 'problems';

export type AgentStatus = 'idle' | 'running' | 'stopping' | 'completed' | 'error';

export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface AgentMetadata {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
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

