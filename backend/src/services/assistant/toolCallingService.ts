/**
 * Tool Calling Service
 *
 * Provides Claude tool definitions for all agents and handles tool execution.
 * Uses Claude's native tool_use capability for accurate intent detection
 * and direct action execution.
 *
 * Security features:
 * - Input validation with Zod schemas
 * - Sanitized error responses
 * - Tool name whitelisting
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { z } from 'zod';
import { agentRegistry } from '../../agents/AgentRegistry';
import type { AgentId } from '../../agents/types';
import { agentOrchestratorService } from './agentOrchestratorService';
import logger from '../../utils/logger';
import { configService } from '../core/configService';

// =============================================================================
// TYPES
// =============================================================================

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schemas for validating tool inputs
 * Prevents injection attacks and ensures type safety
 */
const ToolInputSchemas: Record<string, z.ZodSchema> = {
  // Cooking tools
  cooking_find_recipes: z.object({
    query: z.string().max(200).optional(),
    cuisine: z.string().max(50).optional(),
    useAvailableOnly: z.boolean().optional(),
    ingredients: z.array(z.string().max(50)).max(20).optional()
  }),
  cooking_get_inventory: z.object({
    category: z.string().max(50).optional()
  }),
  cooking_add_item: z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().positive().max(10000).optional(),
    category: z.string().max(50).optional(),
    unit: z.string().max(20).optional()
  }),
  cooking_order_groceries: z.object({
    preferredStores: z.array(z.string().max(50)).max(10).optional(),
    groceryItems: z.array(z.object({
      name: z.string().max(100),
      quantity: z.number().positive().max(100).optional()
    })).max(50).optional()
  }),
  cooking_rami_levy_search: z.object({
    query: z.string().min(1).max(100),
    limit: z.number().positive().max(50).optional()
  }),
  cooking_rami_levy_add_to_cart: z.object({
    productId: z.string().min(1).max(50),
    quantity: z.number().positive().max(100).optional()
  }),
  cooking_rami_levy_status: z.object({}),

  // Jobs tools
  jobs_search: z.object({
    query: z.string().min(1).max(200),
    location: z.string().max(100).optional(),
    remote: z.boolean().optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']).optional()
  }),
  jobs_get_saved: z.object({}),
  jobs_get_company_info: z.object({
    companyName: z.string().min(1).max(100)
  }),

  // Travel tools
  travel_search_flights: z.object({
    origin: z.string().min(1).max(50),
    destination: z.string().min(1).max(50),
    departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    passengers: z.number().positive().max(9).optional()
  }),
  travel_search_hotels: z.object({
    destination: z.string().min(1).max(100),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().positive().max(10).optional()
  }),
  travel_plan_trip: z.object({
    destination: z.string().min(1).max(100),
    duration: z.number().positive().max(30).optional(),
    interests: z.array(z.string().max(50)).max(10).optional(),
    budget: z.enum(['budget', 'moderate', 'luxury']).optional()
  }),
  travel_get_weather: z.object({
    destination: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),

  // Todo tools
  todo_get_tasks: z.object({
    status: z.enum(['pending', 'completed', 'all']).optional(),
    category: z.string().max(50).optional()
  }),
  todo_create_task: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    category: z.string().max(50).optional()
  }),
  todo_complete_task: z.object({
    taskId: z.string().min(1).max(50)
  }),
  todo_get_agenda: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),

  // Shopping tools
  shopping_search: z.object({
    query: z.string().min(1).max(200),
    maxPrice: z.number().positive().max(1000000).optional(),
    stores: z.array(z.string().max(50)).max(10).optional()
  }),
  shopping_get_deals: z.object({
    category: z.string().max(50).optional()
  }),

  // Learning tools
  learning_search: z.object({
    query: z.string().min(1).max(200),
    type: z.enum(['tutorial', 'article', 'course', 'documentation']).optional()
  }),
  learning_summarize: z.object({
    topic: z.string().max(200).optional(),
    url: z.string().url().max(500).optional()
  }),

  // Problems tools
  problems_search: z.object({
    query: z.string().max(200).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    source: z.enum(['leetcode', 'codeforces', 'curated']).optional(),
    list: z.string().max(50).optional()
  }),
  problems_evaluate_code: z.object({
    code: z.string().min(1).max(50000),
    problemId: z.string().max(50).optional(),
    language: z.string().max(30).optional()
  }),

  // Email tools
  email_process: z.object({
    maxEmails: z.number().positive().max(100).optional()
  }),
  email_get_unread: z.object({
    limit: z.number().positive().max(100).optional()
  }),

  // News tools
  news_get_feed: z.object({
    topics: z.array(z.string().max(50)).max(10).optional()
  }),
  news_search: z.object({
    query: z.string().min(1).max(200)
  }),

  // DIY tools
  diy_generate_project: z.object({
    category: z.string().max(50).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    materials: z.array(z.string().max(50)).max(20).optional()
  }),

  // Web search
  web_search: z.object({
    query: z.string().min(1).max(200),
    type: z.enum(['general', 'news', 'recipes', 'products', 'code']).optional()
  })
};

