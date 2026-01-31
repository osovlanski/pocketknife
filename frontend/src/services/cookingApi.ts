/**
 * Cooking API Service
 * 
 * API client for kitchen inventory, shopping lists, recipes, and wishlist.
 */

import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with dynamic auth
const cookingAxios = axios.create({ baseURL: API_BASE_URL });
cookingAxios.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// TYPES
// =============================================================================

export interface InventoryItem {
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

export interface InventoryItemData {
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

export interface CookingFilters {
  status?: string;
  category?: string;
  expiringWithinDays?: number;
  lowStock?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  listType: string;
  status: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
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
// DELIVERY TYPES
// =============================================================================

export interface DeliveryProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  unit: string;
  quantity: number;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  providerId: string;
}

export interface DeliveryOrderItem {
  product: DeliveryProduct;
  quantity: number;
  originalIngredient: string;
  matchConfidence: number;
  notes?: string;
}

export interface OrderPreview {
  id: string;
  providerId: string;
  providerName: string;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  estimatedDeliveryMinutes?: number;
  createdAt: string;
  expiresAt: string;
  recipeId?: string;
  recipeName?: string;
}

export interface OrderLink {
  orderId: string;
  providerId: string;
  providerName: string;
  url: string;
  deepLink?: string;
  expiresAt: string;
  itemCount: number;
  total: number;
  currency: string;
}

export interface IngredientMatchResult {
  ingredient: string;
  originalAmount: string;
  matchedProducts: DeliveryProduct[];
  bestMatch?: DeliveryProduct;
  matchConfidence: number;
  inInventory: boolean;
  inventoryAmount?: number;
  needToOrder: boolean;
}

export interface RecipeOrderResult {
  recipeId: string | number;
  recipeName: string;
  ingredientMatches: IngredientMatchResult[];
  itemsInInventory: IngredientMatchResult[];
  itemsToOrder: IngredientMatchResult[];
  orderPreview?: OrderPreview;
  orderLink?: OrderLink;
  savings?: number;
}

export interface DeliveryProviderInfo {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  baseUrl: string;
  supportedCountries: string[];
  isAvailable: boolean;
  averageDeliveryMinutes?: number;
  minimumOrderAmount?: number;
  currency: string;
}

// Wolt Drive types
export interface WoltDeliveryResponse {
  id: string;
  wolt_order_reference_id: string;
  tracking: {
    url: string;
  };
  status: string;
  price: {
    amount: number;
    currency: string;
  };
  pickup: {
    eta?: string;
    venue_id: string;
  };
  dropoff: {
    eta?: string;
    location: {
      formatted_address: string;
    };
  };
  created_at: string;
}

export interface CustomerContact {
  name: string;
  phone: string;
}

// =============================================================================
// INVENTORY ITEMS
// =============================================================================

export const addItem = async (itemData: InventoryItemData): Promise<{ item: InventoryItem }> => {
  const response = await cookingAxios.post('/cooking/items', itemData);
  return response.data;
};

export const updateItem = async (id: string, itemData: Partial<InventoryItemData>): Promise<{ item: InventoryItem }> => {
  const response = await cookingAxios.put(`/cooking/items/${id}`, itemData);
  return response.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  await cookingAxios.delete(`/cooking/items/${id}`);
};

export const getItems = async (filters?: CookingFilters): Promise<{ items: InventoryItem[] }> => {
  const response = await cookingAxios.get('/cooking/items', { params: filters });
  return response.data;
};

export const updateItemStatus = async (id: string, status: string): Promise<{ item: InventoryItem }> => {
  const response = await cookingAxios.put(`/cooking/items/${id}/status`, { status });
  return response.data;
};

export const getExpiringItems = async (): Promise<{ items: InventoryItem[] }> => {
  const response = await cookingAxios.get('/cooking/items/expiring');
  return response.data;
};

export const getLowStockItems = async (): Promise<{ items: InventoryItem[] }> => {
  const response = await cookingAxios.get('/cooking/items/low-stock');
  return response.data;
};

// =============================================================================
// SHOPPING LISTS
// =============================================================================

export const createList = async (name: string, description?: string): Promise<{ list: ShoppingList }> => {
  const response = await cookingAxios.post('/cooking/lists', { name, description });
  return response.data;
};

export const getLists = async (): Promise<{ lists: ShoppingList[] }> => {
  const response = await cookingAxios.get('/cooking/lists');
  return response.data;
};

export const addListItem = async (
  listId: string,
  item: { name: string; quantity?: number; unit?: string; category?: string }
): Promise<{ item: ShoppingListItem }> => {
  const response = await cookingAxios.post(`/cooking/lists/${listId}/items`, item);
  return response.data;
};

export const toggleListItem = async (itemId: string, isChecked: boolean): Promise<{ item: ShoppingListItem }> => {
  const response = await cookingAxios.put(`/cooking/lists/items/${itemId}/toggle`, { isChecked });
  return response.data;
};

export const completeList = async (listId: string): Promise<{ list: ShoppingList }> => {
  const response = await cookingAxios.post(`/cooking/lists/${listId}/complete`);
  return response.data;
};

export const deleteList = async (listId: string): Promise<void> => {
  await cookingAxios.delete(`/cooking/lists/${listId}`);
};

export const deleteListItem = async (listId: string, itemId: string): Promise<void> => {
  await cookingAxios.delete(`/cooking/lists/${listId}/items/${itemId}`);
};

export const generateShoppingList = async (params: {
  prompt?: string;
  fromLowStock?: boolean;
  fromExpiring?: boolean;
  forRecipeIds?: string[];
}): Promise<{ list: ShoppingList }> => {
  const response = await cookingAxios.post('/cooking/lists/generate', params);
  return response.data;
};

// =============================================================================
// RECIPES
// =============================================================================

export const findRecipes = async (params: RecipeSearchParams): Promise<{ recipes: Recipe[] }> => {
  const response = await cookingAxios.post('/cooking/recipes/search', params);
  return response.data;
};

export const saveRecipe = async (recipe: Recipe, notes?: string): Promise<{ recipe: SavedRecipe }> => {
  const response = await cookingAxios.post('/cooking/recipes', { recipe, notes });
  return response.data;
};

export const getSavedRecipes = async (filters?: {
  mealType?: string;
  cuisine?: string;
  favoritesOnly?: boolean;
}): Promise<{ recipes: SavedRecipe[] }> => {
  const response = await cookingAxios.get('/cooking/recipes', { params: filters });
  return response.data;
};

// =============================================================================
// RECIPE WISHLIST
// =============================================================================

export const addToWishlist = async (recipe: Recipe): Promise<{ recipe: SavedRecipe }> => {
  const response = await cookingAxios.post('/cooking/wishlist', { recipe });
  return response.data;
};

export const getWishlist = async (): Promise<{ wishlist: SavedRecipe[] }> => {
  const response = await cookingAxios.get('/cooking/wishlist');
  return response.data;
};

export const removeFromWishlist = async (id: string): Promise<void> => {
  await cookingAxios.delete(`/cooking/wishlist/${id}`);
};

// =============================================================================
// ANALYTICS
// =============================================================================

export const getSummary = async (): Promise<{ summary: InventorySummary }> => {
  const response = await cookingAxios.get('/cooking/summary');
  return response.data;
};

export const getSuggestions = async (): Promise<{ suggestions: string[] }> => {
  const response = await cookingAxios.get('/cooking/suggestions');
  return response.data;
};

// =============================================================================
// DELIVERY / RECIPE ORDERING
// =============================================================================

export const createRecipeOrder = async (
  recipeId: number,
  options?: { checkInventory?: boolean; providerId?: string }
): Promise<{ recipeOrder: RecipeOrderResult }> => {
  const response = await cookingAxios.post('/cooking/recipes/order', {
    spoonacularRecipeId: recipeId,
    checkInventory: options?.checkInventory ?? true,
    providerId: options?.providerId
  });
  return response.data;
};

export const getDeliveryProviders = async (): Promise<{ deliveryProviders: DeliveryProviderInfo[] }> => {
  const response = await cookingAxios.get('/cooking/delivery/providers');
  return response.data;
};

// =============================================================================
// WOLT DRIVE ACTUAL DELIVERY
// =============================================================================

/**
 * Place an actual Wolt Drive delivery order
 * This dispatches a courier to pick up and deliver the order
 */
export const placeWoltOrder = async (
  orderId: string,
  customerContact: CustomerContact,
  deliveryInstructions?: string
): Promise<{ woltDelivery: WoltDeliveryResponse }> => {
  const response = await cookingAxios.post('/cooking/delivery/wolt/order', {
    orderId,
    customerContact,
    deliveryInstructions
  });
  return response.data;
};

/**
 * Get Wolt delivery status
 */
export const getWoltOrderStatus = async (
  deliveryId: string
): Promise<{ woltDelivery: WoltDeliveryResponse }> => {
  const response = await cookingAxios.get(`/cooking/delivery/wolt/status/${deliveryId}`);
  return response.data;
};

/**
 * Cancel a Wolt delivery
 */
export const cancelWoltOrder = async (
  deliveryId: string
): Promise<{ woltOrderCancelled: boolean }> => {
  const response = await cookingAxios.post(`/cooking/delivery/wolt/cancel/${deliveryId}`);
  return response.data;
};

// =============================================================================
// RAMI LEVY INTEGRATION
// =============================================================================

export interface RamiLevyTokens {
  apiKey: string;
  ecomToken?: string;  // Optional - only needed for cart operations, appears when logged in
  cookie: string;
}

export interface RamiLevyProduct {
  id: number;
  barcode: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  department?: string;
  group?: string;
  subGroup?: string;
  unit?: string;
  isAvailable: boolean;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sodium?: number;
  };
}

export interface RamiLevyCartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  savings?: number;
  imageUrl?: string;
}

