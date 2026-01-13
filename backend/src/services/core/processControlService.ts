import { Server as SocketServer, Socket } from 'socket.io';
import logger from '../../utils/logger';

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

  initialize(io: SocketServer): void {
    this.io = io;
    
    io.on('connection', (socket: Socket) => {
      socket.on('stop-process', (data: { agent: AgentType }) => {
        logger.stop(`Stop signal received for ${data.agent} agent`);
        this.requestStop(data.agent, socket.id);
      });

      socket.on('start-process', (data: { agent: AgentType }) => {
        logger.start(`Process started for ${data.agent} agent`);
        this.socketToAgent.set(socket.id, data.agent);
      });

      socket.on('disconnect', () => {
        const agent = this.socketToAgent.get(socket.id);
        if (agent) {
          this.socketToAgent.delete(socket.id);
        }
      });
    });

    logger.success('Process Control Service initialized');
  }

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

  requestStop(agent: AgentType, requestedBy?: string): void {
    const state = this.processStates.get(agent);
    
    if (state && state.isRunning) {
      state.shouldStop = true;
      this.processStates.set(agent, state);
      
      this.emitStatus(agent, 'stopping');
      this.emitLog(agent, '🛑 Stop requested - finishing current operation...', 'warning');
      
      logger.stop(`Stop requested for ${agent}`, { requestedBy: requestedBy || 'unknown' });
    }
  }

  shouldStop(agent: AgentType): boolean {
    const state = this.processStates.get(agent);
    return state?.shouldStop ?? false;
  }

  isRunning(agent: AgentType): boolean {
    const state = this.processStates.get(agent);
    return state?.isRunning ?? false;
  }

  completeProcess(agent: AgentType, wasStopped: boolean = false): void {
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

    logger.complete(`Process ${wasStopped ? 'stopped' : 'completed'} for ${agent}`);
  }

  private emitStatus(agent: AgentType, status: 'started' | 'stopping' | 'stopped' | 'completed'): void {
    this.io?.emit('process-status', { agent, status });
  }

  emitLog(agent: AgentType, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.io?.emit('log', { message, type, agent });
  }

  getAllStates(): Record<AgentType, ProcessState> {
    const result: Partial<Record<AgentType, ProcessState>> = {};
    this.processStates.forEach((state, agent) => {
      result[agent] = state;
    });
    return result as Record<AgentType, ProcessState>;
  }
}

const processControlService = new ProcessControlService();

export default processControlService;
export type { AgentType, ProcessState };
