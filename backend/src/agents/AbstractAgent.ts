/**
 * AbstractAgent - Base class for all agents
 * 
 * Provides common functionality:
 * - Process control (start/stop)
 * - Real-time logging via Socket.io
 * - Activity persistence to database
 * - State management
 */

import { Server as SocketServer } from 'socket.io';
import { 
  IAgent, 
  IPersistentAgent,
  AgentId, 
  AgentMetadata, 
  AgentState, 
  AgentResult, 
  AgentParams,
  LogType 
} from './types';
import { databaseService, getPrisma } from '../services/core/databaseService';

export abstract class AbstractAgent implements IPersistentAgent {
  abstract readonly metadata: AgentMetadata;
  
  protected io: SocketServer | null = null;
  protected state: AgentState = {
    status: 'idle',
    startedAt: null,
    lastRunAt: null,
    lastError: null,
    progress: 0
  };
  
  private stopRequested: boolean = false;

  /**
   * Initialize the agent with Socket.io server
   */
  async initialize(): Promise<void> {
    // Override in subclasses for custom initialization
  }

  /**
   * Set the Socket.io server for real-time communication
   */
  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  /**
   * Execute the agent's main task
   * Wraps the implementation with lifecycle management
   */
  async execute(params: AgentParams): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      // Reset state
      this.stopRequested = false;
      this.state = {
        status: 'running',
        startedAt: new Date(),
        lastRunAt: null,
        lastError: null,
        progress: 0
      };
      
      this.emitStatus('running');
      this.emitLog(`🚀 Starting ${this.metadata.name}...`, 'info');
      
      // Execute the agent's implementation
      const result = await this.run(params);
      
      // Update state based on result
      const duration = Date.now() - startTime;
      this.state.status = this.stopRequested ? 'idle' : 'completed';
      this.state.lastRunAt = new Date();
      this.state.progress = 100;
      
      if (this.stopRequested) {
        this.emitLog(`⏹️ ${this.metadata.name} stopped by user`, 'warning');
        this.emitStatus('idle');
        return { ...result, stopped: true, duration };
      }
      
      this.emitLog(`✅ ${this.metadata.name} completed successfully`, 'success');
      this.emitStatus('completed');
      
      // Log activity to database (will use default user if userId not provided)
      await this.saveUserActivity(params.userId, 'execute', {
        success: result.success,
        duration,
        params: this.sanitizeParams(params)
      });
      
      return { ...result, duration };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.state.status = 'error';
      this.state.lastError = error.message;
      
      this.emitLog(`❌ ${this.metadata.name} error: ${error.message}`, 'error');
      this.emitStatus('error');
      
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Request the agent to stop
   */
  stop(): void {
    if (this.state.status === 'running') {
      this.stopRequested = true;
      this.state.status = 'stopping';
      this.emitStatus('stopping');
      this.emitLog(`🛑 Stop requested for ${this.metadata.name}...`, 'warning');
    }
  }

  /**
   * Check if stop has been requested
   */
  shouldStop(): boolean {
    return this.stopRequested;
  }

  /**
   * Check if the agent is currently running
   */
  isRunning(): boolean {
    return this.state.status === 'running' || this.state.status === 'stopping';
  }

  /**
   * Get the current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Emit a log message via Socket.io
   */
  emitLog(message: string, type: LogType = 'info'): void {
    console.log(`[${this.metadata.id}] ${message}`);
    
    this.io?.emit('log', {
      message,
      type,
      agent: this.metadata.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit progress update
   */
  emitProgress(progress: number): void {
    this.state.progress = Math.min(100, Math.max(0, progress));
    
    this.io?.emit('agent-progress', {
      agent: this.metadata.id,
      progress: this.state.progress
    });
  }

  /**
   * Emit status change
   */
  protected emitStatus(status: AgentState['status']): void {
    this.io?.emit('agent-status', {
      agent: this.metadata.id,
      status,
      state: this.getState()
    });
  }

  /**
   * Save user activity to database
   * If userId is not provided, will attempt to get the default user
   */
  async saveUserActivity(userId: string | undefined, action: string, data: unknown): Promise<void> {
    try {
      // Get default user if not provided
      let effectiveUserId = userId;
      if (!effectiveUserId && databaseService.isConfigured()) {
        const defaultUser = await databaseService.getDefaultUser();
        effectiveUserId = defaultUser?.id;
      }

      if (!effectiveUserId) {
        console.warn(`Skipping activity log - no userId available for ${this.metadata.id}`);
        return;
      }

      await databaseService.logActivity({
        userId: effectiveUserId,
        agent: this.metadata.id,
        action,
        details: typeof data === 'string' ? data : JSON.stringify(data),
        metadata: data as Record<string, unknown>,
        status: 'success'
      });
    } catch (error) {
      console.warn(`Failed to save activity for ${this.metadata.id}:`, error);
    }
  }

  /**
   * Get user's activity history for this agent
   */
  async getUserHistory(userId: string, limit: number = 50): Promise<unknown[]> {
    const prisma = getPrisma();
    if (!prisma) return [];
    
    try {
      const activities = await prisma.activityLog.findMany({
        where: {
          userId,
          agent: this.metadata.id
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return activities;
    } catch (error) {
      console.warn(`Failed to get history for ${this.metadata.id}:`, error);
      return [];
    }
  }

  /**
   * Remove sensitive data from params before logging
   */
  protected sanitizeParams(params: AgentParams): Record<string, unknown> {
    const { userId, ...rest } = params;
    // Remove any sensitive fields
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (!key.toLowerCase().includes('password') && 
          !key.toLowerCase().includes('token') &&
          !key.toLowerCase().includes('secret')) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Abstract method - subclasses implement their main logic here
   */
  protected abstract run(params: AgentParams): Promise<AgentResult>;
}

