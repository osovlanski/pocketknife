/**
 * useCooking Hook
 * 
 * Custom hook for managing Cooking Agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import * as cookingApi from '../services/cookingApi';
import logger from '../services/logger';
import type {
  InventoryItem,
  InventoryItemData,
  ShoppingList,
  Recipe,
  SavedRecipe,
  InventorySummary,
  RecipeSearchParams,
  RecipeOrderResult,
  DeliveryProviderInfo,
  WoltDeliveryResponse,
  CustomerContact
} from '../services/cookingApi';

export interface UseCookingReturn {
  // State
  items: InventoryItem[];
  lists: ShoppingList[];
  recipes: Recipe[];
  savedRecipes: SavedRecipe[];
  wishlist: SavedRecipe[];
  summary: InventorySummary | null;
  suggestions: string[];
  expiringItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  loading: boolean;
  searchingRecipes: boolean;
  activeTab: 'inventory' | 'lists' | 'recipes' | 'wishlist';
  selectedCategory: string | null;
  showAddItem: boolean;
  showAddList: boolean;
  newItem: InventoryItemData;
  newListName: string;

  // Actions
  setActiveTab: (tab: 'inventory' | 'lists' | 'recipes' | 'wishlist') => void;
  setSelectedCategory: (category: string | null) => void;
  setShowAddItem: (show: boolean) => void;
  setShowAddList: (show: boolean) => void;
  setNewItem: (item: InventoryItemData) => void;
  setNewListName: (name: string) => void;

  // Item actions
  handleAddItem: () => Promise<void>;
  handleUpdateItem: (id: string, data: Partial<InventoryItemData>) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, status: string) => Promise<void>;

  // List actions
  handleCreateList: () => Promise<void>;
  handleAddListItem: (listId: string, item: { name: string; quantity?: number; unit?: string }) => Promise<void>;
  handleToggleListItem: (itemId: string, isChecked: boolean) => Promise<void>;
  handleCompleteList: (listId: string) => Promise<void>;
  handleDeleteList: (listId: string) => Promise<void>;
  handleDeleteListItem: (listId: string, itemId: string) => Promise<void>;
  handleGenerateList: (params: { prompt?: string; fromLowStock?: boolean; fromExpiring?: boolean }) => Promise<void>;

  // Recipe actions
  handleFindRecipes: (params?: RecipeSearchParams) => Promise<void>;
  handleSaveRecipe: (recipe: Recipe, notes?: string) => Promise<void>;

  // Wishlist actions
  handleAddToWishlist: (recipe: Recipe) => Promise<void>;
  handleRemoveFromWishlist: (recipeId: string) => Promise<void>;

  // Delivery actions
  handleCreateRecipeOrder: (recipeId: number) => Promise<void>;
  handleLoadDeliveryProviders: () => Promise<void>;
  handleCloseOrderPreview: () => void;
  handleOpenOrderLink: () => void;
  
  // Delivery state
  orderPreview: RecipeOrderResult | null;
  deliveryProviders: DeliveryProviderInfo[];
  selectedRecipeForOrder: Recipe | null;
  orderLoading: boolean;
  showOrderPreview: boolean;
  setSelectedRecipeForOrder: (recipe: Recipe | null) => void;
  setShowOrderPreview: (show: boolean) => void;

  // Wolt order actions
  handlePlaceWoltOrder: (orderId: string, contact: CustomerContact, instructions?: string) => Promise<WoltDeliveryResponse | null>;
  handleGetWoltStatus: (deliveryId: string) => Promise<WoltDeliveryResponse | null>;
  handleCancelWoltOrder: (deliveryId: string) => Promise<boolean>;
  woltDelivery: WoltDeliveryResponse | null;
  woltOrderLoading: boolean;

  // Refresh
  refresh: () => Promise<void>;
}

const DEFAULT_NEW_ITEM: InventoryItemData = {
  name: '',
  category: 'other',
  quantity: 1,
  unit: 'pcs'
};

export const useCooking = (): UseCookingReturn => {
  // Core state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [wishlist, setWishlist] = useState<SavedRecipe[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchingRecipes, setSearchingRecipes] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'lists' | 'recipes' | 'wishlist'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddList, setShowAddList] = useState(false);

  // Form state
  const [newItem, setNewItem] = useState<InventoryItemData>(DEFAULT_NEW_ITEM);
  const [newListName, setNewListName] = useState('');

  // Delivery state
  const [orderPreview, setOrderPreview] = useState<RecipeOrderResult | null>(null);
  const [deliveryProviders, setDeliveryProviders] = useState<DeliveryProviderInfo[]>([]);
  const [selectedRecipeForOrder, setSelectedRecipeForOrder] = useState<Recipe | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [showOrderPreview, setShowOrderPreview] = useState(false);

  // Wolt order state
  const [woltDelivery, setWoltDelivery] = useState<WoltDeliveryResponse | null>(null);
  const [woltOrderLoading, setWoltOrderLoading] = useState(false);

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
        loadSavedRecipes(),
        loadWishlist()
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = async () => {
    try {
      const result = await cookingApi.getItems(
        selectedCategory ? { category: selectedCategory } : undefined
      );
      setItems(result.items || []);
    } catch (error) {
      logger.error('Failed to load inventory items', { error });
    }
  };

  const loadLists = async () => {
    try {
      const result = await cookingApi.getLists();
      setLists(result.lists || []);
    } catch (error) {
      logger.error('Failed to load shopping lists', { error });
    }
  };

  const loadSummary = async () => {
    try {
      const result = await cookingApi.getSummary();
      setSummary(result.summary);
    } catch (error) {
      logger.error('Failed to load summary', { error });
    }
  };

  const loadAlerts = async () => {
    try {
      const [expiringResult, lowStockResult] = await Promise.all([
        cookingApi.getExpiringItems(),
        cookingApi.getLowStockItems()
      ]);
      setExpiringItems(expiringResult.items || []);
      setLowStockItems(lowStockResult.items || []);
    } catch (error) {
      logger.error('Failed to load alerts', { error });
    }
  };

  const loadSuggestions = async () => {
    try {
      const result = await cookingApi.getSuggestions();
      setSuggestions(result.suggestions || []);
    } catch (error) {
      logger.error('Failed to load suggestions', { error });
    }
  };

  const loadSavedRecipes = async () => {
    try {
      const result = await cookingApi.getSavedRecipes();
      setSavedRecipes(result.recipes || []);
    } catch (error) {
      logger.error('Failed to load saved recipes', { error });
    }
  };

  const loadWishlist = async () => {
    try {
      const result = await cookingApi.getWishlist();
      setWishlist(result.wishlist || []);
    } catch (error) {
      logger.error('Failed to load wishlist', { error });
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
      await cookingApi.addItem(newItem);
      setNewItem(DEFAULT_NEW_ITEM);
      setShowAddItem(false);
      await Promise.all([loadItems(), loadSummary()]);
    } catch (error) {
      logger.error('Failed to add item', { error });
      alert('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [newItem]);

  const handleUpdateItem = useCallback(async (id: string, data: Partial<InventoryItemData>) => {
    try {
      await cookingApi.updateItem(id, data);
      await loadItems();
    } catch (error) {
      logger.error('Failed to update item', { error });
    }
  }, []);

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await cookingApi.deleteItem(id);
      await Promise.all([loadItems(), loadSummary()]);
    } catch (error) {
      logger.error('Failed to delete item', { error });
    }
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    try {
      await cookingApi.updateItemStatus(id, status);
      await Promise.all([loadItems(), loadAlerts()]);
    } catch (error) {
      logger.error('Failed to update status', { error });
    }
  }, []);

  // ==========================================================================
  // LIST ACTIONS
  // ==========================================================================

  const handleCreateList = useCallback(async () => {
    if (!newListName.trim()) return;

    try {
      setLoading(true);
      await cookingApi.createList(newListName);
      setNewListName('');
      setShowAddList(false);
      await loadLists();
    } catch (error) {
      logger.error('Failed to create list', { error });
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
      await cookingApi.addListItem(listId, item);
      await loadLists();
    } catch (error) {
      logger.error('Failed to add list item', { error });
    }
  }, []);

  const handleToggleListItem = useCallback(async (itemId: string, isChecked: boolean) => {
    try {
      await cookingApi.toggleListItem(itemId, isChecked);
      await loadLists();
    } catch (error) {
      logger.error('Failed to toggle list item', { error });
    }
  }, []);

  const handleCompleteList = useCallback(async (listId: string) => {
    try {
      setLoading(true);
      await cookingApi.completeList(listId);
      await Promise.all([loadLists(), loadItems(), loadSummary()]);
    } catch (error) {
      logger.error('Failed to complete list', { error });
      alert('Failed to complete list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteList = useCallback(async (listId: string) => {
    try {
      await cookingApi.deleteList(listId);
      await loadLists();
    } catch (error) {
      logger.error('Failed to delete list', { error });
      alert('Failed to delete list. Please try again.');
    }
  }, []);

  const handleDeleteListItem = useCallback(async (listId: string, itemId: string) => {
    try {
      await cookingApi.deleteListItem(listId, itemId);
      await loadLists();
    } catch (error) {
      logger.error('Failed to delete list item', { error });
    }
  }, []);

  const handleGenerateList = useCallback(async (params: { 
    prompt?: string; 
    fromLowStock?: boolean; 
    fromExpiring?: boolean 
  }) => {
    try {
      setLoading(true);
      await cookingApi.generateShoppingList(params);
      await loadLists();
    } catch (error) {
      logger.error('Failed to generate shopping list', { error });
      alert('Failed to generate shopping list. Please try again.');
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
      const result = await cookingApi.findRecipes(params || { useAvailableOnly: true });
      setRecipes(result.recipes || []);
    } catch (error) {
      logger.error('Failed to find recipes', { error });
      alert('Failed to search recipes. Please try again.');
    } finally {
      setSearchingRecipes(false);
    }
  }, []);

  const handleSaveRecipe = useCallback(async (recipe: Recipe, notes?: string) => {
    try {
      await cookingApi.saveRecipe(recipe, notes);
      await loadSavedRecipes();
    } catch (error) {
      logger.error('Failed to save recipe', { error });
      alert('Failed to save recipe. Please try again.');
    }
  }, []);

  // ==========================================================================
  // WISHLIST ACTIONS
  // ==========================================================================

  const handleAddToWishlist = useCallback(async (recipe: Recipe) => {
    try {
      await cookingApi.addToWishlist(recipe);
      await loadWishlist();
    } catch (error) {
      logger.error('Failed to add to wishlist', { error });
      alert('Failed to add recipe to wishlist. Please try again.');
    }
  }, []);

  const handleRemoveFromWishlist = useCallback(async (recipeId: string) => {
    try {
      await cookingApi.removeFromWishlist(recipeId);
      await loadWishlist();
    } catch (error) {
      logger.error('Failed to remove from wishlist', { error });
      alert('Failed to remove recipe from wishlist. Please try again.');
    }
  }, []);

  // ==========================================================================
  // DELIVERY ACTIONS
  // ==========================================================================

  const handleCreateRecipeOrder = useCallback(async (recipeId: number) => {
    try {
      setOrderLoading(true);
      const result = await cookingApi.createRecipeOrder(recipeId, { checkInventory: true });
      setOrderPreview(result.recipeOrder);
      setShowOrderPreview(true);
    } catch (error) {
      logger.error('Failed to create recipe order', { error });
      alert('Failed to create order. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  }, []);

  const handleLoadDeliveryProviders = useCallback(async () => {
    try {
      const result = await cookingApi.getDeliveryProviders();
      setDeliveryProviders(result.deliveryProviders || []);
    } catch (error) {
      logger.error('Failed to load delivery providers', { error });
    }
  }, []);

  const handleCloseOrderPreview = useCallback(() => {
    setShowOrderPreview(false);
    setOrderPreview(null);
    setSelectedRecipeForOrder(null);
  }, []);

  const handleOpenOrderLink = useCallback(() => {
    if (orderPreview?.orderLink?.url) {
      window.open(orderPreview.orderLink.url, '_blank');
    }
  }, [orderPreview]);

  // ==========================================================================
  // WOLT ORDER ACTIONS
  // ==========================================================================

  const handlePlaceWoltOrder = useCallback(async (
    orderId: string,
    contact: CustomerContact,
    instructions?: string
  ): Promise<WoltDeliveryResponse | null> => {
    try {
      setWoltOrderLoading(true);
      const result = await cookingApi.placeWoltOrder(orderId, contact, instructions);
      setWoltDelivery(result.woltDelivery);
      return result.woltDelivery;
    } catch (error) {
      logger.error('Failed to place Wolt order', { error });
      alert('Failed to place Wolt order. Please try again.');
      return null;
    } finally {
      setWoltOrderLoading(false);
    }
  }, []);

  const handleGetWoltStatus = useCallback(async (
    deliveryId: string
  ): Promise<WoltDeliveryResponse | null> => {
    try {
      const result = await cookingApi.getWoltOrderStatus(deliveryId);
      setWoltDelivery(result.woltDelivery);
      return result.woltDelivery;
    } catch (error) {
      logger.error('Failed to get Wolt order status', { error });
      return null;
    }
  }, []);

  const handleCancelWoltOrder = useCallback(async (
    deliveryId: string
  ): Promise<boolean> => {
    try {
      setWoltOrderLoading(true);
      const result = await cookingApi.cancelWoltOrder(deliveryId);
      if (result.woltOrderCancelled) {
        setWoltDelivery(null);
      }
      return result.woltOrderCancelled;
    } catch (error) {
      logger.error('Failed to cancel Wolt order', { error });
      return false;
    } finally {
      setWoltOrderLoading(false);
    }
  }, []);

  return {
    // State
    items,
    lists,
    recipes,
    savedRecipes,
    wishlist,
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
    handleDeleteList,
    handleDeleteListItem,
    handleGenerateList,

    // Recipe actions
    handleFindRecipes,
    handleSaveRecipe,

    // Wishlist actions
    handleAddToWishlist,
    handleRemoveFromWishlist,

    // Delivery actions
    handleCreateRecipeOrder,
    handleLoadDeliveryProviders,
    handleCloseOrderPreview,
    handleOpenOrderLink,

    // Delivery state
    orderPreview,
    deliveryProviders,
    selectedRecipeForOrder,
    orderLoading,
    showOrderPreview,
    setSelectedRecipeForOrder,
    setShowOrderPreview,

    // Wolt order
    handlePlaceWoltOrder,
    handleGetWoltStatus,
    handleCancelWoltOrder,
    woltDelivery,
    woltOrderLoading,

    // Refresh
    refresh
  };
};

export default useCooking;
