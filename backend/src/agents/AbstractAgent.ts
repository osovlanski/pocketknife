/**
 * AbstractAgent - Base class for all agents
 * 
 * Provides common functionality:
 * - Process control (start/stop)
 * - Real-time logging via Socket.io
 * - Activity persistence to database
 * - State management
 * - Rate limiting per agent
 * - Retry logic with exponential backoff
 * - Configurable timeouts
 * - Metrics/telemetry
 * - Input validation
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
import { configService } from '../services/core/configService';
import logger from '../utils/logger';
import { 
  withRetry, 
  RetryOptions, 
  RateLimiter, 
  CircuitBreaker,
  isDefaultRetryable 
} from '../utils/retry';
import { telemetryService } from '../utils/telemetry';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentConfig {
  /** Rate limit: max requests per minute (default: 60) */
  rateLimit?: number;
  /** Retry options for failed operations */
  retryOptions?: RetryOptions;
  /** Default timeout in milliseconds (default: 30000) */
  defaultTimeoutMs?: number;
  /** Per-action timeout overrides */
  actionTimeouts?: Record<string, number>;
  /** Enable metrics collection (default: true) */
  metricsEnabled?: boolean;
  /** Circuit breaker threshold (default: 5) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker reset time in ms (default: 60000) */
  circuitBreakerResetMs?: number;
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastExecutionTime: Date | null;
  actionMetrics: Record<string, {
    count: number;
    successCount: number;
    failedCount: number;
    avgDurationMs: number;
  }>;
  rateLimitHits: number;
  retryCount: number;
  circuitBreakerTrips: number;
}

