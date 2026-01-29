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
export { todoAgent, ToDoAgent } from './ToDoAgent';
export { shoppingAgent, ShoppingAgent } from './ShoppingAgent';
export { cookingAgent, CookingAgent } from './CookingAgent';
export { newsAgent, NewsAgent } from './NewsAgent';
export { diyAgent, DIYAgent } from './DIYAgent';
export { assistantAgent, AssistantAgent } from './AssistantAgent';

// Register all agents
import { agentRegistry } from './AgentRegistry';
import { emailAgent } from './EmailAgent';
import { jobsAgent } from './JobsAgent';
import { travelAgent } from './TravelAgent';
import { learningAgent } from './LearningAgent';
import { problemsAgent } from './ProblemsAgent';
import { todoAgent } from './ToDoAgent';
import { shoppingAgent } from './ShoppingAgent';
import { cookingAgent } from './CookingAgent';
import { newsAgent } from './NewsAgent';
import { diyAgent } from './DIYAgent';
import { assistantAgent } from './AssistantAgent';
import logger from '../utils/logger';

/**
 * Initialize all agents and register them
 */
export const initializeAgents = () => {
  agentRegistry.register(emailAgent);
  agentRegistry.register(jobsAgent);
  agentRegistry.register(travelAgent);
  agentRegistry.register(learningAgent);
  agentRegistry.register(problemsAgent);
  agentRegistry.register(todoAgent);
  agentRegistry.register(shoppingAgent);
  agentRegistry.register(cookingAgent);
  agentRegistry.register(newsAgent);
  agentRegistry.register(diyAgent);
  agentRegistry.register(assistantAgent);
  
  logger.success('All agents registered', { 
    agents: agentRegistry.getAll().map(a => a.metadata.name) 
  });
};
