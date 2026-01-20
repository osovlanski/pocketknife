/**
 * Spoonacular Recipe API Service
 * 
 * Provides recipe search, nutrition data, and meal planning features.
 * 
 * API: https://spoonacular.com/food-api
 * Free tier: 150 requests/day
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  instructions: string;
  extendedIngredients: SpoonacularIngredient[];
  nutrition?: SpoonacularNutrition;
  pricePerServing: number;
  healthScore: number;
  spoonacularScore: number;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
}

export interface SpoonacularIngredient {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
  image: string;
  aisle: string;
}

export interface SpoonacularNutrition {
  nutrients: Array<{
    name: string;
    amount: number;
    unit: string;
    percentOfDailyNeeds: number;
  }>;
  caloricBreakdown: {
    percentProtein: number;
    percentFat: number;
    percentCarbs: number;
  };
}

export interface RecipeSearchParams {
  query?: string;
  cuisine?: string;
  diet?: string;
  intolerances?: string[];
  includeIngredients?: string[];
  excludeIngredients?: string[];
  maxReadyTime?: number;
  minCalories?: number;
  maxCalories?: number;
  number?: number;
  offset?: number;
  sort?: 'popularity' | 'healthiness' | 'price' | 'time' | 'random';
}

export interface IngredientSearchResult {
  id: number;
  name: string;
  image: string;
  aisle: string;
  possibleUnits: string[];
}

// =============================================================================
// SPOONACULAR SERVICE
// =============================================================================

class SpoonacularService {
  private client: AxiosInstance | null = null;
  private readonly baseUrl = 'https://api.spoonacular.com';

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.SPOONACULAR_API_KEY;
    if (apiKey) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        params: { apiKey },
        timeout: configService.get('cooking.api.timeoutMs', 10000)
      });
      logger.init('Spoonacular API client initialized');
    }
  }

  /**
   * Check if Spoonacular is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Search recipes by various criteria
   */
  async searchRecipes(params: RecipeSearchParams): Promise<SpoonacularRecipe[]> {
    if (!this.client) {
      logger.warn('Spoonacular not available - SPOONACULAR_API_KEY not configured');
      return [];
    }

    const cacheKey = `spoonacular:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<SpoonacularRecipe[]>(cacheKey);
    if (cached) {
      logger.cache('Spoonacular search cache hit');
      return cached;
    }

    try {
      const response = await this.client.get('/recipes/complexSearch', {
        params: {
          query: params.query,
          cuisine: params.cuisine,
          diet: params.diet,
          intolerances: params.intolerances?.join(','),
          includeIngredients: params.includeIngredients?.join(','),
          excludeIngredients: params.excludeIngredients?.join(','),
          maxReadyTime: params.maxReadyTime,
          minCalories: params.minCalories,
          maxCalories: params.maxCalories,
          number: params.number || 10,
          offset: params.offset || 0,
          sort: params.sort || 'popularity',
          addRecipeInformation: true,
          addRecipeNutrition: true,
          fillIngredients: true
        }
      });

      const recipes: SpoonacularRecipe[] = response.data.results || [];

      // Cache for 2 hours
      await cacheService.set(cacheKey, recipes, { ttl: 7200 });

      logger.success('Spoonacular search completed', { count: recipes.length });
      return recipes;
    } catch (error: any) {
      if (error.response?.status === 402) {
        logger.warn('Spoonacular API quota exceeded');
      } else {
        logger.fail('Spoonacular search failed', { error: error.message });
      }
      return [];
    }
  }

  /**
   * Get recipe by ID
   */
  async getRecipe(id: number): Promise<SpoonacularRecipe | null> {
    if (!this.client) return null;

    const cacheKey = `spoonacular:recipe:${id}`;
    const cached = await cacheService.get<SpoonacularRecipe>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/recipes/${id}/information`, {
        params: { includeNutrition: true }
      });

      const recipe = response.data;
      await cacheService.set(cacheKey, recipe, { ttl: 86400 }); // 24 hours

      return recipe;
    } catch (error: any) {
      logger.fail('Failed to get recipe', { id, error: error.message });
      return null;
    }
  }

  /**
   * Find recipes by ingredients you have
   */
  async findByIngredients(ingredients: string[], number: number = 10): Promise<SpoonacularRecipe[]> {
    if (!this.client) return [];

    const cacheKey = `spoonacular:byingredients:${ingredients.join(',')}:${number}`;
    const cached = await cacheService.get<SpoonacularRecipe[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/recipes/findByIngredients', {
        params: {
          ingredients: ingredients.join(','),
          number,
          ranking: 1, // Maximize used ingredients
          ignorePantry: true
        }
      });

      const results = response.data || [];
      
      // Get full recipe info for each result
      const recipes: SpoonacularRecipe[] = [];
      for (const result of results.slice(0, 5)) {
        const fullRecipe = await this.getRecipe(result.id);
        if (fullRecipe) recipes.push(fullRecipe);
      }

      await cacheService.set(cacheKey, recipes, { ttl: 3600 });
      return recipes;
    } catch (error: any) {
      logger.fail('Failed to find recipes by ingredients', { error: error.message });
      return [];
    }
  }

  /**
   * Get random recipes
   */
  async getRandomRecipes(tags?: string[], number: number = 5): Promise<SpoonacularRecipe[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.get('/recipes/random', {
        params: {
          number,
          tags: tags?.join(',')
        }
      });

      return response.data.recipes || [];
    } catch (error: any) {
      logger.fail('Failed to get random recipes', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze recipe nutrition
   */
  async analyzeRecipeNutrition(title: string, ingredients: string[]): Promise<SpoonacularNutrition | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.post('/recipes/analyze', {
        title,
        ingredients
      });

      return response.data.nutrition || null;
    } catch (error: any) {
      logger.fail('Failed to analyze recipe', { error: error.message });
      return null;
    }
  }

  /**
   * Search ingredients for autocomplete
   */
  async searchIngredients(query: string, number: number = 10): Promise<IngredientSearchResult[]> {
    if (!this.client) return [];

    const cacheKey = `spoonacular:ingredients:${query}`;
    const cached = await cacheService.get<IngredientSearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/food/ingredients/search', {
        params: { query, number }
      });

      const results = response.data.results || [];
      await cacheService.set(cacheKey, results, { ttl: 86400 });

      return results;
    } catch (error: any) {
      logger.fail('Failed to search ingredients', { error: error.message });
      return [];
    }
  }

  /**
   * Get ingredient substitutes
   */
  async getSubstitutes(ingredientName: string): Promise<string[]> {
    if (!this.client) return [];

    const cacheKey = `spoonacular:substitutes:${ingredientName}`;
    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/food/ingredients/substitutes', {
        params: { ingredientName }
      });

      const substitutes = response.data.substitutes || [];
      await cacheService.set(cacheKey, substitutes, { ttl: 86400 });

      return substitutes;
    } catch (error: any) {
      logger.fail('Failed to get substitutes', { error: error.message });
      return [];
    }
  }

  /**
   * Generate meal plan
   */
  async generateMealPlan(
    timeFrame: 'day' | 'week',
    targetCalories: number = 2000,
    diet?: string,
    exclude?: string[]
  ): Promise<any> {
    if (!this.client) return null;

    try {
      const response = await this.client.get('/mealplanner/generate', {
        params: {
          timeFrame,
          targetCalories,
          diet,
          exclude: exclude?.join(',')
        }
      });

      return response.data;
    } catch (error: any) {
      logger.fail('Failed to generate meal plan', { error: error.message });
      return null;
    }
  }

  /**
   * Convert ingredient amounts
   */
  async convertUnits(
    ingredientName: string,
    sourceAmount: number,
    sourceUnit: string,
    targetUnit: string
  ): Promise<{ targetAmount: number; answer: string } | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.get('/recipes/convert', {
        params: {
          ingredientName,
          sourceAmount,
          sourceUnit,
          targetUnit
        }
      });

      return {
        targetAmount: response.data.targetAmount,
        answer: response.data.answer
      };
    } catch (error: any) {
      logger.fail('Failed to convert units', { error: error.message });
      return null;
    }
  }
}

// Export singleton
export const spoonacularService = new SpoonacularService();
export default spoonacularService;



