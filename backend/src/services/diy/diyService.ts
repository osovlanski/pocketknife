/**
 * DIY Service
 * 
 * Provides AI-generated instructions for DIY projects, including:
 * - Step-by-step instructions
 * - Materials and tools lists
 * - Shopping integration for purchasing materials
 * - Cost estimates
 * 
 * Integrates with Shopping Agent for material purchasing.
 */

import { getPrisma } from '../core/databaseService';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import claudeService from '../core/claudeService';
import { israeliShopsService, zapScraperService } from '../shopping';
import { 
  DIY_CATEGORIES, 
  SKILL_LEVELS, 
  DIFFICULTY_LEVELS,
  SkillLevelId, 
  DifficultyLevel,
  DIYCategoryId
} from '../../types/constants';

// =============================================================================
// TYPES
// =============================================================================

export interface DIYProjectRequest {
  description: string;
  category?: DIYCategoryId | string;
  budget?: number;
  currency?: string;
  skillLevel?: SkillLevelId;
  timeAvailable?: number; // hours
  existingTools?: string[];
}

export interface DIYMaterial {
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  currency?: string;
  purchaseUrl?: string;
  alternatives?: string[];
  notes?: string;
}

export interface DIYTool {
  name: string;
  required: boolean;
  alternatives?: string[];
  rentalOption?: string;
  notes?: string;
}

export interface DIYStep {
  step: number;
  title: string;
  description: string;
  tips?: string[];
  warnings?: string[];
  imageUrl?: string;
  duration?: number; // minutes
}

export interface DIYProject {
  id?: string;
  title: string;
  description: string;
  category: DIYCategoryId | string;
  difficulty: DifficultyLevel;
  estimatedTime: number; // minutes
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  instructions: DIYStep[];
  materials: DIYMaterial[];
  tools: DIYTool[];
  tips: string[];
  warnings: string[];
  videoUrl?: string;
  sourceUrl?: string;
}

export interface DIYSearchResult {
  id: string;
  title: string;
  description: string;
  category: DIYCategoryId | string;
  difficulty: DifficultyLevel | string;
  estimatedTime: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  popularity?: number;
  whyItsAwesome?: string;
  tags?: string[];
  source: string;
  imageUrl?: string;
}

// =============================================================================
// TEMPLATES (categories are imported from types/constants.ts)
// =============================================================================

const DIFFICULTY_DESCRIPTIONS = {
  easy: 'Suitable for beginners with basic tools',
  medium: 'Requires some experience and standard tools',
  hard: 'Requires advanced skills and specialized tools',
  expert: 'Professional-level project requiring extensive experience'
};

// Category to image search terms mapping for Unsplash
const CATEGORY_IMAGE_TERMS: Record<string, string[]> = {
  'home_improvement': ['home renovation', 'diy home', 'tools workshop'],
  'electronics': ['electronics project', 'circuit board', 'soldering'],
  'crafts': ['craft project', 'handmade', 'arts crafts'],
  'automotive': ['car repair', 'automotive tools', 'car engine'],
  'gardening': ['garden project', 'plants garden', 'landscaping'],
  'furniture': ['woodworking furniture', 'diy furniture', 'wood craft'],
  'plumbing': ['plumbing repair', 'pipes tools', 'bathroom fix'],
  'electrical': ['electrical work', 'wiring', 'electrician'],
  'painting': ['house painting', 'paint brush', 'wall painting'],
  'flooring': ['floor installation', 'wood flooring', 'tiles'],
  'woodworking': ['woodworking', 'carpentry', 'wood project'],
  'metalworking': ['metalworking', 'welding', 'metal craft'],
  'sewing': ['sewing project', 'fabric craft', 'textile'],
  'jewelry': ['jewelry making', 'handmade jewelry', 'beads craft']
};

/**
 * Get a random image URL for a category using Unsplash Source
 */
const getImageForCategory = (category: string, index: number): string => {
  const terms = CATEGORY_IMAGE_TERMS[category] || ['diy project', 'craft', 'tools'];
  const term = terms[index % terms.length];
  // Using Unsplash Source API (free, no auth required)
  // Adding random seed based on index for variety
  const unsplashBaseUrl = configService.get('diy.images.unsplashBaseUrl', 'https://source.unsplash.com');
  return `${unsplashBaseUrl}/400x300/?${encodeURIComponent(term)}&sig=${Date.now()}-${index}`;
};

