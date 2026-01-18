/**
 * useShopping Hook
 * 
 * Custom hook for managing Shopping agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as shoppingApi from '../services/shoppingApi';
import * as configApi from '../services/configApi';
import logger from '../services/logger';
import type { Product, ProductSuggestion, PriceAlert } from '../services/shoppingApi';
import type { ShoppingThresholds } from '../services/configApi';

export interface UseShoppingReturn {
  // State
  products: Product[];
  savedProducts: Product[];
  suggestions: ProductSuggestion[];
  priceAlerts: PriceAlert[];
  loading: boolean;
  searchMode: 'explicit' | 'hobby';
  searchQuery: string;
  hobbies: string[];
  hobbyInput: string;
  selectedSources: string[];
  includeIsraeliShops: boolean;
  showFilters: boolean;
  showSaved: boolean;
  showAlerts: boolean;
  priceAlertModal: { productId: string; price: number } | null;
  targetPriceInput: string;
  
  // Filters
  minPrice: number | undefined;
  maxPrice: number | undefined;
  minDealScore: number;
  selectedCategory: string;
  
  // Setters
  setSearchMode: (mode: 'explicit' | 'hobby') => void;
  setSearchQuery: (query: string) => void;
  setHobbyInput: (input: string) => void;
  setShowFilters: (show: boolean) => void;
  setShowSaved: (show: boolean) => void;
  setShowAlerts: (show: boolean) => void;
  setPriceAlertModal: (modal: { productId: string; price: number } | null) => void;
  setTargetPriceInput: (input: string) => void;
  setMinPrice: (price: number | undefined) => void;
  setMaxPrice: (price: number | undefined) => void;
  setMinDealScore: (score: number) => void;
  setSelectedCategory: (category: string) => void;
  setIncludeIsraeliShops: (include: boolean) => void;
  
  // Actions
  handleSearch: () => Promise<void>;
  handleStopSearch: () => Promise<void>;
  handleSaveProduct: (productId: string) => Promise<void>;
  handleUnsaveProduct: (productId: string) => Promise<void>;
  handleSetPriceAlert: () => Promise<void>;
  addHobby: () => void;
  removeHobby: (hobby: string) => void;
  toggleSource: (source: string) => void;
  
  // Utilities
  getDealScoreColor: (score?: number) => string;
  isIsraeliProduct: (source: string) => boolean;
}

export const useShopping = (): UseShoppingReturn => {
  // Core state
  const [products, setProducts] = useState<Product[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Configuration thresholds (loaded from backend)
  const [thresholds, setThresholds] = useState<ShoppingThresholds>({
    excellent: 80,
    good: 60,
    fair: 40,
    notifyThreshold: 70
  });

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configApi.getShoppingThresholds();
        setThresholds(config);
      } catch (error) {
        logger.warn('Failed to load shopping config, using defaults');
      }
    };
    loadConfig();
  }, []);
  
  // Search state
  const [searchMode, setSearchMode] = useState<'explicit' | 'hobby'>('explicit');
  const [searchQuery, setSearchQuery] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['ebay', 'aliexpress', 'amazon']);
  const [includeIsraeliShops, setIncludeIsraeliShops] = useState<boolean>(true); // Default enabled
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [priceAlertModal, setPriceAlertModal] = useState<{ productId: string; price: number } | null>(null);
  const [targetPriceInput, setTargetPriceInput] = useState('');
  
  // Filters
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [minDealScore, setMinDealScore] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadSavedProducts();
    loadPriceAlerts();
    loadSuggestions();
    loadTrendingProducts();
  }, []);

  const loadTrendingProducts = async () => {
    try {
      // Load deals on mount to show something by default
      const result = await shoppingApi.getDeals({ minDealScore: 60 });
      if (result.deals && result.deals.length > 0) {
        setProducts(result.deals.slice(0, 10));
      }
    } catch (error) {
      // Silent fail - not critical
      logger.debug('Failed to load trending products', { error });
    }
  };

  const loadSavedProducts = async () => {
    try {
      const result = await shoppingApi.getSavedProducts();
      setSavedProducts(result.savedProducts || []);
    } catch (error) {
      logger.error('Failed to load saved products', { error });
    }
  };

  const loadPriceAlerts = async () => {
    try {
      const result = await shoppingApi.getPriceAlerts();
      setPriceAlerts(result.priceAlerts || []);
    } catch (error) {
      logger.error('Failed to load price alerts', { error });
    }
  };

  const loadSuggestions = async () => {
    try {
      const result = await shoppingApi.getSuggestions();
      setSuggestions(result.suggestions || []);
    } catch (error) {
      logger.error('Failed to load suggestions', { error });
    }
  };

  // Actions
  const handleSearch = useCallback(async () => {
    if (searchMode === 'explicit' && !searchQuery.trim()) return;
    if (searchMode === 'hobby' && hobbies.length === 0 && !searchQuery.trim()) return;

    try {
      setLoading(true);
      setProducts([]);

      let result;
      if (searchMode === 'explicit') {
        // Include Israeli source if toggle is enabled
        const sources = includeIsraeliShops 
          ? [...selectedSources, 'israeli']
          : selectedSources;
        
        result = await shoppingApi.searchProducts(searchQuery, sources, {
          minPrice,
          maxPrice,
          minDealScore,
          category: selectedCategory || undefined
        });
      } else {
        result = await shoppingApi.searchByHobby(hobbies, searchQuery);
      }

      setProducts(result.products || []);
    } catch (error) {
      logger.error('Search failed', { error });
    } finally {
      setLoading(false);
    }
  }, [searchMode, searchQuery, hobbies, selectedSources, includeIsraeliShops, minPrice, maxPrice, minDealScore, selectedCategory]);

  const handleStopSearch = useCallback(async () => {
    try {
      await shoppingApi.stopSearch();
      setLoading(false);
    } catch (error) {
      logger.error('Failed to stop search', { error });
    }
  }, []);

  const handleSaveProduct = useCallback(async (productId: string) => {
    try {
      await shoppingApi.saveProduct(productId);
      loadSavedProducts();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isSaved: true } : p));
    } catch (error) {
      logger.error('Failed to save product', { error });
    }
  }, []);

  const handleUnsaveProduct = useCallback(async (productId: string) => {
    try {
      await shoppingApi.unsaveProduct(productId);
      loadSavedProducts();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isSaved: false } : p));
    } catch (error) {
      logger.error('Failed to unsave product', { error });
    }
  }, []);

  const handleSetPriceAlert = useCallback(async () => {
    if (!priceAlertModal || !targetPriceInput) return;

    try {
      await shoppingApi.setPriceAlert(priceAlertModal.productId, parseFloat(targetPriceInput));
      loadPriceAlerts();
      setPriceAlertModal(null);
      setTargetPriceInput('');
    } catch (error) {
      logger.error('Failed to set price alert', { error });
    }
  }, [priceAlertModal, targetPriceInput]);

  const addHobby = useCallback(() => {
    if (hobbyInput.trim() && !hobbies.includes(hobbyInput.trim())) {
      setHobbies(prev => [...prev, hobbyInput.trim()]);
      setHobbyInput('');
    }
  }, [hobbyInput, hobbies]);

  const removeHobby = useCallback((hobby: string) => {
    setHobbies(prev => prev.filter(h => h !== hobby));
  }, []);

  const toggleSource = useCallback((source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  }, []);

  // Utilities - uses configurable thresholds
  const getDealScoreColor = useCallback((score?: number): string => {
    if (!score) return 'slate';
    if (score >= thresholds.excellent) return 'emerald';
    if (score >= thresholds.good) return 'yellow';
    if (score >= thresholds.fair) return 'orange';
    return 'red';
  }, [thresholds]);

  const isIsraeliProduct = useCallback((source: string): boolean => {
    return source.startsWith('israeli-') || source === 'israeli';
  }, []);

  return {
    // State
    products,
    savedProducts,
    suggestions,
    priceAlerts,
    loading,
    searchMode,
    searchQuery,
    hobbies,
    hobbyInput,
    selectedSources,
    includeIsraeliShops,
    showFilters,
    showSaved,
    showAlerts,
    priceAlertModal,
    targetPriceInput,
    minPrice,
    maxPrice,
    minDealScore,
    selectedCategory,
    
    // Setters
    setSearchMode,
    setSearchQuery,
    setHobbyInput,
    setShowFilters,
    setShowSaved,
    setShowAlerts,
    setPriceAlertModal,
    setTargetPriceInput,
    setMinPrice,
    setMaxPrice,
    setMinDealScore,
    setSelectedCategory,
    setIncludeIsraeliShops,
    
    // Actions
    handleSearch,
    handleStopSearch,
    handleSaveProduct,
    handleUnsaveProduct,
    handleSetPriceAlert,
    addHobby,
    removeHobby,
    toggleSource,
    
    // Utilities
    getDealScoreColor,
    isIsraeliProduct
  };
};

export default useShopping;