export interface RamiLevyCart {
  items: RamiLevyCartItem[];
  totalPrice: number;
  totalSavings: number;
  itemCount: number;
  deliveryFee?: number;
}

export interface RamiLevyStatus {
  isValid: boolean;
  userId: string;
  lastUsed?: string;
  errorMessage?: string;
}

export interface RamiLevyStore {
  id: string;
  name: string;
}

export interface RamiLevySearchResult {
  products: RamiLevyProduct[];
  total: number;
  query: string;
}

export interface RamiLevyOrderResult {
  cart: RamiLevyCart;
  checkoutUrl: string;
  matchedProducts: Array<{ ingredient: string; product: RamiLevyProduct | null }>;
  unmatchedIngredients: string[];
}

/**
 * Setup Rami Levy authentication tokens
 */
export const ramiLevySetup = async (
  tokens: RamiLevyTokens
): Promise<{ ramiLevyStatus: RamiLevyStatus; ramiLevyStores?: RamiLevyStore[] }> => {
  const response = await cookingAxios.post('/cooking/rami-levy/setup', tokens);
  return response.data;
};

/**
 * Get Rami Levy token status
 */
export const ramiLevyGetStatus = async (): Promise<{ 
  ramiLevyStatus: RamiLevyStatus; 
  ramiLevyStores?: RamiLevyStore[] 
}> => {
  const response = await cookingAxios.get('/cooking/rami-levy/status');
  return response.data;
};

