/**
 * Rami Levy Service Types
 *
 * Type definitions for the Rami Levy grocery API integration.
 * Extracted from ramiLevyService.ts to improve code organization.
 *
 * @module services/cooking/ramiLevyTypes
 */

import { AxiosInstance } from 'axios';

/**
 * Authentication tokens required for Rami Levy API
 */
export interface RamiLevyTokens {
  /** Bearer token from Authorization header */
  apiKey: string;
  /** ecomtoken header value (optional - only needed for cart ops, appears when logged in) */
  ecomToken?: string;
  /** Full cookie string */
  cookie: string;
}

/**
 * Product information from Rami Levy catalog
 */
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
  nutritionalInfo?: RamiLevyNutritionalInfo;
}

/**
 * Nutritional information for a product
 */
export interface RamiLevyNutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
}

/**
 * Item in the shopping cart
 */
export interface RamiLevyCartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  savings?: number;
  imageUrl?: string;
}

/**
 * Shopping cart state
 */
export interface RamiLevyCart {
  items: RamiLevyCartItem[];
  totalPrice: number;
  totalSavings: number;
  itemCount: number;
  deliveryFee?: number;
}

/**
 * Search results from catalog
 */
export interface RamiLevySearchResult {
  products: RamiLevyProduct[];
  total: number;
  query: string;
}

/**
 * Token validation status with detailed info
 */
export interface TokenStatus {
  isValid: boolean;
  userId: string;
  lastUsed?: Date;
  expiresAt?: Date;
  tokenAge?: string;
  expiresIn?: string;
  isExpiringSoon?: boolean;
  errorMessage?: string;
  refreshInstructions?: string;
}

/**
 * User session state (per-user, thread-safe)
 */
export interface UserSession {
  axiosInstance: AxiosInstance;
  tokens: RamiLevyTokens;
  cart: RamiLevyCart | null;
  lastUsed: Date;
}

/**
 * JWT token validation result
 */
export interface TokenValidation {
  isValid: boolean;
  parts: number;
  error?: string;
  hasExpiration?: boolean;
  isExpired?: boolean;
  expiresAt?: Date;
}

/**
 * Cookie validation result
 */
export interface CookieValidation {
  valid: boolean;
  missing: string[];
}

/**
 * Store information
 */
export interface RamiLevyStore {
  id: string;
  name: string;
}

/**
 * Token storage validation result
 */
export interface TokenStorageValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tokenInfo: {
    hasApiKey: boolean;
    hasEcomToken: boolean;
    hasCookies: boolean;
    apiKeyFormat?: 'jwt' | 'bearer' | 'unknown';
    cookieCount?: number;
    hasCfClearance?: boolean;
    hasAwsAlb?: boolean;
  };
}

/**
 * Add to cart options
 */
export interface AddToCartOptions {
  storeId?: string;
}

/**
 * Remove from cart options
 */
export interface RemoveFromCartOptions {
  storeId?: string;
}

/**
 * Update cart options
 */
export interface UpdateCartOptions {
  storeId?: string;
}

/**
 * Clear cart options
 */
export interface ClearCartOptions {
  storeId?: string;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  isOpen: boolean;
  failures: number;
  lastFailure: Date | null;
  threshold: number;
  resetMs: number;
}