// =============================================================================
// ABSTRACT AGENT
// =============================================================================

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
  
  // Rate limiting
  private rateLimiter: RateLimiter;
  
  // Circuit breaker for external calls
  private circuitBreaker: CircuitBreaker;
  
  // Metrics collection
  private metrics: AgentMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    lastExecutionTime: null,
    actionMetrics: {},
    rateLimitHits: 0,
    retryCount: 0,
    circuitBreakerTrips: 0
  };
  
  // Configuration
  protected config: AgentConfig;
  
  // Validation schemas (override in subclasses)
  protected validationSchemas: Record<string, z.ZodSchema> = {};

  constructor(config?: AgentConfig) {
    // Get defaults from configService, then apply config overrides
    const defaultRateLimit = configService.get('agent.default.rateLimit', 60);
    const defaultTimeoutMs = configService.get('agent.default.timeoutMs', 30000);
    const defaultCircuitBreakerThreshold = configService.get('agent.default.circuitBreakerThreshold', 5);
    const defaultCircuitBreakerResetMs = configService.get('agent.default.circuitBreakerResetMs', 60000);
    const defaultRetryMaxAttempts = configService.get('agent.default.retryMaxAttempts', 3);
    const defaultRetryInitialDelayMs = configService.get('agent.default.retryInitialDelayMs', 1000);
    const defaultRetryMaxDelayMs = configService.get('agent.default.retryMaxDelayMs', 30000);
    const defaultRetryBackoffMultiplier = configService.get('agent.default.retryBackoffMultiplier', 2);
    
    this.config = {
      rateLimit: config?.rateLimit || defaultRateLimit,
      defaultTimeoutMs: config?.defaultTimeoutMs || defaultTimeoutMs,
      actionTimeouts: config?.actionTimeouts || {},
      metricsEnabled: config?.metricsEnabled ?? true,
      circuitBreakerThreshold: config?.circuitBreakerThreshold || defaultCircuitBreakerThreshold,
      circuitBreakerResetMs: config?.circuitBreakerResetMs || defaultCircuitBreakerResetMs,
      retryOptions: {
        maxRetries: defaultRetryMaxAttempts,
        initialDelayMs: defaultRetryInitialDelayMs,
        maxDelayMs: defaultRetryMaxDelayMs,
        backoffMultiplier: defaultRetryBackoffMultiplier,
        jitter: true,
        ...config?.retryOptions
      }
    };
    
    // Initialize rate limiter (tokens per minute)
    const rateLimitRefillMs = configService.get('agent.default.circuitBreakerResetMs', 60000);
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit!,
      rateLimitRefillMs
    );
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold!,
      this.config.circuitBreakerResetMs!
    );
  }

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
   * Get timeout for a specific action
   */
  protected getActionTimeout(action?: string): number {
    if (action && this.config.actionTimeouts?.[action]) {
      return this.config.actionTimeouts[action];
    }
    return this.config.defaultTimeoutMs || configService.get('agent.default.timeoutMs', 30000);
  }

  /**
   * Validate params against registered schema
   */
  protected validateParams<T>(action: string, params: unknown): { valid: true; data: T } | { valid: false; error: string } {
    const schema = this.validationSchemas[action];
    if (!schema) {
      // No schema registered, pass through
      return { valid: true, data: params as T };
    }

    const result = schema.safeParse(params);
    if (result.success) {
      return { valid: true, data: result.data as T };
    }

    const errors = result.error.issues.map((issue: z.ZodIssue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join('; ');

    return { valid: false, error: errors };
  }

  /**
   * Execute the agent's main task
   * Wraps the implementation with lifecycle management, rate limiting, and retry logic
   */
  async execute(params: AgentParams): Promise<AgentResult> {
    const startTime = Date.now();
    const action = (params as any).action || 'execute';
    
    try {
      // Check rate limit
      if (!(await this.rateLimiter.acquire())) {
        this.metrics.rateLimitHits++;
        telemetryService.recordRateLimitHit(this.metadata.id);
        this.emitLog(`⚠️ Rate limit exceeded for ${this.metadata.name}`, 'warning');
        
        // Wait for token
        await this.rateLimiter.waitForToken();
      }

      // Validate input if schema exists
      const validation = this.validateParams(action, params);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation error: ${validation.error}`
        };
      }
      
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
      
      // Get timeout for this action
      const timeout = this.getActionTimeout(action);
      
      // Execute with retry logic, timeout, and circuit breaker
      const result = await this.executeWithProtection(params, action, timeout);
      
      // Update state based on result
      const duration = Date.now() - startTime;
      this.state.status = this.stopRequested ? 'idle' : 'completed';
      this.state.lastRunAt = new Date();
      this.state.progress = 100;
      
      // Update metrics and telemetry
      this.updateMetrics(action, duration, result.success);
      telemetryService.recordAgentExecution(this.metadata.id, action, duration, result.success);
      
      if (this.stopRequested) {
        this.emitLog(`⏹️ ${this.metadata.name} stopped by user`, 'warning');
        this.emitStatus('idle');
        return { ...result, stopped: true, duration };
      }
      
      this.emitLog(`✅ ${this.metadata.name} completed successfully`, 'success');
      this.emitStatus('completed');
      
      // Log activity to database (will use default user if userId not provided)
      await this.saveUserActivity(params.userId, action, {
        success: result.success,
        duration,
        params: this.sanitizeParams(params)
      });
      
      return { ...result, duration };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.state.status = 'error';
      this.state.lastError = error.message;
      
      // Update metrics and telemetry for failure
      this.updateMetrics(action, duration, false);
      telemetryService.recordAgentExecution(this.metadata.id, action, duration, false);
      
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
   * Execute with retry, timeout, and circuit breaker protection
   */
  private async executeWithProtection(
    params: AgentParams, 
    action: string, 
    timeoutMs: number
  ): Promise<AgentResult> {
    // Wrap execution with circuit breaker
    return this.circuitBreaker.execute(async () => {
      // Wrap with retry logic
      return withRetry(
        async () => {
          // Wrap with timeout
          return this.executeWithTimeout(params, timeoutMs);
        },
        {
          ...this.config.retryOptions,
          operationName: `${this.metadata.name}:${action}`,
          isRetryable: (error) => {
            // Don't retry validation errors or user-caused errors
            if (error.message?.includes('Validation error')) return false;
            if (error.message?.includes('required')) return false;
            if (error.message?.includes('not found')) return false;
            return isDefaultRetryable(error);
          },
          onRetry: (error, attempt, delay) => {
            this.metrics.retryCount++;
            telemetryService.recordRetry(this.metadata.id, action, attempt);
            this.emitLog(`🔄 Retry ${attempt} for ${action} in ${delay}ms: ${error.message}`, 'warning');
          }
        }
      );
    }, () => {
      // Fallback when circuit is open
      this.metrics.circuitBreakerTrips++;
      telemetryService.recordCircuitBreakerTrip(this.metadata.id);
      this.emitLog(`⚡ Circuit breaker open for ${this.metadata.name}`, 'error');
      return {
        success: false,
        error: 'Service temporarily unavailable due to repeated failures. Please try again later.'
      };
    });
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(params: AgentParams, timeoutMs: number): Promise<AgentResult> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await this.run(params);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Update metrics after execution
   */
  private updateMetrics(action: string, duration: number, success: boolean): void {
    if (!this.config.metricsEnabled) return;

    // Overall metrics
    this.metrics.totalExecutions++;
    this.metrics.totalDurationMs += duration;
    this.metrics.avgDurationMs = this.metrics.totalDurationMs / this.metrics.totalExecutions;
    this.metrics.lastExecutionTime = new Date();

    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Per-action metrics
    if (!this.metrics.actionMetrics[action]) {
      this.metrics.actionMetrics[action] = {
        count: 0,
        successCount: 0,
        failedCount: 0,
        avgDurationMs: 0
      };
    }

    const actionMetric = this.metrics.actionMetrics[action];
    actionMetric.count++;
    actionMetric.avgDurationMs = 
      ((actionMetric.avgDurationMs * (actionMetric.count - 1)) + duration) / actionMetric.count;

    if (success) {
      actionMetric.successCount++;
    } else {
      actionMetric.failedCount++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      lastExecutionTime: null,
      actionMetrics: {},
      rateLimitHits: 0,
      retryCount: 0,
      circuitBreakerTrips: 0
    };
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): 'closed' | 'open' | 'half-open' {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus(): { available: number; limit: number } {
    return {
      available: this.rateLimiter.getAvailableTokens(),
      limit: this.config.rateLimit || 60
    };
  }

  /**
   * Execute an external call with automatic retry and circuit breaker
   * Use this for API calls within agent actions
   */
  protected async executeExternalCall<T>(
    operation: () => Promise<T>,
    options?: {
      operationName?: string;
      retryOptions?: Partial<RetryOptions>;
      timeoutMs?: number;
    }
  ): Promise<T> {
    const timeoutMs = options?.timeoutMs || this.config.defaultTimeoutMs || 30000;
    const operationName = options?.operationName || 'external-call';
    const startTime = Date.now();

    return this.circuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          return new Promise<T>(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`External call timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            try {
              const result = await operation();
              clearTimeout(timeoutId);
              
              // Record successful external API call
              const duration = Date.now() - startTime;
              telemetryService.recordExternalApiCall(
                this.metadata.id,
                operationName,
                duration,
                true
              );
              
              resolve(result);
            } catch (error) {
              clearTimeout(timeoutId);
              
              // Record failed external API call
              const duration = Date.now() - startTime;
              telemetryService.recordExternalApiCall(
                this.metadata.id,
                operationName,
                duration,
                false
              );
              
              reject(error);
            }
          });
        },
        {
          ...this.config.retryOptions,
          ...options?.retryOptions,
          operationName,
          onRetry: (error, attempt, delay) => {
            this.metrics.retryCount++;
            telemetryService.recordRetry(this.metadata.id, operationName, attempt);
            this.emitLog(`🔄 Retrying external call (${attempt}): ${error.message}`, 'warning');
          }
        }
      );
    });
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
    logger.agent(message, { agent: this.metadata.id });
    
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
    // Record agent state in telemetry
    telemetryService.setAgentState(this.metadata.id, status);
    
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
        logger.debug('Skipping activity log - no userId available', { agent: this.metadata.id });
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
      logger.warn('Failed to save activity', { agent: this.metadata.id, error: error instanceof Error ? error.message : String(error) });
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
      logger.warn('Failed to get history', { agent: this.metadata.id, error: error instanceof Error ? error.message : String(error) });
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

