/**
 * Agent Validation Schemas
 * 
 * Zod schemas for validating agent inputs.
 * Import these schemas in agent classes and register them in validationSchemas.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/** Common pagination schema */
export const PaginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20)
});

/** Common date range schema */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate must be before endDate' }
);

// =============================================================================
// EMAIL AGENT SCHEMAS
// =============================================================================

export const EmailAgentSchemas = {
  processEmails: z.object({
    action: z.literal('processEmails'),
    userId: z.string().min(1).optional(),
    batchSize: z.number().int().positive().max(500).optional().default(50),
    forceRefresh: z.boolean().optional().default(false)
  }),
  
  classify: z.object({
    action: z.literal('classify'),
    userId: z.string().min(1).optional(),
    emailIds: z.array(z.string().min(1)).optional()
  }),
  
  organize: z.object({
    action: z.literal('organize'),
    userId: z.string().min(1).optional(),
    targetFolder: z.string().optional(),
    criteria: z.object({
      labels: z.array(z.string()).optional(),
      age: z.number().optional(),
      sender: z.string().optional()
    }).optional()
  }),
  
  stats: z.object({
    action: z.literal('stats'),
    userId: z.string().min(1).optional(),
    period: z.enum(['day', 'week', 'month', 'year']).optional().default('week')
  })
};

// =============================================================================
// JOBS AGENT SCHEMAS
// =============================================================================

export const JobsAgentSchemas = {
  search: z.object({
    action: z.literal('search'),
    userId: z.string().min(1).optional(),
    query: z.string().min(1, 'Search query is required'),
    location: z.string().optional(),
    remote: z.boolean().optional(),
    salary: z.object({
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
      currency: z.string().length(3).optional()
    }).optional(),
    experience: z.enum(['entry', 'mid', 'senior', 'lead', 'principal']).optional(),
    sources: z.array(z.string()).optional(),
    limit: z.number().int().positive().max(100).optional().default(20)
  }),
  
  matchCv: z.object({
    action: z.literal('matchCv'),
    userId: z.string().min(1).optional(),
    cvText: z.string().min(50, 'CV text is too short'),
    jobIds: z.array(z.string()).optional(),
    matchThreshold: z.number().min(0).max(1).optional().default(0.7)
  }),
  
  saveJob: z.object({
    action: z.literal('saveJob'),
    userId: z.string().min(1, 'User ID is required'),
    jobId: z.string().min(1, 'Job ID is required'),
    notes: z.string().max(1000).optional()
  }),
  
  getSavedJobs: z.object({
    action: z.literal('getSavedJobs'),
    userId: z.string().min(1, 'User ID is required'),
    ...PaginationSchema.shape
  })
};

// =============================================================================
// NEWS AGENT SCHEMAS
// =============================================================================

export const NewsAgentSchemas = {
  fetchNews: z.object({
    action: z.literal('fetchNews'),
    userId: z.string().min(1).optional(),
    topics: z.array(z.string().min(1)).optional(),
    sources: z.array(z.string()).optional(),
    country: z.string().length(2).optional(),
    language: z.string().length(2).optional().default('en'),
    limit: z.number().int().positive().max(100).optional().default(20)
  }),
  
  getTrending: z.object({
    action: z.literal('getTrending'),
    userId: z.string().min(1).optional(),
    category: z.enum(['tech', 'business', 'science', 'health', 'sports', 'entertainment']).optional(),
    region: z.string().optional()
  }),
  
  saveArticle: z.object({
    action: z.literal('saveArticle'),
    userId: z.string().min(1, 'User ID is required'),
    articleUrl: z.string().url('Valid URL is required'),
    tags: z.array(z.string()).optional()
  }),
  
  recordInteraction: z.object({
    action: z.literal('recordInteraction'),
    userId: z.string().min(1, 'User ID is required'),
    articleId: z.string().min(1),
    interactionType: z.enum(['view', 'like', 'share', 'save', 'dismiss'])
  }),
  
  summarize: z.object({
    action: z.literal('summarize'),
    userId: z.string().min(1).optional(),
    articleUrl: z.string().url().optional(),
    articleText: z.string().min(100).optional()
  }).refine(
    (data) => data.articleUrl || data.articleText,
    { message: 'Either articleUrl or articleText is required' }
  )
};

// =============================================================================
// TODO AGENT SCHEMAS
// =============================================================================

