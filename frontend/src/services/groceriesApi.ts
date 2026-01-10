/**
 * Groceries API Service
 * 
 * API client for grocery management, shopping lists, and recipes.
 */

import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with dynamic auth
const groceriesAxios = axios.create({ baseURL: API_BASE_URL });
groceriesAxios.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// TYPES
// =============================================================================

export interface GroceryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  status: 'available' | 'low' | 'out_of_stock' | 'expired';
  expiryDate?: string;
  brand?: string;
  notes?: string;
  lastPurchasedAt?: string;
  lastPurchasePrice?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItemData {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
  brand?: string;
  notes?: string;
  barcode?: string;
  lastPurchasePrice?: number;
  currency?: string;
}

export interface GroceryFilters {
  status?: string;
  category?: string;
  expiringWithinDays?: number;
  lowStock?: boolean;
}

export interface GroceryList {
  id: string;
  name: string;
  description?: string;
  listType: string;
  status: string;
  items: GroceryListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GroceryListItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  isChecked: boolean;
  estimatedPrice?: number;
  actualPrice?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: RecipeIngredient[];
  missingIngredients?: string[];
  matchPercentage?: number;
  source: string;
  sourceUrl?: string;
}

export interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  optional?: boolean;
}

export interface SavedRecipe extends Recipe {
  instructions?: string;
  cuisine?: string;
  mealType?: string;
  dietaryInfo: string[];
  nutrition?: any;
  rating?: number;
  notes?: string;
  isFavorite: boolean;
  cookedCount: number;
  lastCookedAt?: string;
}

export interface RecipeSearchParams {
  ingredients?: string[];
  cuisine?: string;
  mealType?: string;
  dietaryRestrictions?: string[];
  maxPrepTime?: number;
  useAvailableOnly?: boolean;
}

export interface InventorySummary {
  totalItems: number;
  byCategory: Record<string, number>;
  expiringSoon: number;
  lowStock: number;
  totalValue: number;
}

// =============================================================================
// GROCERY ITEMS
// =============================================================================

export const addItem = async (itemData: GroceryItemData): Promise<{ item: GroceryItem }> => {
  const response = await groceriesAxios.post('/groceries/items', itemData);
  return response.data;
};

export const updateItem = async (id: string, itemData: Partial<GroceryItemData>): Promise<{ item: GroceryItem }> => {
  const response = await groceriesAxios.put(`/groceries/items/${id}`, itemData);
  return response.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  await groceriesAxios.delete(`/groceries/items/${id}`);
};

export const getItems = async (filters?: GroceryFilters): Promise<{ items: GroceryItem[] }> => {
  const response = await groceriesAxios.get('/groceries/items', { params: filters });
  return response.data;
};

export const updateItemStatus = async (id: string, status: string): Promise<{ item: GroceryItem }> => {
  const response = await groceriesAxios.put(`/groceries/items/${id}/status`, { status });
  return response.data;
};

export const getExpiringItems = async (): Promise<{ items: GroceryItem[] }> => {
  const response = await groceriesAxios.get('/groceries/items/expiring');
  return response.data;
};

export const getLowStockItems = async (): Promise<{ items: GroceryItem[] }> => {
  const response = await groceriesAxios.get('/groceries/items/low-stock');
  return response.data;
};

// =============================================================================
// SHOPPING LISTS
// =============================================================================

export const createList = async (name: string, description?: string): Promise<{ list: GroceryList }> => {
  const response = await groceriesAxios.post('/groceries/lists', { name, description });
  return response.data;
};

export const getLists = async (): Promise<{ lists: GroceryList[] }> => {
  const response = await groceriesAxios.get('/groceries/lists');
  return response.data;
};

export const addListItem = async (
  listId: string,
  item: { name: string; quantity?: number; unit?: string; category?: string }
): Promise<{ item: GroceryListItem }> => {
  const response = await groceriesAxios.post(`/groceries/lists/${listId}/items`, item);
  return response.data;
};

export const toggleListItem = async (itemId: string, isChecked: boolean): Promise<{ item: GroceryListItem }> => {
  const response = await groceriesAxios.put(`/groceries/lists/items/${itemId}/toggle`, { isChecked });
  return response.data;
};

export const completeList = async (listId: string): Promise<{ list: GroceryList }> => {
  const response = await groceriesAxios.post(`/groceries/lists/${listId}/complete`);
  return response.data;
};

// =============================================================================
// RECIPES
// =============================================================================

export const findRecipes = async (params: RecipeSearchParams): Promise<{ recipes: Recipe[] }> => {
  const response = await groceriesAxios.post('/groceries/recipes/search', params);
  return response.data;
};

export const saveRecipe = async (recipe: Recipe, notes?: string): Promise<{ recipe: SavedRecipe }> => {
  const response = await groceriesAxios.post('/groceries/recipes', { recipe, notes });
  return response.data;
};

export const getSavedRecipes = async (filters?: {
  mealType?: string;
  cuisine?: string;
  favoritesOnly?: boolean;
}): Promise<{ recipes: SavedRecipe[] }> => {
  const response = await groceriesAxios.get('/groceries/recipes', { params: filters });
  return response.data;
};

// =============================================================================
// ANALYTICS
// =============================================================================

export const getSummary = async (): Promise<{ summary: InventorySummary }> => {
  const response = await groceriesAxios.get('/groceries/summary');
  return response.data;
};

export const getSuggestions = async (): Promise<{ suggestions: string[] }> => {
  const response = await groceriesAxios.get('/groceries/suggestions');
  return response.data;
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const GROCERY_CATEGORIES = [
  { value: 'produce', label: '🥬 Produce', color: '#22C55E' },
  { value: 'dairy', label: '🥛 Dairy', color: '#60A5FA' },
  { value: 'meat', label: '🥩 Meat', color: '#EF4444' },
  { value: 'seafood', label: '🐟 Seafood', color: '#3B82F6' },
  { value: 'bakery', label: '🍞 Bakery', color: '#F59E0B' },
  { value: 'pantry', label: '🥫 Pantry', color: '#8B5CF6' },
  { value: 'frozen', label: '🧊 Frozen', color: '#06B6D4' },
  { value: 'beverages', label: '🥤 Beverages', color: '#EC4899' },
  { value: 'snacks', label: '🍿 Snacks', color: '#F97316' },
  { value: 'condiments', label: '🧂 Condiments', color: '#84CC16' },
  { value: 'spices', label: '🌶️ Spices', color: '#DC2626' },
  { value: 'household', label: '🧹 Household', color: '#6B7280' },
  { value: 'personal_care', label: '🧴 Personal Care', color: '#A855F7' },
  { value: 'other', label: '📦 Other', color: '#9CA3AF' }
] as const;

export const UNITS = [
  'pcs', 'pack', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'cup', 'tbsp', 'tsp', 'dozen'
] as const;
