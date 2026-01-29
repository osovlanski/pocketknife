/**
 * Agent Orchestrator Service
 * 
 * Central service for cross-agent execution and capability discovery.
 * Used by the AI Assistant to understand and invoke agent capabilities.
 */

import { agentRegistry } from '../../agents/AgentRegistry';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import type { AgentId, AgentMetadata, AgentResult, AgentParams } from '../../agents/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Detailed capability of an agent action
 */
export interface AgentCapability {
  action: string;
  description: string;
  parameters: CapabilityParameter[];
  examples?: string[];
}

export interface CapabilityParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: string | number | boolean;
}

/**
 * Full agent info with capabilities
 */
export interface AgentInfo {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: AgentCapability[];
  keywords: string[];
  isAvailable: boolean;
}

/**
 * Workflow step for multi-step execution
 */
export interface WorkflowStep {
  id: string;
  agentId: AgentId;
  action: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: AgentResult;
  error?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  summary?: string;
  error?: string;
  duration?: number;
}

// =============================================================================
// AGENT CAPABILITIES DEFINITIONS
// =============================================================================

/**
 * Agent keywords/hashtags for trigger detection
 */
export const AGENT_KEYWORDS: Record<string, string[]> = {
  cooking: ['#recipe', '#cooking', '#food', '#ingredient', '#meal', '#kitchen'],
  jobs: ['#job', '#career', '#interview', '#resume', '#cv', '#hiring'],
  travel: ['#travel', '#flight', '#hotel', '#trip', '#vacation', '#booking'],
  todo: ['#todo', '#task', '#reminder', '#deadline', '#checklist'],
  email: ['#email', '#inbox', '#mail', '#gmail', '#newsletter'],
  shopping: ['#shopping', '#deal', '#price', '#discount', '#buy', '#order'],
  learning: ['#learn', '#tutorial', '#course', '#study', '#education'],
  news: ['#news', '#article', '#trending', '#headline'],
  diy: ['#diy', '#project', '#craft', '#build', '#make'],
  problems: ['#code', '#leetcode', '#algorithm', '#problem', '#coding'],
  assistant: ['#ai', '#assistant', '#help']
};

/**
 * Hardcoded capability definitions for each agent.
 * These describe what actions each agent can perform for the AI to understand.
 */
