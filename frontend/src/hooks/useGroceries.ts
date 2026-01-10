/**
 * useGroceries Hook
 * 
 * Custom hook for managing Groceries Agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as groceriesApi from '../services/groceriesApi';
import type {
  GroceryItem,
  GroceryItemData,
  GroceryList,
  Recipe,
  SavedRecipe,
  InventorySummary,
  RecipeSearchParams
} from '../services/groceriesApi';

export interface UseGroceriesReturn {
  // State
  items: GroceryItem[];
  lists: GroceryList[];
  recipes: Recipe[];
  savedRecipes: SavedRecipe[];
  summary: InventorySummary | null;
  suggestions: string[];
  expiringItems: GroceryItem[];
  lowStockItems: GroceryItem[];
  loading: boolean;
  searchingRecipes: boolean;
  activeTab: 'inventory' | 'lists' | 'recipes';
  selectedCategory: string | null;
  showAddItem: boolean;
  showAddList: boolean;
  newItem: GroceryItemData;
  newListName: string;

  // Actions
  setActiveTab: (tab: 'inventory' | 'lists' | 'recipes') => void;
  setSelectedCategory: (category: string | null) => void;
  setShowAddItem: (show: boolean) => void;
  setShowAddList: (show: boolean) => void;
  setNewItem: (item: GroceryItemData) => void;
  setNewListName: (name: string) => void;

  // Item actions
  handleAddItem: () => Promise<void>;
  handleUpdateItem: (id: string, data: Partial<GroceryItemData>) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, status: string) => Promise<void>;

  // List actions
  handleCreateList: () => Promise<void>;
  handleAddListItem: (listId: string, item: { name: string; quantity?: number; unit?: string }) => Promise<void>;
  handleToggleListItem: (itemId: string, isChecked: boolean) => Promise<void>;
  handleCompleteList: (listId: string) => Promise<void>;

  // Recipe actions
  handleFindRecipes: (params?: RecipeSearchParams) => Promise<void>;
  handleSaveRecipe: (recipe: Recipe, notes?: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

const DEFAULT_NEW_ITEM: GroceryItemData = {
  name: '',
  category: 'other',
  quantity: 1,
  unit: 'pcs'
};

export const useGroceries = (): UseGroceriesReturn => {
  // Core state
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expiringItems, setExpiringItems] = useState<GroceryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<GroceryItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchingRecipes, setSearchingRecipes] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'lists' | 'recipes'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddList, setShowAddList] = useState(false);

  // Form state
  const [newItem, setNewItem] = useState<GroceryItemData>(DEFAULT_NEW_ITEM);
  const [newListName, setNewListName] = useState('');

  // Load data on mount
  useEffect(() => {
    refresh();
  }, []);

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadItems(),
        loadLists(),
        loadSummary(),
        loadAlerts(),
        loadSuggestions(),
        loadSavedRecipes()
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = async () => {
    try {
      const result = await groceriesApi.getItems(
        selectedCategory ? { category: selectedCategory } : undefined
      );
      setItems(result.items || []);
    } catch (error) {
      console.error('Failed to load grocery items:', error);
    }
  };

  const loadLists = async () => {
    try {
      const result = await groceriesApi.getLists();
      setLists(result.lists || []);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const result = await groceriesApi.getSummary();
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const [expiringResult, lowStockResult] = await Promise.all([
        groceriesApi.getExpiringItems(),
        groceriesApi.getLowStockItems()
      ]);
      setExpiringItems(expiringResult.items || []);
      setLowStockItems(lowStockResult.items || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const result = await groceriesApi.getSuggestions();
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const loadSavedRecipes = async () => {
    try {
      const result = await groceriesApi.getSavedRecipes();
      setSavedRecipes(result.recipes || []);
    } catch (error) {
      console.error('Failed to load saved recipes:', error);
    }
  };

  // Reload items when category changes
  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  // ==========================================================================
  // ITEM ACTIONS
  // ==========================================================================

  const handleAddItem = useCallback(async () => {
    if (!newItem.name.trim()) return;

    try {
      setLoading(true);
      await groceriesApi.addItem(newItem);
      setNewItem(DEFAULT_NEW_ITEM);
      setShowAddItem(false);
      await Promise.all([loadItems(), loadSummary()]);
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [newItem]);

  const handleUpdateItem = useCallback(async (id: string, data: Partial<GroceryItemData>) => {
    try {
      await groceriesApi.updateItem(id, data);
      await loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await groceriesApi.deleteItem(id);
      await Promise.all([loadItems(), loadSummary()]);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    try {
      await groceriesApi.updateItemStatus(id, status);
      await Promise.all([loadItems(), loadAlerts()]);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, []);

  // ==========================================================================
  // LIST ACTIONS
  // ==========================================================================

  const handleCreateList = useCallback(async () => {
    if (!newListName.trim()) return;

    try {
      setLoading(true);
      await groceriesApi.createList(newListName);
      setNewListName('');
      setShowAddList(false);
      await loadLists();
    } catch (error) {
      console.error('Failed to create list:', error);
      alert('Failed to create list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [newListName]);

  const handleAddListItem = useCallback(async (
    listId: string,
    item: { name: string; quantity?: number; unit?: string }
  ) => {
    try {
      await groceriesApi.addListItem(listId, item);
      await loadLists();
    } catch (error) {
      console.error('Failed to add list item:', error);
    }
  }, []);

  const handleToggleListItem = useCallback(async (itemId: string, isChecked: boolean) => {
    try {
      await groceriesApi.toggleListItem(itemId, isChecked);
      await loadLists();
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  }, []);

  const handleCompleteList = useCallback(async (listId: string) => {
    try {
      setLoading(true);
      await groceriesApi.completeList(listId);
      await Promise.all([loadLists(), loadItems(), loadSummary()]);
    } catch (error) {
      console.error('Failed to complete list:', error);
      alert('Failed to complete list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // RECIPE ACTIONS
  // ==========================================================================

  const handleFindRecipes = useCallback(async (params?: RecipeSearchParams) => {
    try {
      setSearchingRecipes(true);
      const result = await groceriesApi.findRecipes(params || { useAvailableOnly: true });
      setRecipes(result.recipes || []);
    } catch (error) {
      console.error('Failed to find recipes:', error);
      alert('Failed to search recipes. Please try again.');
    } finally {
      setSearchingRecipes(false);
    }
  }, []);

  const handleSaveRecipe = useCallback(async (recipe: Recipe, notes?: string) => {
    try {
      await groceriesApi.saveRecipe(recipe, notes);
      await loadSavedRecipes();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe. Please try again.');
    }
  }, []);

  return {
    // State
    items,
    lists,
    recipes,
    savedRecipes,
    summary,
    suggestions,
    expiringItems,
    lowStockItems,
    loading,
    searchingRecipes,
    activeTab,
    selectedCategory,
    showAddItem,
    showAddList,
    newItem,
    newListName,

    // Actions
    setActiveTab,
    setSelectedCategory,
    setShowAddItem,
    setShowAddList,
    setNewItem,
    setNewListName,

    // Item actions
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    handleUpdateStatus,

    // List actions
    handleCreateList,
    handleAddListItem,
    handleToggleListItem,
    handleCompleteList,

    // Recipe actions
    handleFindRecipes,
    handleSaveRecipe,

    // Refresh
    refresh
  };
};

export default useGroceries;