/**
 * Delete Rami Levy tokens (logout)
 */
export const ramiLevyDeleteTokens = async (): Promise<{ tokensDeleted: boolean }> => {
  const response = await cookingAxios.delete('/cooking/rami-levy/tokens');
  return response.data;
};

/**
 * Search Rami Levy products
 */
export const ramiLevySearch = async (
  query: string,
  storeId?: string
): Promise<{ ramiLevySearchResult: RamiLevySearchResult; ramiLevyProducts: RamiLevyProduct[] }> => {
  const params = new URLSearchParams({ query });
  if (storeId) params.append('storeId', storeId);
  
  const response = await cookingAxios.get(`/cooking/rami-levy/search?${params.toString()}`);
  return response.data;
};

/**
 * Get current Rami Levy cart
 */
export const ramiLevyGetCart = async (): Promise<{ 
  ramiLevyCart: RamiLevyCart; 
  ramiLevyCheckoutUrl: string 
}> => {
  const response = await cookingAxios.get('/cooking/rami-levy/cart');
  return response.data;
};

/**
 * Add product to Rami Levy cart
 */
export const ramiLevyAddToCart = async (
  productId: number,
  quantity?: number,
  storeId?: string
): Promise<{ ramiLevyCart: RamiLevyCart; ramiLevyCheckoutUrl: string }> => {
  const response = await cookingAxios.post('/cooking/rami-levy/cart/add', {
    productId,
    quantity: quantity || 1,
    storeId
  });
  return response.data;
};

