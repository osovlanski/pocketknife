/**
 * Agents Index
 * 
 * Central export point for all agents.
 * Registers all agents with the AgentRegistry on import.
 */

// Types
export * from './types';

// Base class
export { AbstractAgent } from './AbstractAgent';

// Registry
export { agentRegistry } from './AgentRegistry';

// Concrete agents
export { emailAgent, EmailAgent } from './EmailAgent';
export { jobsAgent, JobsAgent } from './JobsAgent';
export { travelAgent, TravelAgent } from './TravelAgent';
export { learningAgent, LearningAgent } from './LearningAgent';
export { problemsAgent, ProblemsAgent } from './ProblemsAgent';

// Register all agents
import { agentRegistry } from './AgentRegistry';
import { emailAgent } from './EmailAgent';
import { jobsAgent } from './JobsAgent';
import { travelAgent } from './TravelAgent';
import { learningAgent } from './LearningAgent';
import { problemsAgent } from './ProblemsAgent';

/**
 * Initialize all agents and register them
 */
export const initializeAgents = () => {
  agentRegistry.register(emailAgent);
  agentRegistry.register(jobsAgent);
  agentRegistry.register(travelAgent);
  agentRegistry.register(learningAgent);
  agentRegistry.register(problemsAgent);
  
  console.log('✅ All agents registered');
  console.log(`   📦 Registered: ${agentRegistry.getAll().map(a => a.metadata.name).join(', ')}`);
};