export const TodoAgentSchemas = {
  createTask: z.object({
    action: z.literal('createTask'),
    userId: z.string().min(1, 'User ID is required'),
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    tags: z.array(z.string()).optional(),
    reminder: z.string().datetime().optional()
  }),
  
  updateTask: z.object({
    action: z.literal('updateTask'),
    userId: z.string().min(1, 'User ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    updates: z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      dueDate: z.string().datetime().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
      tags: z.array(z.string()).optional()
    })
  }),
  
  deleteTask: z.object({
    action: z.literal('deleteTask'),
    userId: z.string().min(1, 'User ID is required'),
    taskId: z.string().min(1, 'Task ID is required')
  }),
  
  listTasks: z.object({
    action: z.literal('listTasks'),
    userId: z.string().min(1, 'User ID is required'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'all']).optional().default('all'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    ...PaginationSchema.shape
  }),
  
  syncCalendar: z.object({
    action: z.literal('syncCalendar'),
    userId: z.string().min(1, 'User ID is required'),
    direction: z.enum(['push', 'pull', 'both']).optional().default('both')
  }),
  
  learnPatterns: z.object({
    action: z.literal('learnPatterns'),
    userId: z.string().min(1, 'User ID is required')
  })
};

// =============================================================================
// SHOPPING AGENT SCHEMAS
// =============================================================================

export const ShoppingAgentSchemas = {
  search: z.object({
    action: z.literal('search'),
    userId: z.string().min(1).optional(),
    query: z.string().min(1, 'Search query is required'),
    category: z.string().optional(),
    priceRange: z.object({
      min: z.number().nonnegative().optional(),
      max: z.number().positive().optional()
    }).optional(),
    sources: z.array(z.string()).optional(),
    sortBy: z.enum(['price_asc', 'price_desc', 'relevance', 'rating']).optional(),
    limit: z.number().int().positive().max(100).optional().default(20)
  }),
  
  trackPrice: z.object({
    action: z.literal('trackPrice'),
    userId: z.string().min(1, 'User ID is required'),
    productUrl: z.string().url('Valid product URL is required'),
    targetPrice: z.number().positive('Target price must be positive').optional(),
    notifyOnDrop: z.boolean().optional().default(true)
  }),
  
  findDeals: z.object({
    action: z.literal('findDeals'),
    userId: z.string().min(1).optional(),
    category: z.string().optional(),
    minDiscount: z.number().min(0).max(100).optional().default(20),
    limit: z.number().int().positive().max(50).optional().default(10)
  })
};

// =============================================================================
// COOKING AGENT SCHEMAS
// =============================================================================

export const CookingAgentSchemas = {
  addItem: z.object({
    action: z.literal('addItem'),
    userId: z.string().min(1, 'User ID is required'),
    item: z.object({
      name: z.string().min(1, 'Item name is required'),
      quantity: z.number().positive().optional().default(1),
      unit: z.string().optional(),
      expiryDate: z.string().datetime().optional(),
      category: z.enum(['produce', 'dairy', 'meat', 'frozen', 'pantry', 'beverages', 'other']).optional()
    })
  }),
  
  findRecipes: z.object({
    action: z.literal('findRecipes'),
    userId: z.string().min(1, 'User ID is required'),
    ingredients: z.array(z.string()).optional(),
    cuisine: z.string().optional(),
    maxCookTime: z.number().positive().optional(),
    dietary: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb'])).optional(),
    limit: z.number().int().positive().max(20).optional().default(10)
  }),
  
  getInventory: z.object({
    action: z.literal('getInventory'),
    userId: z.string().min(1, 'User ID is required'),
    category: z.string().optional(),
    expiringSoon: z.boolean().optional(),
    lowStock: z.boolean().optional()
  }),
  
  processInvoice: z.object({
    action: z.literal('processInvoice'),
    userId: z.string().min(1, 'User ID is required'),
    invoiceUrl: z.string().url().optional(),
    invoiceText: z.string().optional()
  }).refine(
    (data) => data.invoiceUrl || data.invoiceText,
    { message: 'Either invoiceUrl or invoiceText is required' }
  )
};

// =============================================================================
// DIY AGENT SCHEMAS
// =============================================================================

export const DiyAgentSchemas = {
  generateProject: z.object({
    action: z.literal('generateProject'),
    userId: z.string().min(1).optional(),
    description: z.string().min(10, 'Project description is too short'),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
    budget: z.object({
      max: z.number().positive(),
      currency: z.string().length(3).optional().default('USD')
    }).optional(),
    timeAvailable: z.string().optional(),
    tools: z.array(z.string()).optional()
  }),
  
  getMaterials: z.object({
    action: z.literal('getMaterials'),
    userId: z.string().min(1).optional(),
    projectId: z.string().min(1, 'Project ID is required'),
    location: z.string().optional()
  }),
  
  saveProject: z.object({
    action: z.literal('saveProject'),
    userId: z.string().min(1, 'User ID is required'),
    projectId: z.string().min(1, 'Project ID is required')
  }),
  
  getProjects: z.object({
    action: z.literal('getProjects'),
    userId: z.string().min(1, 'User ID is required'),
    status: z.enum(['planned', 'in_progress', 'completed', 'all']).optional().default('all'),
    ...PaginationSchema.shape
  })
};

