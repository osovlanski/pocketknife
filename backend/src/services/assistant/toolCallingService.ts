/**
 * Tool Calling Service
 *
 * Provides Claude tool definitions for all agents and handles tool execution.
 * Uses Claude's native tool_use capability for accurate intent detection
 * and direct action execution.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { agentRegistry } from '../../agents/AgentRegistry';
import type { AgentId } from '../../agents/types';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Define tools for Claude based on agent capabilities
 * These map directly to agent actions
 */
export const createAgentTools = (): Tool[] => {
  return [
    // =========================================================================
    // COOKING AGENT TOOLS
    // =========================================================================
    {
      name: 'cooking_find_recipes',
      description: 'Search for recipes based on ingredients, cuisine, or dietary preferences. Can use ingredients from the user\'s kitchen inventory.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Recipe search query (e.g., "pasta", "chicken dinner", "vegan breakfast")'
          },
          cuisine: {
            type: 'string',
            description: 'Cuisine type (e.g., "italian", "asian", "mexican")'
          },
          useAvailableOnly: {
            type: 'boolean',
            description: 'Only use ingredients from user\'s inventory'
          },
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific ingredients to use in the recipe'
          }
        }
      }
    },
    {
      name: 'cooking_get_inventory',
      description: 'Get items from the user\'s kitchen inventory. Can filter by category.',
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category (e.g., "dairy", "vegetables", "meat")'
          }
        }
      }
    },
    {
      name: 'cooking_add_item',
      description: 'Add an item to the kitchen inventory',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Item name'
          },
          quantity: {
            type: 'number',
            description: 'Quantity'
          },
          category: {
            type: 'string',
            description: 'Category (e.g., "dairy", "produce", "meat")'
          },
          unit: {
            type: 'string',
            description: 'Unit of measurement (e.g., "kg", "liters", "pieces")'
          }
        },
        required: ['name']
      }
    },
    {
      name: 'cooking_order_groceries',
      description: 'Order groceries from various stores. Gathers items from low stock, suggestions, and shopping lists.',
      input_schema: {
        type: 'object',
        properties: {
          preferredStores: {
            type: 'array',
            items: { type: 'string' },
            description: 'Preferred store IDs (wolt, shufersal, rami-levy, victory)'
          },
          groceryItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' }
              }
            },
            description: 'Specific items to order'
          }
        }
      }
    },
    {
      name: 'cooking_rami_levy_search',
      description: 'Search for products in Rami Levy grocery store',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product search query'
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'cooking_rami_levy_add_to_cart',
      description: 'Add a product to the Rami Levy shopping cart',
      input_schema: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Product ID from search results'
          },
          quantity: {
            type: 'number',
            description: 'Quantity to add'
          }
        },
        required: ['productId']
      }
    },
    {
      name: 'cooking_rami_levy_status',
      description: 'Check if Rami Levy integration is configured and working',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },

    // =========================================================================
    // JOBS AGENT TOOLS
    // =========================================================================
    {
      name: 'jobs_search',
      description: 'Search for job listings across multiple platforms (LinkedIn, Glassdoor, Indeed, RemoteOK)',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Job search query (e.g., "software engineer", "product manager")'
          },
          location: {
            type: 'string',
            description: 'Job location (e.g., "remote", "Tel Aviv", "New York")'
          },
          remote: {
            type: 'boolean',
            description: 'Filter for remote jobs only'
          },
          experienceLevel: {
            type: 'string',
            description: 'Experience level (junior, mid, senior, lead)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'jobs_get_saved',
      description: 'Get the user\'s saved job listings',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'jobs_get_company_info',
      description: 'Get detailed information about a company (size, funding, culture)',
      input_schema: {
        type: 'object',
        properties: {
          companyName: {
            type: 'string',
            description: 'Company name to look up'
          }
        },
        required: ['companyName']
      }
    },

    // =========================================================================
    // TRAVEL AGENT TOOLS
    // =========================================================================
    {
      name: 'travel_search_flights',
      description: 'Search for flights between cities',
      input_schema: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'Origin city or airport code (e.g., "TLV", "New York")'
          },
          destination: {
            type: 'string',
            description: 'Destination city or airport code'
          },
          departDate: {
            type: 'string',
            description: 'Departure date (YYYY-MM-DD)'
          },
          returnDate: {
            type: 'string',
            description: 'Return date for round trip (YYYY-MM-DD)'
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers'
          }
        },
        required: ['origin', 'destination', 'departDate']
      }
    },
    {
      name: 'travel_search_hotels',
      description: 'Search for hotels in a destination',
      input_schema: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Destination city'
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date (YYYY-MM-DD)'
          },
          checkOut: {
            type: 'string',
            description: 'Check-out date (YYYY-MM-DD)'
          },
          guests: {
            type: 'number',
            description: 'Number of guests'
          }
        },
        required: ['destination', 'checkIn', 'checkOut']
      }
    },
    {
      name: 'travel_plan_trip',
      description: 'Create an AI-generated trip itinerary with activities and recommendations',
      input_schema: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Trip destination'
          },
          duration: {
            type: 'number',
            description: 'Trip duration in days'
          },
          interests: {
            type: 'array',
            items: { type: 'string' },
            description: 'Travel interests (e.g., "food", "culture", "adventure")'
          },
          budget: {
            type: 'string',
            description: 'Budget level (budget, moderate, luxury)'
          }
        },
        required: ['destination']
      }
    },
    {
      name: 'travel_get_weather',
      description: 'Get weather forecast for a destination',
      input_schema: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Destination city'
          },
          date: {
            type: 'string',
            description: 'Date for weather forecast (YYYY-MM-DD)'
          }
        },
        required: ['destination']
      }
    },

    // =========================================================================
    // TODO AGENT TOOLS
    // =========================================================================
    {
      name: 'todo_get_tasks',
      description: 'Get all tasks/todos for the user',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'all'],
            description: 'Filter by status'
          },
          category: {
            type: 'string',
            description: 'Filter by category'
          }
        }
      }
    },
    {
      name: 'todo_create_task',
      description: 'Create a new task/todo',
      input_schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Task title'
          },
          description: {
            type: 'string',
            description: 'Task description'
          },
          dueDate: {
            type: 'string',
            description: 'Due date (YYYY-MM-DD)'
          },
          dueTime: {
            type: 'string',
            description: 'Due time (HH:MM)'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Task priority'
          },
          category: {
            type: 'string',
            description: 'Task category (work, personal, health, etc.)'
          }
        },
        required: ['title']
      }
    },
    {
      name: 'todo_complete_task',
      description: 'Mark a task as completed',
      input_schema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID to complete'
          }
        },
        required: ['taskId']
      }
    },
    {
      name: 'todo_get_agenda',
      description: 'Get the user\'s daily agenda with tasks organized by date',
      input_schema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date for agenda (YYYY-MM-DD, defaults to today)'
          }
        }
      }
    },

    // =========================================================================
    // SHOPPING AGENT TOOLS
    // =========================================================================
    {
      name: 'shopping_search',
      description: 'Search for products and deals across multiple stores',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product search query'
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum price filter'
          },
          stores: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific stores to search (zap, ksp, ebay, aliexpress)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'shopping_get_deals',
      description: 'Get current deals and discounts',
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Product category to filter'
          }
        }
      }
    },

    // =========================================================================
    // LEARNING AGENT TOOLS
    // =========================================================================
    {
      name: 'learning_search',
      description: 'Search for learning resources, tutorials, and educational content',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Learning topic or search query'
          },
          type: {
            type: 'string',
            enum: ['tutorial', 'article', 'course', 'documentation'],
            description: 'Type of resource'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'learning_summarize',
      description: 'Get an AI summary of a topic or article',
      input_schema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic to summarize'
          },
          url: {
            type: 'string',
            description: 'Article URL to summarize'
          }
        }
      }
    },

    // =========================================================================
    // PROBLEMS AGENT TOOLS
    // =========================================================================
    {
      name: 'problems_search',
      description: 'Search for coding problems from LeetCode, Codeforces, and curated lists',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Problem search query or topic'
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            description: 'Difficulty level'
          },
          source: {
            type: 'string',
            enum: ['leetcode', 'codeforces', 'curated'],
            description: 'Problem source'
          },
          list: {
            type: 'string',
            description: 'Curated list name (blind75, neetcode150, grind75)'
          }
        }
      }
    },
    {
      name: 'problems_evaluate_code',
      description: 'Evaluate a code solution for correctness, efficiency, and quality',
      input_schema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to evaluate'
          },
          problemId: {
            type: 'string',
            description: 'Problem ID for context'
          },
          language: {
            type: 'string',
            description: 'Programming language'
          }
        },
        required: ['code']
      }
    },

    // =========================================================================
    // EMAIL AGENT TOOLS
    // =========================================================================
    {
      name: 'email_process',
      description: 'Process and categorize emails from inbox',
      input_schema: {
        type: 'object',
        properties: {
          maxEmails: {
            type: 'number',
            description: 'Maximum number of emails to process'
          }
        }
      }
    },
    {
      name: 'email_get_unread',
      description: 'Get unread emails from inbox',
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of emails to return'
          }
        }
      }
    },

    // =========================================================================
    // NEWS AGENT TOOLS
    // =========================================================================
    {
      name: 'news_get_feed',
      description: 'Get personalized news feed',
      input_schema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Topics to filter (tech, business, science, etc.)'
          }
        }
      }
    },
    {
      name: 'news_search',
      description: 'Search for news articles',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          }
        },
        required: ['query']
      }
    },

    // =========================================================================
    // DIY AGENT TOOLS
    // =========================================================================
    {
      name: 'diy_generate_project',
      description: 'Generate a DIY project idea with instructions',
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Project category (woodworking, electronics, crafts)'
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Difficulty level'
          },
          materials: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available materials'
          }
        }
      }
    },

    // =========================================================================
    // WEB SEARCH TOOL
    // =========================================================================
    {
      name: 'web_search',
      description: 'Search the web for information. Use this for current events, recent data, or when you need external information.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          type: {
            type: 'string',
            enum: ['general', 'news', 'recipes', 'products', 'code'],
            description: 'Type of search'
          }
        },
        required: ['query']
      }
    }
  ];
};

