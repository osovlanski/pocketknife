/**
 * useShopping Hook
 * 
 * Custom hook for managing Shopping agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as shoppingApi from '../services/shoppingApi';
import type { Product, ProductSuggestion, PriceAlert } from '../services/shoppingApi';

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
  showFilters: boolean;
  showSaved: boolean;
  showAlerts: boolean;
  priceAlertModal: { productId: string; price: number } | null;
  targetPriceInput: string;
  
  // Filters
  minPrice: number | undefined;
  maxPrice: number | undefined;
  minDealScore: number;
  
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
}

export const useShopping = (): UseShoppingReturn => {
  // Core state
  const [products, setProducts] = useState<Product[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchMode, setSearchMode] = useState<'explicit' | 'hobby'>('explicit');
  const [searchQuery, setSearchQuery] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['ebay', 'aliexpress', 'amazon']);
  
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

  // Load initial data
  useEffect(() => {
    loadSavedProducts();
    loadPriceAlerts();
    loadSuggestions();
  }, []);

  const loadSavedProducts = async () => {
    try {
      const result = await shoppingApi.getSavedProducts();
      setSavedProducts(result.savedProducts || []);
    } catch (error) {
      console.error('Failed to load saved products:', error);
    }
  };

  const loadPriceAlerts = async () => {
    try {
      const result = await shoppingApi.getPriceAlerts();
      setPriceAlerts(result.priceAlerts || []);
    } catch (error) {
      console.error('Failed to load price alerts:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const result = await shoppingApi.getSuggestions();
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
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
        result = await shoppingApi.searchProducts(searchQuery, selectedSources, {
          minPrice,
          maxPrice,
          minDealScore
        });
      } else {
        result = await shoppingApi.searchByHobby(hobbies, searchQuery);
      }

      setProducts(result.products || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchMode, searchQuery, hobbies, selectedSources, minPrice, maxPrice, minDealScore]);

  const handleStopSearch = useCallback(async () => {
    try {
      await shoppingApi.stopSearch();
      setLoading(false);
    } catch (error) {
      console.error('Failed to stop search:', error);
    }
  }, []);

  const handleSaveProduct = useCallback(async (productId: string) => {
    try {
      await shoppingApi.saveProduct(productId);
      loadSavedProducts();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isSaved: true } : p));
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  }, []);

  const handleUnsaveProduct = useCallback(async (productId: string) => {
    try {
      await shoppingApi.unsaveProduct(productId);
      loadSavedProducts();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isSaved: false } : p));
    } catch (error) {
      console.error('Failed to unsave product:', error);
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
      console.error('Failed to set price alert:', error);
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

  // Utilities
  const getDealScoreColor = useCallback((score?: number): string => {
    if (!score) return 'slate';
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
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
    showFilters,
    showSaved,
    showAlerts,
    priceAlertModal,
    targetPriceInput,
    minPrice,
    maxPrice,
    minDealScore,
    
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
    getDealScoreColor
  };
};

export default useShopping;

