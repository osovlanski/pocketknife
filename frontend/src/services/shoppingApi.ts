import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with dynamic auth
const shoppingAxios = axios.create({ baseURL: API_BASE_URL });
shoppingAxios.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// CONSTANTS & DERIVED TYPES
// =============================================================================

export const SHOPPING_SOURCES = [
  'ebay', 'amazon', 'aliexpress', 'israeli_shops', 'zap', 'ksp', 'ivory', 'bug'
] as const;

/** Type-safe shopping source derived from SHOPPING_SOURCES */
export type ShoppingSource = typeof SHOPPING_SOURCES[number];

export const INTEREST_TYPES = ['hobby', 'category', 'brand', 'keyword'] as const;

/** Type-safe interest type derived from INTEREST_TYPES */
export type InterestType = typeof INTEREST_TYPES[number];

export const DEAL_SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20
} as const;

// =============================================================================
// INTERFACES
// =============================================================================

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  source: string;
  sourceUrl: string;
  sourceId?: string;
  imageUrl?: string;
  dealScore?: number;
  dealReason?: string;
  category?: string;
  tags: string[];
  isSaved: boolean;
  isPurchased: boolean;
  notifyOnDrop: boolean;
  targetPrice?: number;
  createdAt: string;
}

export interface ProductSuggestion {
  product: Product;
  reason: string;
  matchScore: number;
}

export interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  currentPrice: number;
  isTriggered: boolean;
  triggeredAt?: string;
}

export interface UserInterest {
  type: InterestType;
  value: string;
  weight?: number;
}

export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  source?: string;
  minDiscount?: number;
  minDealScore?: number;
}

export interface SearchResult {
  products: Product[];
  search: {
    id: string;
    query: string;
    queryType: string;
    resultsCount: number;
  };
}

// Product search
export const searchProducts = async (
  query: string,
  sources?: string[],
  filters?: ProductFilters
): Promise<SearchResult> => {
  const response = await shoppingAxios.post('/shopping/search', {
    query,
    sources,
    filters
  });
  return response.data;
};

export const searchByHobby = async (
  hobbies?: string[],
  query?: string
): Promise<SearchResult> => {
  const response = await shoppingAxios.post('/shopping/search/hobby', {
    hobbies,
    query
  });
  return response.data;
};

export const stopSearch = async (): Promise<void> => {
  await shoppingAxios.post('/shopping/search/stop');
};

// Deals
export const getDeals = async (filters?: ProductFilters): Promise<{ deals: Product[] }> => {
  const response = await shoppingAxios.get('/shopping/deals', { params: filters });
  return response.data;
};

// Saved products
export const getSavedProducts = async (): Promise<{ savedProducts: Product[] }> => {
  const response = await shoppingAxios.get('/shopping/saved');
  return response.data;
};

export const saveProduct = async (id: string): Promise<void> => {
  await shoppingAxios.post(`/shopping/products/${id}/save`);
};

export const unsaveProduct = async (id: string): Promise<void> => {
  await shoppingAxios.post(`/shopping/products/${id}/unsave`);
};

// Price alerts
export const getPriceAlerts = async (): Promise<{ priceAlerts: PriceAlert[] }> => {
  const response = await shoppingAxios.get('/shopping/alerts');
  return response.data;
};

export const setPriceAlert = async (productId: string, targetPrice: number): Promise<void> => {
  await shoppingAxios.post(`/shopping/products/${productId}/alert`, { targetPrice });
};

// User interests
export const updateInterests = async (interests: UserInterest[]): Promise<void> => {
  await shoppingAxios.put('/shopping/interests', { interests });
};

// AI suggestions
export const getSuggestions = async (): Promise<{ suggestions: ProductSuggestion[] }> => {
  const response = await shoppingAxios.get('/shopping/suggestions');
  return response.data;
};

