/**
 * AgentRegistry - Centralized management of all agents
 * 
 * Provides:
 * - Agent registration and discovery
 * - Lifecycle management
 * - Status monitoring
 * - Health checks
 */

import { Server as SocketServer } from 'socket.io';
import { AbstractAgent } from './AbstractAgent';
import { AgentId, AgentMetadata, AgentState } from './types';

class AgentRegistry {
  private agents: Map<AgentId, AbstractAgent> = new Map();
  private io: SocketServer | null = null;

  /**
   * Initialize the registry with Socket.io server
   */
  initialize(io: SocketServer): void {
    this.io = io;
    
    // Set socket server on all registered agents
    for (const agent of this.agents.values()) {
      agent.setSocketServer(io);
    }

    // Handle stop requests from frontend
    io.on('connection', (socket) => {
      socket.on('stop-agent', (data: { agentId: AgentId }) => {
        this.stopAgent(data.agentId);
      });
      
      socket.on('get-agents-status', () => {
        socket.emit('agents-status', this.getAllStatus());
      });
    });

    console.log('✅ Agent Registry initialized');
  }

  /**
   * Register an agent
   */
  register(agent: AbstractAgent): void {
    const id = agent.metadata.id;
    
    if (this.agents.has(id)) {
      console.warn(`⚠️ Agent ${id} already registered, replacing...`);
    }
    
    this.agents.set(id, agent);
    
    if (this.io) {
      agent.setSocketServer(this.io);
    }
    
    console.log(`📦 Registered agent: ${agent.metadata.name}`);
  }

  /**
   * Get an agent by ID
   */
  get(id: AgentId): AbstractAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  getAll(): AbstractAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent metadata
   */
  getAllMetadata(): AgentMetadata[] {
    return this.getAll().map(agent => agent.metadata);
  }

  /**
   * Get status of all agents
   */
  getAllStatus(): Record<AgentId, AgentState> {
    const status: Partial<Record<AgentId, AgentState>> = {};
    
    for (const [id, agent] of this.agents) {
      status[id] = agent.getState();
    }
    
    return status as Record<AgentId, AgentState>;
  }

  /**
   * Stop a specific agent
   */
  stopAgent(id: AgentId): boolean {
    const agent = this.agents.get(id);
    
    if (agent) {
      agent.stop();
      return true;
    }
    
    return false;
  }

  /**
   * Stop all running agents
   */
  stopAll(): void {
    for (const agent of this.agents.values()) {
      if (agent.isRunning()) {
        agent.stop();
      }
    }
  }

  /**
   * Check if any agent is running
   */
  isAnyRunning(): boolean {
    for (const agent of this.agents.values()) {
      if (agent.isRunning()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Health check for all agents
   */
  healthCheck(): { healthy: boolean; agents: Record<AgentId, { status: string; lastRun: Date | null }> } {
    const agents: Record<string, { status: string; lastRun: Date | null }> = {};
    let healthy = true;
    
    for (const [id, agent] of this.agents) {
      const state = agent.getState();
      agents[id] = {
        status: state.status,
        lastRun: state.lastRunAt
      };
      
      if (state.status === 'error') {
        healthy = false;
      }
    }
    
    return { healthy, agents: agents as Record<AgentId, { status: string; lastRun: Date | null }> };
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();

export default agentRegistry;