// =============================================================================
// TOOL EXECUTION
// =============================================================================

/**
 * Map tool names to agent IDs and actions
 */
const TOOL_MAPPING: Record<string, { agentId: AgentId; action: string }> = {
  // Cooking
  cooking_find_recipes: { agentId: 'cooking', action: 'find-recipes' },
  cooking_get_inventory: { agentId: 'cooking', action: 'get-items' },
  cooking_add_item: { agentId: 'cooking', action: 'add-item' },
  cooking_order_groceries: { agentId: 'cooking', action: 'order-groceries' },
  cooking_rami_levy_search: { agentId: 'cooking', action: 'rami-levy-search' },
  cooking_rami_levy_add_to_cart: { agentId: 'cooking', action: 'rami-levy-add-to-cart' },
  cooking_rami_levy_status: { agentId: 'cooking', action: 'rami-levy-status' },

  // Jobs
  jobs_search: { agentId: 'jobs', action: 'search' },
  jobs_get_saved: { agentId: 'jobs', action: 'get-saved' },
  jobs_get_company_info: { agentId: 'jobs', action: 'get-company-info' },

  // Travel
  travel_search_flights: { agentId: 'travel', action: 'search-flights' },
  travel_search_hotels: { agentId: 'travel', action: 'search-hotels' },
  travel_plan_trip: { agentId: 'travel', action: 'plan-trip' },
  travel_get_weather: { agentId: 'travel', action: 'get-weather' },

  // Todo
  todo_get_tasks: { agentId: 'todo', action: 'get-tasks' },
  todo_create_task: { agentId: 'todo', action: 'create-task' },
  todo_complete_task: { agentId: 'todo', action: 'complete-task' },
  todo_get_agenda: { agentId: 'todo', action: 'get-agenda' },

  // Shopping
  shopping_search: { agentId: 'shopping', action: 'search' },
  shopping_get_deals: { agentId: 'shopping', action: 'get-deals' },

  // Learning
  learning_search: { agentId: 'learning', action: 'search' },
  learning_summarize: { agentId: 'learning', action: 'summarize' },

  // Problems
  problems_search: { agentId: 'problems', action: 'search' },
  problems_evaluate_code: { agentId: 'problems', action: 'evaluate' },

  // Email
  email_process: { agentId: 'email', action: 'process' },
  email_get_unread: { agentId: 'email', action: 'get-unread' },

  // News
  news_get_feed: { agentId: 'news', action: 'get-feed' },
  news_search: { agentId: 'news', action: 'search' },

  // DIY
  diy_generate_project: { agentId: 'diy', action: 'generate-project' }
};