// =============================================================================
// PROBLEMS AGENT SCHEMAS
// =============================================================================

export const ProblemsAgentSchemas = {
  search: z.object({
    action: z.literal('search'),
    userId: z.string().min(1).optional(),
    query: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    tags: z.array(z.string()).optional(),
    source: z.enum(['leetcode', 'codeforces', 'hackerrank', 'all']).optional().default('all'),
    limit: z.number().int().positive().max(50).optional().default(20)
  }),
  
  saveSolution: z.object({
    action: z.literal('saveSolution'),
    userId: z.string().min(1, 'User ID is required'),
    problemId: z.string().min(1, 'Problem ID is required'),
    solution: z.string().min(1, 'Solution code is required'),
    language: z.string().min(1, 'Programming language is required'),
    notes: z.string().max(2000).optional()
  }),
  
  evaluate: z.object({
    action: z.literal('evaluate'),
    userId: z.string().min(1).optional(),
    problemId: z.string().min(1, 'Problem ID is required'),
    solution: z.string().min(1, 'Solution code is required'),
    language: z.string().min(1, 'Programming language is required')
  }),
  
  getSolved: z.object({
    action: z.literal('getSolved'),
    userId: z.string().min(1, 'User ID is required'),
    ...PaginationSchema.shape
  })
};

// =============================================================================
// TRAVEL AGENT SCHEMAS
// =============================================================================

export const TravelAgentSchemas = {
  searchFlights: z.object({
    action: z.literal('searchFlights'),
    userId: z.string().min(1).optional(),
    origin: z.string().length(3, 'Origin must be a 3-letter airport code'),
    destination: z.string().length(3, 'Destination must be a 3-letter airport code'),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    passengers: z.number().int().positive().max(9).optional().default(1),
    cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
    maxPrice: z.number().positive().optional()
  }),
  
  searchHotels: z.object({
    action: z.literal('searchHotels'),
    userId: z.string().min(1).optional(),
    location: z.string().min(1, 'Location is required'),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().positive().max(10).optional().default(2),
    rooms: z.number().int().positive().max(5).optional().default(1),
    stars: z.number().int().min(1).max(5).optional(),
    maxPrice: z.number().positive().optional()
  }),
  
  planTrip: z.object({
    action: z.literal('planTrip'),
    userId: z.string().min(1).optional(),
    destination: z.string().min(1, 'Destination is required'),
    duration: z.number().int().positive().max(60),
    interests: z.array(z.string()).optional(),
    budget: z.object({
      total: z.number().positive(),
      currency: z.string().length(3).optional().default('USD')
    }).optional(),
    travelStyle: z.enum(['budget', 'moderate', 'luxury']).optional()
  }),
  
  saveTrip: z.object({
    action: z.literal('saveTrip'),
    userId: z.string().min(1, 'User ID is required'),
    tripData: z.record(z.unknown())
  })
};

// =============================================================================
// LEARNING AGENT SCHEMAS
// =============================================================================

export const LearningAgentSchemas = {
  search: z.object({
    action: z.literal('search'),
    userId: z.string().min(1).optional(),
    topic: z.string().min(1, 'Topic is required'),
    sources: z.array(z.enum(['devto', 'hackernews', 'reddit', 'youtube', 'github'])).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    contentType: z.enum(['article', 'video', 'tutorial', 'course', 'all']).optional().default('all'),
    limit: z.number().int().positive().max(50).optional().default(20)
  }),
  
  summarize: z.object({
    action: z.literal('summarize'),
    userId: z.string().min(1).optional(),
    url: z.string().url().optional(),
    text: z.string().min(100).optional(),
    format: z.enum(['brief', 'detailed', 'bullet_points']).optional().default('brief')
  }).refine(
    (data) => data.url || data.text,
    { message: 'Either url or text is required' }
  ),
  
  saveArticle: z.object({
    action: z.literal('saveArticle'),
    userId: z.string().min(1, 'User ID is required'),
    articleUrl: z.string().url('Valid URL is required'),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional()
  }),
  
  getHistory: z.object({
    action: z.literal('getHistory'),
    userId: z.string().min(1, 'User ID is required'),
    topic: z.string().optional(),
    ...PaginationSchema.shape
  })
};

// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export const AgentSchemas = {
  email: EmailAgentSchemas,
  jobs: JobsAgentSchemas,
  news: NewsAgentSchemas,
  todo: TodoAgentSchemas,
  shopping: ShoppingAgentSchemas,
  cooking: CookingAgentSchemas,
  diy: DiyAgentSchemas,
  problems: ProblemsAgentSchemas,
  travel: TravelAgentSchemas,
  learning: LearningAgentSchemas
};

export default AgentSchemas;

