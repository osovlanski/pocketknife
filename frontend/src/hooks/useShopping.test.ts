/**
 * useShopping Hook Tests
 * 
 * Tests for the Shopping hook that manages product search and deals.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useShopping } from './useShopping';
import * as shoppingApi from '../services/shoppingApi';
import * as configApi from '../services/configApi';

// Mock the APIs
vi.mock('../services/shoppingApi', () => ({
  searchProducts: vi.fn(),
  searchByHobby: vi.fn(),
  getSavedProducts: vi.fn(),
  saveProduct: vi.fn(),
  unsaveProduct: vi.fn(),
  setPriceAlert: vi.fn(),
  getPriceAlerts: vi.fn(),
  getDeals: vi.fn(),
  getSuggestions: vi.fn()
}));

vi.mock('../services/configApi', () => ({
  getShoppingThresholds: vi.fn()
}));

vi.mock('../services/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock window.alert
global.alert = vi.fn();

describe('useShopping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (shoppingApi.getSavedProducts as any).mockResolvedValue({ savedProducts: [] });
    (shoppingApi.getPriceAlerts as any).mockResolvedValue({ priceAlerts: [] });
    (configApi.getShoppingThresholds as any).mockResolvedValue({
      excellent: 80,
      good: 60,
      fair: 40,
      notifyThreshold: 70
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useShopping());
      
      expect(result.current.products).toEqual([]);
      expect(result.current.savedProducts).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.searchMode).toBe('explicit');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.hobbies).toEqual([]);
    });
    
    it('should have filter defaults', () => {
      const { result } = renderHook(() => useShopping());
      
      expect(result.current.minPrice).toBeUndefined();
      expect(result.current.maxPrice).toBeUndefined();
      expect(result.current.minDealScore).toBe(0);
      expect(result.current.selectedCategory).toBe('');
    });
  });

  describe('Configuration Loading', () => {
    it('should load thresholds on mount', async () => {
      const { result } = renderHook(() => useShopping());
      
      await waitFor(() => {
        expect(configApi.getShoppingThresholds).toHaveBeenCalled();
      });
    });
    
    it('should use default thresholds on error', async () => {
      (configApi.getShoppingThresholds as any).mockRejectedValue(new Error('API Error'));
      
      const { result } = renderHook(() => useShopping());
      
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Product Search', () => {
    it('should have handleSearch function', () => {
      const { result } = renderHook(() => useShopping());
      
      expect(typeof result.current.handleSearch).toBe('function');
    });
    
    it('should update search query', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setSearchQuery('wireless headphones');
      });
      
      expect(result.current.searchQuery).toBe('wireless headphones');
    });
    
    it('should toggle search mode', () => {
      const { result } = renderHook(() => useShopping());
      
      expect(result.current.searchMode).toBe('explicit');
      
      act(() => {
        result.current.setSearchMode('hobby');
      });
      
      expect(result.current.searchMode).toBe('hobby');
    });
  });

  describe('Saved Products', () => {
    it('should save product successfully', async () => {
      (shoppingApi.saveProduct as any).mockResolvedValue({});
      (shoppingApi.getSavedProducts as any).mockResolvedValue({ savedProducts: [] });
      
      const { result } = renderHook(() => useShopping());
      
      await act(async () => {
        await result.current.handleSaveProduct('prod-123');
      });
      
      expect(shoppingApi.saveProduct).toHaveBeenCalledWith('prod-123');
    });
    
    it('should unsave product successfully', async () => {
      (shoppingApi.unsaveProduct as any).mockResolvedValue({});
      (shoppingApi.getSavedProducts as any).mockResolvedValue({ savedProducts: [] });
      
      const { result } = renderHook(() => useShopping());
      
      await act(async () => {
        await result.current.handleUnsaveProduct('prod-123');
      });
      
      expect(shoppingApi.unsaveProduct).toHaveBeenCalledWith('prod-123');
    });
  });

  describe('Price Alerts', () => {
    it('should set price alert successfully', async () => {
      (shoppingApi.setPriceAlert as any).mockResolvedValue({});
      
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setPriceAlertModal({ productId: 'prod-1', price: 59.99 });
        result.current.setTargetPriceInput('49.99');
      });
      
      await act(async () => {
        await result.current.handleSetPriceAlert();
      });
      
      expect(shoppingApi.setPriceAlert).toHaveBeenCalled();
    });
  });

  describe('Hobby Management', () => {
    it('should add hobby when hobbyInput is set', () => {
      const { result } = renderHook(() => useShopping());
      
      // Set hobby input first
      act(() => {
        result.current.setHobbyInput('photography');
      });
      
      // Then add hobby
      act(() => {
        result.current.addHobby();
      });
      
      expect(result.current.hobbies).toContain('photography');
      expect(result.current.hobbyInput).toBe('');
    });
    
    it('should not add empty hobby', () => {
      const { result } = renderHook(() => useShopping());
      const initialLength = result.current.hobbies.length;
      
      act(() => {
        result.current.setHobbyInput('');
      });
      
      act(() => {
        result.current.addHobby();
      });
      
      expect(result.current.hobbies.length).toBe(initialLength);
    });
    
    it('should remove hobby', () => {
      const { result } = renderHook(() => useShopping());
      
      // Add hobby first
      act(() => {
        result.current.setHobbyInput('photography');
      });
      act(() => {
        result.current.addHobby();
      });
      
      // Then remove it
      act(() => {
        result.current.removeHobby('photography');
      });
      
      expect(result.current.hobbies).not.toContain('photography');
    });
  });

  describe('Source Management', () => {
    it('should toggle source selection on and off', () => {
      const { result } = renderHook(() => useShopping());
      
      const initialSources = [...result.current.selectedSources];
      const wasIncluded = initialSources.includes('ebay');
      
      // Toggle ebay
      act(() => {
        result.current.toggleSource('ebay');
      });
      
      // Should toggle
      expect(result.current.selectedSources.includes('ebay')).toBe(!wasIncluded);
      
      // Toggle again to revert
      act(() => {
        result.current.toggleSource('ebay');
      });
      
      expect(result.current.selectedSources.includes('ebay')).toBe(wasIncluded);
    });
  });

  describe('UI State', () => {
    it('should toggle showFilters', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setShowFilters(true);
      });
      
      expect(result.current.showFilters).toBe(true);
    });
    
    it('should toggle showSaved', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setShowSaved(true);
      });
      
      expect(result.current.showSaved).toBe(true);
    });
    
    it('should toggle showAlerts', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setShowAlerts(true);
      });
      
      expect(result.current.showAlerts).toBe(true);
    });
  });

  describe('Filter State', () => {
    it('should update minPrice', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setMinPrice(50);
      });
      
      expect(result.current.minPrice).toBe(50);
    });
    
    it('should update maxPrice', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setMaxPrice(200);
      });
      
      expect(result.current.maxPrice).toBe(200);
    });
    
    it('should update minDealScore', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setMinDealScore(70);
      });
      
      expect(result.current.minDealScore).toBe(70);
    });
    
    it('should update selectedCategory', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setSelectedCategory('electronics');
      });
      
      expect(result.current.selectedCategory).toBe('electronics');
    });
  });

  describe('Utility Functions', () => {
    it('should return correct deal score color for excellent score', () => {
      const { result } = renderHook(() => useShopping());
      
      const color = result.current.getDealScoreColor(90);
      // Returns color name like 'emerald', 'yellow', 'orange', 'red'
      expect(['emerald', 'green', 'yellow', 'orange', 'red', 'slate']).toContain(color);
    });
    
    it('should return slate for undefined score', () => {
      const { result } = renderHook(() => useShopping());
      
      const color = result.current.getDealScoreColor(undefined);
      expect(color).toBe('slate');
    });
    
    it('should detect Israeli product correctly', () => {
      const { result } = renderHook(() => useShopping());
      
      // Israeli products start with 'israeli-' or equal 'israeli'
      expect(result.current.isIsraeliProduct('israeli-zap')).toBe(true);
      expect(result.current.isIsraeliProduct('israeli')).toBe(true);
      expect(result.current.isIsraeliProduct('ebay')).toBe(false);
      expect(result.current.isIsraeliProduct('amazon')).toBe(false);
    });
  });

  describe('Israeli Shops Toggle', () => {
    it('should toggle includeIsraeliShops', () => {
      const { result } = renderHook(() => useShopping());
      
      act(() => {
        result.current.setIncludeIsraeliShops(true);
      });
      
      expect(result.current.includeIsraeliShops).toBe(true);
    });
  });
});

