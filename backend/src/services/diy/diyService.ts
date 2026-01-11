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
import claudeService from '../core/claudeService';
import { israeliShopsService, zapScraperService } from '../shopping';

// =============================================================================
// TYPES
// =============================================================================

export interface DIYProjectRequest {
  description: string;
  category?: string;
  budget?: number;
  currency?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
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
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
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
  category: string;
  difficulty: string;
  estimatedTime: number;
  source: string;
}

// =============================================================================
// CATEGORIES & TEMPLATES
// =============================================================================

const DIY_CATEGORIES = [
  'home_improvement',
  'electronics',
  'crafts',
  'automotive',
  'gardening',
  'furniture',
  'plumbing',
  'electrical',
  'painting',
  'flooring',
  'woodworking',
  'metalworking',
  'sewing',
  'jewelry'
] as const;

const DIFFICULTY_DESCRIPTIONS = {
  easy: 'Suitable for beginners with basic tools',
  medium: 'Requires some experience and standard tools',
  hard: 'Requires advanced skills and specialized tools',
  expert: 'Professional-level project requiring extensive experience'
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

    const result = await claudeService.generateText(prompt, configService.get('diy.ai.maxTokens', 3000));

    // Parse the JSON response
    let project: DIYProject;
    try {
      // Extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      project = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to generate project instructions');
    }

    // Cache the result for 24 hours
    await cacheService.set(cacheKey, project, { ttl: 86400 });

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
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          estimatedTime: true
        }
      });

      return templates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        category: t.category,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime || 0,
        source: 'template'
      }));
    } catch (error) {
      console.error('Failed to get templates:', error);
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
      const result = await claudeService.generateText(prompt, 800);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      const ideas = JSON.parse(jsonMatch[0]);
      return ideas.map((idea: any, index: number) => ({
        id: `suggestion-${index}`,
        ...idea,
        source: 'ai_suggestion'
      }));
    } catch (error) {
      console.error('Failed to search DIY ideas:', error);
      return [];
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