/**
 * Execute a tool call by routing to the appropriate agent
 */
export const executeTool = async (
  toolName: string,
  input: Record<string, unknown>,
  userId?: string
): Promise<ToolExecutionResult> => {
  logger.agent(`Executing tool: ${toolName}`, { input });

  // Handle web search specially
  if (toolName === 'web_search') {
    return executeWebSearch(input as { query: string; type?: string });
  }

  // Look up the agent mapping
  const mapping = TOOL_MAPPING[toolName];
  if (!mapping) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`
    };
  }

  // Get the agent
  const agent = agentRegistry.get(mapping.agentId);
  if (!agent) {
    return {
      success: false,
      error: `Agent not found: ${mapping.agentId}`
    };
  }

  try {
    // Execute the agent action
    const result = await agent.execute({
      action: mapping.action,
      userId,
      ...input
    });

    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error: any) {
    logger.fail(`Tool execution failed: ${toolName}`, { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Execute multiple tools in parallel (for independent operations)
 */
export const executeToolsParallel = async (
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>,
  userId?: string
): Promise<Map<string, ToolExecutionResult>> => {
  const results = new Map<string, ToolExecutionResult>();

  // Group tools by dependency - currently all tools are independent
  // In future, could add dependency analysis

  const executions = toolCalls.map(async (call) => {
    const result = await executeTool(call.name, call.input, userId);
    results.set(call.name, result);
  });

  await Promise.all(executions);
  return results;
};

// =============================================================================
// WEB SEARCH (Fallback)
// =============================================================================

/**
 * Execute web search using available search service
 */
const executeWebSearch = async (
  params: { query: string; type?: string }
): Promise<ToolExecutionResult> => {
  try {
    // Try to use Google Search Service
    const { googleSearchService } = await import('../core/googleSearchService');

    if (googleSearchService.isConfigured) {
      const results = await googleSearchService.search(params.query, 'general', { maxResults: 5 });

      return {
        success: true,
        data: {
          results: results.map((item: { title: string; link: string; snippet: string }) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
          })) || []
        }
      };
    }

    // Fallback to Perplexity if available
    const { perplexityService } = await import('../integrations/perplexityService');
    if (perplexityService.isConfigured()) {
      const result = await perplexityService.search(params.query);
      return {
        success: true,
        data: result
      };
    }

    return {
      success: false,
      error: 'No search service configured'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  createAgentTools,
  executeTool,
  executeToolsParallel
};
