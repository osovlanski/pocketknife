import { Server as SocketServer, Socket } from 'socket.io';

interface ProcessState {
  isRunning: boolean;
  shouldStop: boolean;
  startedAt: Date | null;
  processId: string | null;
}

type AgentType = 'email' | 'jobs' | 'travel' | 'learning' | 'problems' | 'ski';

/**
 * Centralized service for managing process control (start/stop) across all agents.
 * Uses Socket.io for real-time communication with the frontend.
 */
class ProcessControlService {
  private io: SocketServer | null = null;
  private processStates: Map<AgentType, ProcessState> = new Map();
  private socketToAgent: Map<string, AgentType> = new Map();

  constructor() {
    // Initialize all agent states
    const agents: AgentType[] = ['email', 'jobs', 'travel', 'learning', 'problems', 'ski'];
    agents.forEach(agent => {
      this.processStates.set(agent, {
        isRunning: false,
        shouldStop: false,
        startedAt: null,
        processId: null
      });
    });
  }

  /**
   * Initialize with Socket.io server
   */
  initialize(io: SocketServer): void {
    this.io = io;
    
    io.on('connection', (socket: Socket) => {
      // Listen for stop requests from frontend
      socket.on('stop-process', (data: { agent: AgentType }) => {
        console.log(`🛑 Stop signal received for ${data.agent} agent`);
        this.requestStop(data.agent, socket.id);
      });

      // Listen for process start notifications
      socket.on('start-process', (data: { agent: AgentType }) => {
        console.log(`▶️ Process started for ${data.agent} agent`);
        this.socketToAgent.set(socket.id, data.agent);
      });

      // Clean up on disconnect
      socket.on('disconnect', () => {
        const agent = this.socketToAgent.get(socket.id);
        if (agent) {
          // If the socket that started the process disconnects, we might want to stop
          this.socketToAgent.delete(socket.id);
        }
      });
    });

    console.log('✅ Process Control Service initialized');
  }

  /**
   * Mark an agent process as started
   */
  startProcess(agent: AgentType): string {
    const processId = `${agent}-${Date.now()}`;
    
    this.processStates.set(agent, {
      isRunning: true,
      shouldStop: false,
      startedAt: new Date(),
      processId
    });

    this.emitStatus(agent, 'started');
    return processId;
  }

  /**
   * Request to stop an agent process
   */
  requestStop(agent: AgentType, requestedBy?: string): void {
    const state = this.processStates.get(agent);
    
    if (state && state.isRunning) {
      state.shouldStop = true;
      this.processStates.set(agent, state);
      
      this.emitStatus(agent, 'stopping');
      this.emitLog(agent, '🛑 Stop requested - finishing current operation...', 'warning');
      
      console.log(`🛑 Stop requested for ${agent} (requested by: ${requestedBy || 'unknown'})`);
    }
  }

  /**
   * Check if a process should stop - call this in processing loops
   */
  shouldStop(agent: AgentType): boolean {
    const state = this.processStates.get(agent);
    return state?.shouldStop ?? false;
  }

  /**
   * Check if a process is currently running
   */
  isRunning(agent: AgentType): boolean {
    const state = this.processStates.get(agent);
    return state?.isRunning ?? false;
  }

  /**
   * Mark an agent process as completed
   */
  completeProcess(agent: AgentType, wasStopped: boolean = false): void {
    const state = this.processStates.get(agent);
    
    this.processStates.set(agent, {
      isRunning: false,
      shouldStop: false,
      startedAt: null,
      processId: null
    });

    if (wasStopped) {
      this.emitStatus(agent, 'stopped');
      this.emitLog(agent, '⏹️ Process stopped by user', 'warning');
    } else {
      this.emitStatus(agent, 'completed');
    }

    console.log(`✅ Process ${wasStopped ? 'stopped' : 'completed'} for ${agent}`);
  }

  /**
   * Emit status change to frontend
   */
  private emitStatus(agent: AgentType, status: 'started' | 'stopping' | 'stopped' | 'completed'): void {
    this.io?.emit('process-status', { agent, status });
  }

  /**
   * Emit a log message for an agent
   */
  emitLog(agent: AgentType, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.io?.emit('log', { message, type, agent });
  }

  /**
   * Get the current state of all agents (for debugging/status endpoint)
   */
  getAllStates(): Record<AgentType, ProcessState> {
    const result: Partial<Record<AgentType, ProcessState>> = {};
    this.processStates.forEach((state, agent) => {
      result[agent] = state;
    });
    return result as Record<AgentType, ProcessState>;
  }
}

// Singleton instance
const processControlService = new ProcessControlService();

export default processControlService;
export { AgentType, ProcessState };