const AGENT_CAPABILITIES: Record<string, AgentCapability[]> = {
  cooking: [
    {
      action: 'find-recipes',
      description: 'Search for recipes based on ingredients, cuisine, or dietary preferences',
      parameters: [
        { name: 'query', type: 'string', required: false, description: 'Recipe search query', example: 'pasta' },
        { name: 'cuisine', type: 'string', required: false, description: 'Cuisine type', example: 'italian' },
        { name: 'useAvailableOnly', type: 'boolean', required: false, description: 'Only use ingredients from inventory' },
        { name: 'ingredients', type: 'array', required: false, description: 'Specific ingredients to use' }
      ],
      examples: ['Find me a pasta recipe', 'What can I cook with chicken and rice?']
    },
    {
      action: 'get-items',
      description: 'Get inventory items from the kitchen',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by category' }
      ],
      examples: ['What do I have in my kitchen?', 'Show me my dairy products']
    },
    {
      action: 'add-item',
      description: 'Add an item to the kitchen inventory',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Item name', example: 'Milk' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity', example: 2 },
        { name: 'category', type: 'string', required: false, description: 'Category', example: 'dairy' }
      ],
      examples: ['Add milk to my inventory', 'I bought 2 dozen eggs']
    },
    {
      action: 'create-list',
      description: 'Create a new shopping list',
      parameters: [
        { name: 'listName', type: 'string', required: true, description: 'Name for the list', example: 'Weekly groceries' }
      ],
      examples: ['Create a shopping list for the weekend']
    },
    {
      action: 'add-list-item',
      description: 'Add an item to a shopping list',
      parameters: [
        { name: 'listId', type: 'string', required: true, description: 'Shopping list ID' },
        { name: 'name', type: 'string', required: true, description: 'Item name' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity' }
      ],
      examples: ['Add bread to my shopping list']
    },
    {
      action: 'create-recipe-order',
      description: 'Create a delivery order for recipe ingredients',
      parameters: [
        { name: 'spoonacularRecipeId', type: 'number', required: true, description: 'Recipe ID from Spoonacular' },
        { name: 'checkInventory', type: 'boolean', required: false, description: 'Check inventory for existing items' }
      ],
      examples: ['Order ingredients for this recipe']
    }
  ],
  jobs: [
    {
      action: 'search',
      description: 'Search for job listings',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Job search query', example: 'software engineer' },
        { name: 'location', type: 'string', required: false, description: 'Job location', example: 'remote' }
      ],
      examples: ['Find remote software engineering jobs', 'Search for product manager positions in Tel Aviv']
    },
    {
      action: 'get-saved',
      description: 'Get saved job listings',
      parameters: [],
      examples: ['Show my saved jobs']
    },
    {
      action: 'extract-interview-questions',
      description: 'Extract interview questions from an image',
      parameters: [
        { name: 'imageUrl', type: 'string', required: true, description: 'URL of the image containing questions' }
      ],
      examples: ['Extract questions from this interview screenshot']
    }
  ],
  travel: [
    {
      action: 'search-flights',
      description: 'Search for flights between cities',
      parameters: [
        { name: 'origin', type: 'string', required: true, description: 'Origin city code', example: 'TLV' },
        { name: 'destination', type: 'string', required: true, description: 'Destination city code', example: 'BCN' },
        { name: 'departDate', type: 'string', required: true, description: 'Departure date', example: '2024-06-01' },
        { name: 'returnDate', type: 'string', required: false, description: 'Return date for round trip' }
      ],
      examples: ['Find flights from Tel Aviv to Barcelona', 'Search for flights to New York next week']
    },
    {
      action: 'plan-trip',
      description: 'Create an AI-generated trip itinerary',
      parameters: [
        { name: 'destination', type: 'string', required: true, description: 'Destination' },
        { name: 'duration', type: 'number', required: false, description: 'Trip duration in days' },
        { name: 'interests', type: 'array', required: false, description: 'Travel interests' }
      ],
      examples: ['Plan a 5-day trip to Rome', 'Create an itinerary for Tokyo focusing on food and culture']
    }
  ],
  todo: [
    {
      action: 'get-tasks',
      description: 'Get all tasks/todos',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, completed)' }
      ],
      examples: ['Show my tasks', 'What do I need to do today?']
    },
    {
      action: 'create-task',
      description: 'Create a new task',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Task title' },
        { name: 'description', type: 'string', required: false, description: 'Task description' },
        { name: 'dueDate', type: 'string', required: false, description: 'Due date' },
        { name: 'priority', type: 'string', required: false, description: 'Priority level' }
      ],
      examples: ['Add a task to call the dentist', 'Remind me to buy groceries tomorrow']
    },
    {
      action: 'complete-task',
      description: 'Mark a task as completed',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID to complete' }
      ],
      examples: ['Mark the dentist task as done']
    }
  ],
  shopping: [
    {
      action: 'search',
      description: 'Search for products and deals',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Product search query' },
        { name: 'maxPrice', type: 'number', required: false, description: 'Maximum price' }
      ],
      examples: ['Find deals on headphones', 'Search for the best price on a laptop']
    },
    {
      action: 'get-saved-deals',
      description: 'Get saved deals and watchlist items',
      parameters: [],
      examples: ['Show my saved deals', 'What products am I tracking?']
    }
  ],
  learning: [
    {
      action: 'search',
      description: 'Search for learning resources and tutorials',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Learning topic' },
        { name: 'type', type: 'string', required: false, description: 'Resource type (tutorial, course, article)' }
      ],
      examples: ['Find tutorials on React', 'Search for machine learning courses']
    },
    {
      action: 'get-saved',
      description: 'Get saved learning resources',
      parameters: [],
      examples: ['Show my saved learning resources']
    }
  ],
  news: [
    {
      action: 'get-feed',
      description: 'Get personalized news feed',
      parameters: [
        { name: 'topics', type: 'array', required: false, description: 'Filter by topics' }
      ],
      examples: ['Show me the latest tech news', 'What\'s happening in AI today?']
    },
    {
      action: 'search',
      description: 'Search for news articles',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' }
      ],
      examples: ['Search for news about climate change']
    }
  ],
  diy: [
    {
      action: 'generate-project',
      description: 'Generate a DIY project idea with instructions',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Project category' },
        { name: 'difficulty', type: 'string', required: false, description: 'Difficulty level' },
        { name: 'materials', type: 'array', required: false, description: 'Available materials' }
      ],
      examples: ['Give me a weekend woodworking project', 'DIY project for beginners with recycled materials']
    }
  ],
  email: [
    {
      action: 'process',
      description: 'Process and categorize emails',
      parameters: [
        { name: 'maxEmails', type: 'number', required: false, description: 'Maximum emails to process' }
      ],
      examples: ['Process my unread emails', 'Categorize my inbox']
    }
  ],
  problems: [
    {
      action: 'get-problem',
      description: 'Get a coding problem to practice',
      parameters: [
        { name: 'difficulty', type: 'string', required: false, description: 'Difficulty (easy, medium, hard)' },
        { name: 'topic', type: 'string', required: false, description: 'Problem topic' }
      ],
      examples: ['Give me a medium difficulty algorithm problem', 'Practice dynamic programming']
    }
  ]
};

// =============================================================================
// ORCHESTRATOR SERVICE
// =============================================================================