// =============================================================================
// DIY SERVICE
// =============================================================================

export const diyService = {
  /**
   * Generate DIY project instructions using AI
   */
  generateProject: async (request: DIYProjectRequest): Promise<DIYProject> => {
    const {
      description,
      category,
      budget,
      currency = 'USD',
      skillLevel = 'intermediate',
      timeAvailable,
      existingTools = []
    } = request;

    // Check cache first
    const cacheKey = `diy:project:${Buffer.from(description).toString('base64').slice(0, 30)}`;
    const cached = await cacheService.get<DIYProject>(cacheKey);
    if (cached) return cached;

    const prompt = `You are a DIY expert. Generate detailed instructions for the following project:

PROJECT DESCRIPTION: ${description}
${category ? `CATEGORY: ${category}` : ''}
${budget ? `BUDGET: ${budget} ${currency}` : ''}
SKILL LEVEL: ${skillLevel}
${timeAvailable ? `TIME AVAILABLE: ${timeAvailable} hours` : ''}
${existingTools.length ? `EXISTING TOOLS: ${existingTools.join(', ')}` : ''}

Provide a complete DIY guide in the following JSON format:
{
  "title": "Clear, descriptive project title",
  "description": "Brief project overview",
  "category": "one of: ${DIY_CATEGORIES.join(', ')}",
  "difficulty": "easy | medium | hard | expert",
  "estimatedTime": <total minutes>,
  "estimatedCost": {
    "min": <minimum cost>,
    "max": <maximum cost>,
    "currency": "${currency}"
  },
  "instructions": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed instructions for this step",
      "tips": ["helpful tips"],
      "warnings": ["safety warnings"],
      "duration": <minutes for this step>
    }
  ],
  "materials": [
    {
      "name": "Material name",
      "quantity": <number>,
      "unit": "pcs/kg/m/etc",
      "estimatedPrice": <price>,
      "alternatives": ["cheaper or different alternatives"],
      "notes": "any notes"
    }
  ],
  "tools": [
    {
      "name": "Tool name",
      "required": true/false,
      "alternatives": ["alternative tools"],
      "notes": "any notes"
    }
  ],
  "tips": ["general tips for the project"],
  "warnings": ["safety warnings and precautions"]
}

Be thorough, practical, and prioritize safety. Include specific measurements and quantities.`;

    let result: string;
    try {
      result = await claudeService.generateText(prompt, configService.get('diy.ai.maxTokens', 3000));
    } catch (aiError: any) {
      logger.fail('AI service failed', { error: aiError.message });
      throw new Error('AI service is temporarily unavailable. Please try again.');
    }

    if (!result || result.trim().length === 0) {
      logger.fail('AI returned empty response');
      throw new Error('Failed to generate instructions. Please try again.');
    }

    // Parse the JSON response
    let project: DIYProject;
    try {
      // Extract JSON from the response - handle nested JSON better
      let jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON in code blocks
        const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonMatch = codeBlockMatch[1].match(/\{[\s\S]*\}/);
        }
      }
      
      if (!jsonMatch) {
        logger.fail('No JSON found in AI response', { response: result.slice(0, 500) });
        throw new Error('No valid response received');
      }
      
      project = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!project.title || !project.instructions || !Array.isArray(project.instructions)) {
        throw new Error('Invalid project structure');
      }
    } catch (error) {
      logger.fail('Failed to parse AI response', { error: (error as Error).message });
      throw new Error('Failed to process AI response. Please try again with a simpler description.');
    }

    // Cache the result
    const cacheTtl = configService.get('diy.cache.ttlSeconds', 86400);
    await cacheService.set(cacheKey, project, { ttl: cacheTtl });

    return project;
  },

  /**
   * Get materials with shopping links
   */
  getMaterialsWithPurchaseLinks: async (
    materials: DIYMaterial[],
    location?: string
  ): Promise<DIYMaterial[]> => {
    const enhancedMaterials: DIYMaterial[] = [];

    for (const material of materials) {
      try {
        // Search for the material using Israeli shops service
        const searchResult = await israeliShopsService.search(material.name, 3);

        const products = searchResult.products || [];
        
        enhancedMaterials.push({
          ...material,
          purchaseUrl: products[0]?.sourceUrl || undefined,
          estimatedPrice: products[0]?.price || material.estimatedPrice,
          alternatives: products.slice(1, 3).map((p: any) => `${p.title} - ${p.price} (${p.source})`)
        });
      } catch (error) {
        // If search fails, keep original material
        enhancedMaterials.push(material);
      }
    }

    return enhancedMaterials;
  },

  /**
   * Save a DIY project for a user
   */
  saveProject: async (userId: string, project: DIYProject): Promise<string> => {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not available');

    const saved = await prisma.dIYProject.create({
      data: {
        userId,
        title: project.title,
        description: project.description,
        category: project.category,
        difficulty: project.difficulty,
        estimatedTime: project.estimatedTime,
        estimatedCost: project.estimatedCost.min,
        currency: project.estimatedCost.currency,
        instructions: JSON.parse(JSON.stringify(project.instructions)),
        materials: JSON.parse(JSON.stringify(project.materials)),
        tools: JSON.parse(JSON.stringify(project.tools)),
        status: 'planning'
      }
    });

    return saved.id;
  },

  /**
   * Get user's DIY projects
   */
  getUserProjects: async (
    userId: string,
    options?: { status?: string; category?: string; limit?: number }
  ): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) return [];

    return prisma.dIYProject.findMany({
      where: {
        userId,
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.category ? { category: options.category } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20
    });
  },

  /**
   * Get a specific project by ID
   */
  getProject: async (projectId: string): Promise<any | null> => {
    const prisma = getPrisma();
    if (!prisma) return null;

    return prisma.dIYProject.findUnique({
      where: { id: projectId }
    });
  },

  /**
   * Update project status
   */
  updateProjectStatus: async (
    projectId: string,
    status: 'planning' | 'shopping' | 'in_progress' | 'completed' | 'paused' | 'abandoned',
    metadata?: { startedAt?: Date; completedAt?: Date; actualTime?: number; actualCost?: number }
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    await prisma.dIYProject.update({
      where: { id: projectId },
      data: {
        status,
        ...(metadata?.startedAt ? { startedAt: metadata.startedAt } : {}),
        ...(metadata?.completedAt ? { completedAt: metadata.completedAt } : {}),
        ...(metadata?.actualTime ? { actualTime: metadata.actualTime } : {}),
        ...(metadata?.actualCost ? { actualCost: metadata.actualCost } : {})
      }
    });
  },

  /**
   * Create shopping list from project materials
   */
  createShoppingList: async (
    userId: string,
    projectId: string,
    materials: DIYMaterial[]
  ): Promise<string | null> => {
    const prisma = getPrisma();
    if (!prisma) return null;

    // Create a product search for tracking
    const search = await prisma.productSearch.create({
      data: {
        userId,
        query: `DIY Materials for project ${projectId}`,
        queryType: 'diy_project'
      }
    });

    // Create products for each material
    for (const material of materials) {
      await prisma.product.create({
        data: {
          userId,
          searchId: search.id,
          title: `${material.name} (${material.quantity} ${material.unit})`,
          description: material.notes || '',
          price: material.estimatedPrice || 0,
          currency: material.currency || 'USD',
          source: 'diy_materials',
          sourceUrl: material.purchaseUrl || '',
          isSaved: true
        }
      });
    }

    // Link shopping list to project
    await prisma.dIYProject.update({
      where: { id: projectId },
      data: { shoppingListId: search.id }
    });

    return search.id;
  },

  /**
   * Get DIY templates/suggestions by category
   */
  getTemplates: async (category?: string): Promise<DIYSearchResult[]> => {
    const prisma = getPrisma();
    if (!prisma) return [];

    try {
      const templates = await prisma.dIYTemplate.findMany({
        where: category ? { category } : {},
        orderBy: { popularity: 'desc' },
        take: configService.get('limits.diy.templates.maxResults', 20) as number,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          estimatedTime: true
        }
      });

      return templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        category: t.category,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime || 0,
        source: 'template'
      }));
    } catch (error) {
      logger.fail('Failed to get templates', { error: (error as Error).message });
      return [];
    }
  },

  /**
   * Search for DIY ideas/tutorials from web
   */
  searchDIYIdeas: async (query: string): Promise<DIYSearchResult[]> => {
    // This could integrate with web search or instructables API
    // For now, generate suggestions via AI
    const prompt = `Suggest 5 DIY project ideas related to: "${query}"
    
Return as JSON array with this format:
[
  {
    "title": "Project title",
    "description": "Brief description",
    "category": "category name",
    "difficulty": "easy|medium|hard",
    "estimatedTime": <minutes>
  }
]`;

    try {
      const ideaTokens = configService.get('diy.ideas.aiTokens', 800);
      const result = await claudeService.generateText(prompt, ideaTokens);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      const ideas = JSON.parse(jsonMatch[0]);
      return ideas.map((idea: any, index: number) => ({
        id: `suggestion-${index}`,
        ...idea,
        source: 'ai_suggestion'
      }));
    } catch (error) {
      logger.fail('Failed to search DIY ideas', { error: (error as Error).message });
      return [];
    }
  },

  /**
   * Get featured/trending DIY ideas with smart filtering
   * AI-powered suggestions based on category, difficulty, and popularity
   */
  getFeaturedIdeas: async (options?: {
    category?: string;
    difficulty?: DifficultyLevel;
    skillLevel?: SkillLevelId;
    timeAvailable?: number; // max hours
    count?: number;
  }): Promise<DIYSearchResult[]> => {
    const count = options?.count || configService.get('diy.ideas.featuredCount', 8);
    const skillLevel = options?.skillLevel || 'intermediate';
    
    // Map skill level to difficulty preference
    const difficultyPreference = options?.difficulty || (
      skillLevel === 'beginner' ? 'easy' :
      skillLevel === 'advanced' ? 'hard' : 'medium'
    );
    
    const categoryContext = options?.category 
      ? `in the ${options.category.replace('_', ' ')} category` 
      : 'across various categories';
    
    const timeContext = options?.timeAvailable
      ? `that can be completed in ${options.timeAvailable} hours or less`
      : '';

    const prompt = `You are a DIY project curator. Generate ${count} diverse, popular, and inspiring DIY project ideas ${categoryContext} ${timeContext}.

Requirements:
- Mix of practical and creative projects
- Focus on ${difficultyPreference} difficulty level (but include some variety)
- Projects that are currently trending or timeless classics
- Include a "popularity" score 1-100 (higher = more popular)
- Include estimated cost range

Return as JSON array with this EXACT format:
[
  {
    "title": "Creative project title",
    "description": "Engaging 2-sentence description explaining what you'll build and why it's great",
    "category": "${options?.category || 'one of: home_improvement, electronics, crafts, woodworking, gardening, furniture'}",
    "difficulty": "easy|medium|hard",
    "estimatedTime": <minutes as number>,
    "estimatedCostMin": <dollars>,
    "estimatedCostMax": <dollars>,
    "popularity": <1-100>,
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Make them specific, actionable, and exciting!`;

    try {
      const cacheKey = `diy:featured:${options?.category || 'all'}:${difficultyPreference}:${count}`;
      const cached = await cacheService.get<DIYSearchResult[]>(cacheKey);
      if (cached) return cached;

      const ideaTokens = configService.get('diy.ideas.featuredTokens', 1500);
      const result = await claudeService.generateText(prompt, ideaTokens);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      const ideas = JSON.parse(jsonMatch[0]);
      const mappedIdeas = ideas.map((idea: any, index: number) => ({
        id: `featured-${Date.now()}-${index}`,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        difficulty: idea.difficulty,
        estimatedTime: idea.estimatedTime,
        estimatedCostMin: idea.estimatedCostMin,
        estimatedCostMax: idea.estimatedCostMax,
        popularity: idea.popularity,
        tags: idea.tags || [],
        source: 'ai_featured',
        imageUrl: getImageForCategory(idea.category, index)
      }));

      // Cache for 1 hour
      const cacheTtl = configService.get('diy.cache.featuredTtlSeconds', 3600);
      await cacheService.set(cacheKey, mappedIdeas, { ttl: cacheTtl });

      return mappedIdeas;
    } catch (error) {
      logger.fail('Failed to get featured ideas', { error: (error as Error).message });
      return [];
    }
  },

  /**
   * Get a random "Inspire Me" suggestion
   * Returns a single creative project idea with full context
   */
  getRandomInspiration: async (options?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    excludeCategories?: string[];
  }): Promise<DIYSearchResult | null> => {
    const skillLevel = options?.skillLevel || 'intermediate';
    const excludeText = options?.excludeCategories?.length 
      ? `Avoid these categories: ${options.excludeCategories.join(', ')}.` 
      : '';

    const prompt = `Generate 1 creative, inspiring, and fun DIY project idea for a ${skillLevel} skill level.
${excludeText}

Make it:
- Unique and interesting (not boring!)
- Practical with a cool outcome
- Something that would make someone say "I want to try that!"

Return as JSON with this EXACT format:
{
  "title": "Creative project title",
  "description": "Engaging 3-sentence description that sells the project",
  "category": "category name",
  "difficulty": "easy|medium|hard",
  "estimatedTime": <minutes>,
  "estimatedCostMin": <dollars>,
  "estimatedCostMax": <dollars>,
  "whyItsAwesome": "One sentence on why this project is worth doing",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    try {
      const ideaTokens = configService.get('diy.ideas.inspirationTokens', 500);
      const result = await claudeService.generateText(prompt, ideaTokens);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      const idea = JSON.parse(jsonMatch[0]);
      return {
        id: `inspiration-${Date.now()}`,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        difficulty: idea.difficulty,
        estimatedTime: idea.estimatedTime,
        estimatedCostMin: idea.estimatedCostMin,
        estimatedCostMax: idea.estimatedCostMax,
        popularity: 85, // High since it's curated
        whyItsAwesome: idea.whyItsAwesome,
        tags: idea.tags || [],
        source: 'ai_inspiration',
        imageUrl: getImageForCategory(idea.category, 0)
      };
    } catch (error) {
      logger.fail('Failed to get inspiration', { error: (error as Error).message });
      return null;
    }
  },

  /**
   * Add project completion feedback (for improving future suggestions)
   */
  addProjectFeedback: async (
    projectId: string,
    feedback: {
      rating: number;
      notes?: string;
      lessonsLearned?: string[];
      actualDifficulty?: string;
    }
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    await prisma.dIYProject.update({
      where: { id: projectId },
      data: {
        rating: feedback.rating,
        notes: feedback.notes,
        lessonsLearned: feedback.lessonsLearned || []
      }
    });
  },

  /**
   * Get similar projects for inspiration
   */
  getSimilarProjects: async (projectId: string): Promise<DIYSearchResult[]> => {
    const prisma = getPrisma();
    if (!prisma) return [];

    const project = await prisma.dIYProject.findUnique({
      where: { id: projectId },
      select: { category: true, title: true }
    });

    if (!project) return [];

    return diyService.searchDIYIdeas(`${project.category} ${project.title}`);
  },

  /**
   * Share project to external platforms
   */
  shareProject: async (
    projectId: string,
    platforms: ('notion' | 'discord' | 'telegram')[]
  ): Promise<Record<string, boolean>> => {
    const prisma = getPrisma();
    if (!prisma) return {};

    const project = await prisma.dIYProject.findUnique({
      where: { id: projectId }
    });

    if (!project) return {};

    const results: Record<string, boolean> = {};

    // Update shared platforms
    await prisma.dIYProject.update({
      where: { id: projectId },
      data: { sharedTo: platforms }
    });

    for (const platform of platforms) {
      results[platform] = true; // Would implement actual sharing here
    }

    return results;
  },

  /**
   * Get available categories
   */
  getCategories: (): string[] => {
    return [...DIY_CATEGORIES];
  },

  /**
   * Get difficulty descriptions
   */
  getDifficultyInfo: (): Record<string, string> => {
    return { ...DIFFICULTY_DESCRIPTIONS };
  }
};

export default diyService;

