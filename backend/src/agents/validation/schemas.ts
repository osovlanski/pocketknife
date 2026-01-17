/**
 * Zod Validation Schemas for Agent Parameters
 * 
 * Provides strict input validation for all agent actions.
 * Use these schemas to validate incoming parameters before processing.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const userIdSchema = z.string().min(1, 'User ID is required');

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0)
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, { message: 'dateFrom must be before dateTo' });

// =============================================================================
// SHOPPING AGENT SCHEMAS
// =============================================================================

export const shoppingSearchSchema = z.object({
  action: z.literal('search-products'),
  userId: userIdSchema,
  query: z.string().min(1, 'Search query is required').max(200),
  sources: z.array(z.enum(['ebay', 'amazon', 'aliexpress', 'israeli'])).optional(),
  filters: z.object({
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    category: z.string().optional(),
    source: z.string().optional(),
    minDiscount: z.number().min(0).max(100).optional(),
    minDealScore: z.number().min(0).max(100).optional()
  }).optional()
}).refine(data => {
  if (data.filters?.minPrice && data.filters?.maxPrice) {
    return data.filters.minPrice <= data.filters.maxPrice;
  }
  return true;
}, { message: 'minPrice must be less than or equal to maxPrice' });

export const shoppingHobbySchema = z.object({
  action: z.literal('search-by-hobby'),
  userId: userIdSchema,
  hobbies: z.array(z.string().min(1)).optional(),
  query: z.string().optional()
}).refine(data => data.hobbies?.length || data.query, {
  message: 'Either hobbies or query is required'
});

export const shoppingProductActionSchema = z.object({
  action: z.enum(['save-product', 'unsave-product']),
  userId: userIdSchema,
  productId: z.string().min(1, 'Product ID is required')
});

export const shoppingPriceAlertSchema = z.object({
  action: z.literal('set-price-alert'),
  userId: userIdSchema,
  productId: z.string().min(1, 'Product ID is required'),
  targetPrice: z.number().positive('Target price must be positive')
});

// =============================================================================
// JOBS AGENT SCHEMAS
// =============================================================================

export const jobsSearchSchema = z.object({
  action: z.literal('search'),
  userId: userIdSchema.optional(),
  query: z.string().min(1).max(200).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).optional()
});

export const jobsSaveSchema = z.object({
  action: z.literal('save-job'),
  userId: userIdSchema,
  jobData: z.object({
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    url: z.string().url().optional(),
    salary: z.string().optional(),
    description: z.string().optional()
  })
});

export const jobsInterviewSchema = z.object({
  action: z.enum(['extract-interview-questions', 'generate-answer', 'evaluate-answer']),
  userId: userIdSchema.optional(),
  imageBase64: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  language: z.string().optional()
});

// =============================================================================
// NEWS AGENT SCHEMAS
// =============================================================================

export const newsSearchSchema = z.object({
  action: z.literal('search'),
  userId: userIdSchema.optional(),
  query: z.string().min(1, 'Search query is required').max(200),
  topics: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  timeRange: z.enum(['today', 'week', 'month']).optional(),
  countryCode: z.string().length(2).optional(),
  maxResults: z.number().int().positive().max(50).optional()
});

export const newsFeedSchema = z.object({
  action: z.literal('get-feed'),
  userId: userIdSchema,
  limit: z.number().int().positive().max(50).optional()
});

export const newsInteractionSchema = z.object({
  action: z.literal('record-interaction'),
  userId: userIdSchema,
  articleId: z.string().min(1),
  articleUrl: z.string().url(),
  articleTitle: z.string().min(1),
  source: z.string().min(1),
  interactionType: z.enum(['view', 'read', 'like', 'save', 'share', 'dismiss']),
  readDuration: z.number().nonnegative().optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  topics: z.array(z.string()).optional()
});

// =============================================================================
// PROBLEMS AGENT SCHEMAS
// =============================================================================

export const problemsSolutionSchema = z.object({
  action: z.literal('save-solution'),
  userId: userIdSchema,
  problemData: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    source: z.string().min(1),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    topics: z.array(z.string()).optional(),
    companyTags: z.array(z.string()).optional()
  }),
  code: z.string().min(1, 'Code is required'),
  language: z.string().optional()
});

export const problemsSearchSchema = z.object({
  action: z.literal('search-solutions'),
  userId: userIdSchema.optional(),
  query: z.string().min(1, 'Query is required'),
  language: z.string().optional()
});

// =============================================================================
// TODO AGENT SCHEMAS
// =============================================================================

export const todoTaskSchema = z.object({
  action: z.literal('create-task'),
  userId: userIdSchema,
  taskData: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().datetime().optional(),
    dueTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    duration: z.number().int().positive().max(1440).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    syncEnabled: z.boolean().optional()
  })
});

export const todoUpdateSchema = z.object({
  action: z.literal('update-task'),
  userId: userIdSchema,
  taskId: z.string().min(1, 'Task ID is required'),
  taskData: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    dueDate: z.string().datetime().optional(),
    dueTime: z.string().optional(),
    duration: z.number().int().positive().max(1440).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});

// =============================================================================
// COOKING AGENT SCHEMAS
// =============================================================================

export const cookingItemSchema = z.object({
  action: z.literal('add-item'),
  userId: userIdSchema,
  itemData: z.object({
    name: z.string().min(1, 'Item name is required').max(100),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
    category: z.string().optional(),
    expiryDate: z.string().datetime().optional(),
    minStock: z.number().nonnegative().optional()
  })
});

export const cookingRecipeSearchSchema = z.object({
  action: z.literal('find-recipes'),
  userId: userIdSchema,
  recipeParams: z.object({
    query: z.string().optional(),
    cuisine: z.string().optional(),
    diet: z.string().optional(),
    maxReadyTime: z.number().int().positive().optional(),
    useInventory: z.boolean().optional()
  }).optional()
});

// =============================================================================
// TRAVEL AGENT SCHEMAS
// =============================================================================

export const travelSearchSchema = z.object({
  action: z.literal('search'),
  userId: userIdSchema.optional(),
  searchType: z.enum(['flights', 'hotels', 'both']).optional(),
  origin: z.string().min(2).max(10),
  destination: z.string().min(2).max(10),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().positive().max(9).optional(),
  children: z.number().int().nonnegative().max(9).optional(),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional()
});

export const travelPlanSchema = z.object({
  action: z.literal('generate-plan'),
  userId: userIdSchema.optional(),
  destination: z.string().min(1),
  duration: z.number().int().positive().max(30),
  budget: z.number().positive().optional(),
  interests: z.array(z.string()).optional(),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']).optional()
});

// =============================================================================
// LEARNING AGENT SCHEMAS
// =============================================================================

export const learningSearchSchema = z.object({
  action: z.literal('search'),
  userId: userIdSchema.optional(),
  query: z.string().min(1, 'Query is required').max(200),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(50).optional()
});

export const learningSummarizeSchema = z.object({
  action: z.literal('summarize'),
  userId: userIdSchema.optional(),
  url: z.string().url('Valid URL is required')
});

// =============================================================================
// DIY AGENT SCHEMAS
// =============================================================================

export const diyGenerateSchema = z.object({
  action: z.literal('generate'),
  userId: userIdSchema.optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  category: z.string().optional(),
  budget: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  timeAvailable: z.number().int().positive().optional(),
  existingTools: z.array(z.string()).optional()
});

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validate agent parameters against a schema
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(params);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format error messages
  const errors = result.error.errors.map(e => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
  
  return { success: false, error: errors.join('; ') };
}

/**
 * Create a validated action handler
 */
export function withValidation<T, R>(
  schema: z.ZodSchema<T>,
  handler: (params: T) => Promise<R>
): (params: unknown) => Promise<R> {
  return async (params: unknown) => {
    const validation = validateParams(schema, params);
    if (!validation.success) {
      throw new Error(`Validation error: ${validation.error}`);
    }
    return handler(validation.data);
  };
}