class AgentOrchestratorService {
  /**
   * Get all available agents with their capabilities
   */
  getAvailableAgents(): AgentInfo[] {
    const agents = agentRegistry.getAll();
    
    return agents.map(agent => ({
      id: agent.metadata.id,
      name: agent.metadata.name,
      description: agent.metadata.description,
      icon: agent.metadata.icon,
      color: agent.metadata.color,
      capabilities: AGENT_CAPABILITIES[agent.metadata.id] || [],
      keywords: AGENT_KEYWORDS[agent.metadata.id] || [],
      isAvailable: !agent.isRunning()
    }));
  }

  /**
   * Get agent keywords/hashtags
   */
  getAgentKeywords(agentId: AgentId): string[] {
    return AGENT_KEYWORDS[agentId] || [];
  }

  /**
   * Find agent by keyword/hashtag
   */
  findAgentByKeyword(keyword: string): AgentId | null {
    const normalizedKeyword = keyword.toLowerCase().startsWith('#')
      ? keyword.toLowerCase()
      : `#${keyword.toLowerCase()}`;

    for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
      if (keywords.some(k => k.toLowerCase() === normalizedKeyword)) {
        return agentId as AgentId;
      }
    }
    return null;
  }

  /**
   * Get capabilities for a specific agent
   */
  getAgentCapabilities(agentId: AgentId): AgentCapability[] {
    return AGENT_CAPABILITIES[agentId] || [];
  }

  /**
   * Get agent metadata
   */
  getAgentMetadata(agentId: AgentId): AgentMetadata | undefined {
    const agent = agentRegistry.get(agentId);
    return agent?.metadata;
  }

  /**
   * Execute an action on a specific agent
   */
  async executeAgentAction(
    agentId: AgentId,
    action: string,
    params: Record<string, unknown>,
    userId?: string
  ): Promise<AgentResult> {
    const agent = agentRegistry.get(agentId);
    
    if (!agent) {
      return { success: false, error: `Agent '${agentId}' not found` };
    }

    if (agent.isRunning()) {
      return { success: false, error: `Agent '${agentId}' is currently busy` };
    }

    try {
      logger.agent(`Executing ${agentId}.${action}`, { params });
      
      const result = await agent.execute({
        action,
        userId,
        ...params
      });

      logger.agent(`Completed ${agentId}.${action}`, { success: result.success });
      return result;
    } catch (error: any) {
      logger.fail(`Agent execution failed: ${agentId}.${action}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a multi-step workflow
   */
  async executeWorkflow(
    steps: WorkflowStep[],
    userId?: string,
    onProgress?: (step: WorkflowStep) => void
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const maxSteps = configService.get('assistant.workflow.maxSteps', 10);

    if (steps.length > maxSteps) {
      return {
        success: false,
        steps,
        error: `Workflow exceeds maximum of ${maxSteps} steps`
      };
    }

    const completedSteps: Map<string, AgentResult> = new Map();

    for (const step of steps) {
      // Check dependencies
      if (step.dependsOn) {
        const unmetDeps = step.dependsOn.filter(depId => !completedSteps.has(depId));
        if (unmetDeps.length > 0) {
          step.status = 'skipped';
          step.error = `Unmet dependencies: ${unmetDeps.join(', ')}`;
          continue;
        }
      }

      step.status = 'running';
      onProgress?.(step);

      try {
        const result = await this.executeAgentAction(
          step.agentId,
          step.action,
          step.params,
          userId
        );

        step.result = result;
        step.status = result.success ? 'completed' : 'failed';
        
        if (result.success) {
          completedSteps.set(step.id, result);
        } else {
          step.error = result.error;
        }
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;
      }

      onProgress?.(step);
    }

    const allSucceeded = steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const duration = Date.now() - startTime;

    return {
      success: allSucceeded,
      steps,
      duration
    };
  }

  /**
   * Build a capabilities prompt for AI to understand available actions
   */
  buildCapabilitiesPrompt(): string {
    const agents = this.getAvailableAgents();
    
    let prompt = 'You have access to the following agents and their capabilities:\n\n';

    for (const agent of agents) {
      if (agent.capabilities.length === 0) continue;

      prompt += `## ${agent.icon} ${agent.name} (${agent.id})\n`;
      prompt += `${agent.description}\n\n`;
      prompt += 'Actions:\n';

      for (const cap of agent.capabilities) {
        prompt += `- **${cap.action}**: ${cap.description}\n`;
        
        if (cap.parameters.length > 0) {
          const required = cap.parameters.filter(p => p.required);
          const optional = cap.parameters.filter(p => !p.required);
          
          if (required.length > 0) {
            prompt += `  Required: ${required.map(p => `${p.name} (${p.type})`).join(', ')}\n`;
          }
          if (optional.length > 0) {
            prompt += `  Optional: ${optional.map(p => `${p.name} (${p.type})`).join(', ')}\n`;
          }
        }
      }

      prompt += '\n';
    }

    return prompt;
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
export default agentOrchestratorService;