/**
 * Remove products from Rami Levy cart
 */
export const ramiLevyRemoveFromCart = async (
  productIds: number[],
  storeId?: string
): Promise<{ ramiLevyCart: RamiLevyCart }> => {
  const response = await cookingAxios.post('/cooking/rami-levy/cart/remove', {
    productIds,
    storeId
  });
  return response.data;
};

/**
 * Update product quantity in Rami Levy cart
 */
export const ramiLevyUpdateQuantity = async (
  productId: number,
  quantity: number,
  storeId?: string
): Promise<{ ramiLevyCart: RamiLevyCart }> => {
  const response = await cookingAxios.post('/cooking/rami-levy/cart/update', {
    productId,
    quantity,
    storeId
  });
  return response.data;
};

/**
 * Clear Rami Levy cart
 */
export const ramiLevyClearCart = async (
  storeId?: string
): Promise<{ ramiLevyCart: RamiLevyCart }> => {
  const response = await cookingAxios.post('/cooking/rami-levy/cart/clear', { storeId });
  return response.data;
};

/**
 * Get Rami Levy checkout URL
 */
export const ramiLevyCheckout = async (): Promise<{ 
  ramiLevyCart?: RamiLevyCart; 
  ramiLevyCheckoutUrl: string 
}> => {
  const response = await cookingAxios.get('/cooking/rami-levy/checkout');
  return response.data;
};

/**
 * Order ingredients from a recipe - main flow
 * Automatically searches for products and adds them to cart
 */
export const ramiLevyOrderIngredients = async (
  ingredients: Array<{ name: string; quantity?: number }>,
  options?: { storeId?: string; autoSelectFirst?: boolean }
): Promise<{ 
  ramiLevyOrder: RamiLevyOrderResult; 
  ramiLevyCart: RamiLevyCart; 
  ramiLevyCheckoutUrl: string 
}> => {
  const response = await cookingAxios.post('/cooking/rami-levy/order-ingredients', {
    ingredients,
    storeId: options?.storeId,
    autoSelectFirst: options?.autoSelectFirst ?? true
  });
  return response.data;
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const COOKING_CATEGORIES = [
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

/** Type-safe cooking category derived from COOKING_CATEGORIES */
export type CookingCategoryId = typeof COOKING_CATEGORIES[number]['value'];

export const UNITS = [
  'pcs', 'pack', 'kg', 'g', 'lb', 'oz', 'L', 'ml', 'cup', 'tbsp', 'tsp', 'dozen'
] as const;

/** Type-safe unit derived from UNITS */
export type UnitType = typeof UNITS[number];