/**
 * Validate tool input against schema
 */
function validateToolInput(
  toolName: string,
  input: Record<string, unknown>
): { valid: boolean; error?: string; sanitized: Record<string, unknown> } {
  const schema = ToolInputSchemas[toolName];

  if (!schema) {
    // No schema defined - use basic sanitization
    return {
      valid: true,
      sanitized: sanitizeInput(input)
    };
  }

  try {
    const result = schema.safeParse(input);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${String(i.path.join('.'))}: ${i.message}`).join(', ');
      return { valid: false, error: `Invalid input: ${errors}`, sanitized: {} };
    }
    return { valid: true, sanitized: result.data as Record<string, unknown> };
  } catch {
    return { valid: false, error: 'Input validation failed', sanitized: {} };
  }
}

/**
 * Basic input sanitization for unschemaed tools
 */
function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    // Skip dangerous keys
    if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
      continue;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      // Limit string length
      sanitized[key] = value.slice(0, 10000);
    } else if (Array.isArray(value)) {
      // Limit array length
      sanitized[key] = value.slice(0, 100);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects (limit depth)
      sanitized[key] = sanitizeInput(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize error messages to prevent information leakage
 */
function sanitizeToolError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Check for safe error patterns
  const safePatterns = [
    /^Unknown tool:/,
    /^Agent not found:/,
    /^Invalid input:/,
    /^Tool .* not configured$/,
    /^No search service configured$/,
  ];

  for (const pattern of safePatterns) {
    if (pattern.test(message)) {
      return message;
    }
  }

  // Log the actual error
  logger.error('Tool execution error (sanitized)', { originalError: message });

  // Return generic message
  return 'Tool execution failed. Please try again.';
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
    // CROSS-CALL TOOL (invoke any agent action from within a tool loop)
    // =========================================================================
    {
      name: 'agent_cross_call',
      description: 'Invoke an action on a different agent. Use this when the current task requires coordination across agents — e.g., after finding a recipe, order its ingredients; after searching jobs, create a follow-up task. Provide the target agentId, the action name, and any required parameters.',
      input_schema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            enum: ['cooking', 'jobs', 'travel', 'todo', 'shopping', 'learning', 'news', 'diy', 'email', 'problems'],
            description: 'The target agent to invoke'
          },
          action: {
            type: 'string',
            description: 'The action to execute on the target agent (must be a valid action for that agent)'
          },
          params: {
            type: 'object',
            description: 'Parameters to pass to the agent action'
          }
        },
        required: ['agentId', 'action']
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
 * Includes input validation and sanitized error handling
 */
export const executeTool = async (
  toolName: string,
  input: Record<string, unknown>,
  userId?: string
): Promise<ToolExecutionResult> => {
  // Validate tool name is in whitelist
  const isValidTool = toolName === 'web_search' || toolName === 'agent_cross_call' || toolName in TOOL_MAPPING;
  if (!isValidTool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`
    };
  }

  // Validate and sanitize input
  const validation = validateToolInput(toolName, input);
  if (!validation.valid) {
    logger.warn(`Tool input validation failed: ${toolName}`, { error: validation.error });
    return {
      success: false,
      error: validation.error || 'Invalid input'
    };
  }

  const sanitizedInput = validation.sanitized || input;
  logger.agent(`Executing tool: ${toolName}`, { input: sanitizedInput });

  // Handle web search specially
  if (toolName === 'web_search') {
    return executeWebSearch(sanitizedInput as { query: string; type?: string });
  }

  // Handle cross-call: route to any agent dynamically
  if (toolName === 'agent_cross_call') {
    return executeCrossCall(sanitizedInput, userId);
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
    // Execute the agent action with validated input
    const result = await agent.execute({
      action: mapping.action,
      userId,
      ...sanitizedInput
    });

    return {
      success: result.success,
      data: result.data,
      error: result.error ? sanitizeToolError(result.error) : undefined
    };
  } catch (error: unknown) {
    logger.fail(`Tool execution failed: ${toolName}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: sanitizeToolError(error)
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
// CROSS-CALL EXECUTION
// =============================================================================

/**
 * Derive valid agent IDs from the registry at runtime.
 * Lazy-initialized on first use to allow all agents to register first.
 */
let _validAgentIds: Set<string> | null = null;
const getValidAgentIds = (): Set<string> => {
  if (!_validAgentIds) {
    _validAgentIds = new Set(
      agentRegistry.getAll()
        .map(agent => agent.metadata.id)
        .filter(id => id !== 'assistant') // assistant is not a cross-call target
    );
  }
  return _validAgentIds;
};

/**
 * Execute a cross-call: invoke an action on a target agent.
 * Validates the agentId and action against the orchestrator's capability registry.
 */
const executeCrossCall = async (
  input: Record<string, unknown>,
  userId?: string
): Promise<ToolExecutionResult> => {
  const targetAgentId = String(input.agentId || '');
  const targetAction = String(input.action || '');
  const targetParams = (input.params && typeof input.params === 'object')
    ? input.params as Record<string, unknown>
    : {};

  if (!getValidAgentIds().has(targetAgentId)) {
    return { success: false, error: `Invalid agent: ${targetAgentId}` };
  }

  // Validate the action exists in the agent's capabilities
  const capabilities = agentOrchestratorService.getAgentCapabilities(targetAgentId as AgentId);
  if (!capabilities.some(cap => cap.action === targetAction)) {
    const availableActions = capabilities.map(c => c.action).join(', ');
    return {
      success: false,
      error: `Invalid action '${targetAction}' for agent '${targetAgentId}'. Available: ${availableActions}`
    };
  }

  logger.agent(`Cross-call: ${targetAgentId}.${targetAction}`, { params: targetParams });

  try {
    const result = await agentOrchestratorService.executeAgentAction(
      targetAgentId as AgentId,
      targetAction,
      targetParams,
      userId
    );

    return {
      success: result.success,
      data: result.data,
      error: result.error ? sanitizeToolError(result.error) : undefined
    };
  } catch (error: unknown) {
    logger.fail(`Cross-call failed: ${targetAgentId}.${targetAction}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: sanitizeToolError(error)
    };
  }
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
      interface SearchResult {
        title: string;
        link: string;
        snippet: string;
      }

      const results = await googleSearchService.search(params.query, 'general', { maxResults: configService.get('limits.assistant.toolCalling.googleSearch.maxResults', 5) as number });

      return {
        success: true,
        data: {
          results: (results as SearchResult[]).map((item) => ({
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
  } catch (error: unknown) {
    logger.fail('Web search failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: sanitizeToolError(error)
    };
  }
};

export default {
  createAgentTools,
  executeTool,
  executeToolsParallel
};
