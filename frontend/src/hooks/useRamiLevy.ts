/**
 * useRamiLevy Hook
 * 
 * Custom hook for managing Rami Levy grocery integration.
 * Provides search, cart management, and checkout functionality.
 * 
 * @module hooks/useRamiLevy
 */

import { useState, useEffect, useCallback } from 'react';
import * as cookingApi from '../services/cookingApi';
import logger from '../services/logger';
import type {
  RamiLevyTokens,
  RamiLevyStatus,
  RamiLevyCart,
  RamiLevyProduct,
  RamiLevyStore,
  RamiLevyOrderResult
} from '../services/cookingApi';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRamiLevyReturn {
  // State
  status: RamiLevyStatus | null;
  cart: RamiLevyCart | null;
  products: RamiLevyProduct[];
  stores: RamiLevyStore[];
  order: RamiLevyOrderResult | null;
  checkoutUrl: string | null;
  loading: boolean;
  searchQuery: string;
  showSetup: boolean;
  isConfigured: boolean;

  // UI Actions
  setShowSetup: (show: boolean) => void;
  setSearchQuery: (query: string) => void;

  // API Actions
  setup: (tokens: RamiLevyTokens) => Promise<boolean>;
  checkStatus: () => Promise<void>;
  logout: () => Promise<void>;
  search: (query: string, storeId?: string) => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  removeFromCart: (productIds: number[]) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  orderIngredients: (ingredients: Array<{ name: string; quantity?: number }>) => Promise<void>;
  checkout: () => void;
  clearProducts: () => void;
  clearOrder: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export const useRamiLevy = (): UseRamiLevyReturn => {
  // State
  const [status, setStatus] = useState<RamiLevyStatus | null>(null);
  const [cart, setCart] = useState<RamiLevyCart | null>(null);
  const [products, setProducts] = useState<RamiLevyProduct[]>([]);
  const [stores, setStores] = useState<RamiLevyStore[]>([]);
  const [order, setOrder] = useState<RamiLevyOrderResult | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  // Derived state
  const isConfigured = status?.isValid === true;

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // ==========================================================================
  // API ACTIONS
  // ==========================================================================

  /**
   * Setup Rami Levy authentication
   */
  const setup = useCallback(async (tokens: RamiLevyTokens): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevySetup(tokens);
      setStatus(result.ramiLevyStatus);
      if (result.ramiLevyStores) {
        setStores(result.ramiLevyStores);
      }
      setShowSetup(false);
      return result.ramiLevyStatus.isValid;
    } catch (error) {
      logger.error('Failed to setup Rami Levy', { error });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check token status
   */
  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      const result = await cookingApi.ramiLevyGetStatus();
      setStatus(result.ramiLevyStatus);
      if (result.ramiLevyStores) {
        setStores(result.ramiLevyStores);
      }
    } catch (error) {
      // Silently handle - user may not have tokens configured
      setStatus({ isValid: false, userId: '', errorMessage: 'Not configured' });
    }
  }, []);

  /**
   * Logout (delete tokens)
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await cookingApi.ramiLevyDeleteTokens();
      setStatus(null);
      setCart(null);
      setProducts([]);
      setOrder(null);
      setCheckoutUrl(null);
    } catch (error) {
      logger.error('Failed to logout from Rami Levy', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search for products
   */
  const search = useCallback(async (query: string, storeId?: string): Promise<void> => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setSearchQuery(query);
      const result = await cookingApi.ramiLevySearch(query, storeId);
      setProducts(result.ramiLevyProducts);
    } catch (error) {
      logger.error('Rami Levy search failed', { error });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add product to cart
   */
  const addToCart = useCallback(async (productId: number, quantity?: number): Promise<void> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevyAddToCart(productId, quantity);
      setCart(result.ramiLevyCart);
      setCheckoutUrl(result.ramiLevyCheckoutUrl);
    } catch (error) {
      logger.error('Failed to add to Rami Levy cart', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Remove products from cart
   */
  const removeFromCart = useCallback(async (productIds: number[]): Promise<void> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevyRemoveFromCart(productIds);
      setCart(result.ramiLevyCart);
    } catch (error) {
      logger.error('Failed to remove from Rami Levy cart', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update product quantity in cart
   */
  const updateQuantity = useCallback(async (productId: number, quantity: number): Promise<void> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevyUpdateQuantity(productId, quantity);
      setCart(result.ramiLevyCart);
    } catch (error) {
      logger.error('Failed to update Rami Levy cart quantity', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear cart
   */
  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevyClearCart();
      setCart(result.ramiLevyCart);
    } catch (error) {
      logger.error('Failed to clear Rami Levy cart', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Order ingredients from a recipe
   */
  const orderIngredients = useCallback(async (
    ingredients: Array<{ name: string; quantity?: number }>
  ): Promise<void> => {
    try {
      setLoading(true);
      const result = await cookingApi.ramiLevyOrderIngredients(ingredients);
      setOrder(result.ramiLevyOrder);
      setCart(result.ramiLevyCart);
      setCheckoutUrl(result.ramiLevyCheckoutUrl);
    } catch (error) {
      logger.error('Failed to order ingredients from Rami Levy', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Open checkout in new tab
   */
  const checkout = useCallback((): void => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  }, [checkoutUrl]);

  /**
   * Clear search results
   */
  const clearProducts = useCallback((): void => {
    setProducts([]);
    setSearchQuery('');
  }, []);

  /**
   * Clear order result
   */
  const clearOrder = useCallback((): void => {
    setOrder(null);
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    status,
    cart,
    products,
    stores,
    order,
    checkoutUrl,
    loading,
    searchQuery,
    showSetup,
    isConfigured,

    // UI Actions
    setShowSetup,
    setSearchQuery,

    // API Actions
    setup,
    checkStatus,
    logout,
    search,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    orderIngredients,
    checkout,
    clearProducts,
    clearOrder
  };
};

export default useRamiLevy;
