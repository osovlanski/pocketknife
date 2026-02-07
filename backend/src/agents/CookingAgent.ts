/**
 * Cooking Agent
 * 
 * Manages kitchen inventory, shopping lists, and recipe discovery.
 * 
 * Features:
 * - Manual inventory item CRUD operations
 * - Automatic item detection from invoices/receipts
 * - Recipe search based on available ingredients
 * - Recipe wishlist with images
 * - Shopping list management
 * - Expiry tracking and low stock alerts
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getManifest } from './manifests';
import { cookingService, CookingItemData, CookingFilters, RecipeSearchParams, recipeDeliveryService, ramiLevyService } from '../services/cooking';
import type { RamiLevyTokens, RamiLevyCart, RamiLevyProduct, RamiLevySearchResult } from '../services/cooking';
import { deliveryService, groceryDeepLinkProvider } from '../services/delivery';
import type { RecipeOrderResult, DeliveryProviderInfo, WoltDeliveryResponse, UserDeliveryAddress } from '../types/delivery';
import type { GroceryOrderResult, GroceryStore } from '../services/delivery';

interface CookingParams extends AgentParams {
  action:
    | 'add-item'
    | 'update-item'
    | 'delete-item'
    | 'get-items'
    | 'update-status'
    | 'get-expiring'
    | 'get-low-stock'
    | 'create-list'
    | 'get-lists'
    | 'add-list-item'
    | 'toggle-list-item'
    | 'complete-list'
    | 'find-recipes'
    | 'save-recipe'
    | 'get-saved-recipes'
    | 'add-to-wishlist'
    | 'get-wishlist'
    | 'remove-from-wishlist'
    | 'process-invoice'
    | 'match-invoice'
    | 'get-summary'
    | 'get-suggestions'
    | 'create-recipe-order'
    | 'get-delivery-providers'
    | 'place-wolt-order'
    | 'get-wolt-order-status'
    | 'cancel-wolt-order'
    // Grocery ordering with deep links
    | 'order-shopping-list'
    | 'order-groceries'
    | 'get-grocery-stores'
    // Rami Levy integration (auto cart population)
    | 'rami-levy-setup'
    | 'rami-levy-status'
    | 'rami-levy-search'
    | 'rami-levy-add-to-cart'
    | 'rami-levy-remove-from-cart'
    | 'rami-levy-update-quantity'
    | 'rami-levy-clear-cart'
    | 'rami-levy-get-cart'
    | 'rami-levy-checkout'
    | 'rami-levy-order-ingredients'
    | 'rami-levy-delete-tokens';
  itemData?: CookingItemData;
  itemId?: string;
  listId?: string;
  listItemId?: string;
  listName?: string;
  listDescription?: string;
  listItemData?: { name: string; quantity?: number; unit?: string; category?: string };
  isChecked?: boolean;
  status?: string;
  filters?: CookingFilters;
  recipeParams?: RecipeSearchParams;
  recipe?: any;
  recipeId?: string;
  notes?: string;
  invoiceId?: string;
  invoiceDate?: string;
  merchant?: string;
  invoiceItems?: Array<{ name: string; quantity?: number; unit?: string; price?: number }>;
  // Delivery order params
  spoonacularRecipeId?: number;
  checkInventory?: boolean;
  providerId?: string;
  // Wolt delivery params
  orderId?: string;
  deliveryAddress?: UserDeliveryAddress;
  customerContact?: { name: string; phone: string };
  deliveryInstructions?: string;
  woltDeliveryId?: string;
  // Grocery ordering params
  preferredStores?: string[];
  groceryItems?: Array<{ name: string; quantity?: number; unit?: string }>;
  // Rami Levy params
  ramiLevyTokens?: RamiLevyTokens;
  skipValidation?: boolean;
  searchQuery?: string;
  productId?: number;
  productIds?: number[];
  quantity?: number;
  storeId?: string;
  ingredients?: Array<{ name: string; quantity?: number }>;
  autoSelectFirst?: boolean;
}

interface CookingResult {
  item?: any;
  items?: any[];
  list?: any;
  lists?: any[];
  recipes?: any[];
  recipe?: any;
  wishlist?: any[];
  summary?: any;
  suggestions?: string[];
  processed?: number;
  matched?: number;
  created?: number;
  // Delivery results
  recipeOrder?: RecipeOrderResult;
  deliveryProviders?: DeliveryProviderInfo[];
  woltDelivery?: WoltDeliveryResponse;
  woltOrderCancelled?: boolean;
  // Grocery ordering results
  groceryOrder?: GroceryOrderResult;
  groceryStores?: GroceryStore[];
  // Rami Levy results
  ramiLevyStatus?: {
    isValid: boolean;
    userId: string;
    lastUsed?: Date;
    errorMessage?: string;
  };
  ramiLevyProducts?: RamiLevyProduct[];
  ramiLevySearchResult?: RamiLevySearchResult;
  ramiLevyCart?: RamiLevyCart;
  ramiLevyCheckoutUrl?: string;
  ramiLevyOrder?: {
    cart: RamiLevyCart;
    checkoutUrl: string;
    matchedProducts: Array<{ ingredient: string; product: RamiLevyProduct | null }>;
    unmatchedIngredients: string[];
  };
  ramiLevyStores?: Array<{ id: string; name: string }>;
  tokensDeleted?: boolean;
}

export class CookingAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = getManifest('cooking');

  protected async run(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { action } = params;

    switch (action) {
      // Item management
      case 'add-item':
        return this.addItem(params);
      case 'update-item':
        return this.updateItem(params);
      case 'delete-item':
        return this.deleteItem(params);
      case 'get-items':
        return this.getItems(params);
      case 'update-status':
        return this.updateStatus(params);
      case 'get-expiring':
        return this.getExpiringItems(params);
      case 'get-low-stock':
        return this.getLowStockItems(params);

      // Shopping lists
      case 'create-list':
        return this.createList(params);
      case 'get-lists':
        return this.getLists(params);
      case 'add-list-item':
        return this.addListItem(params);
      case 'toggle-list-item':
        return this.toggleListItem(params);
      case 'complete-list':
        return this.completeList(params);

      // Recipes
      case 'find-recipes':
        return this.findRecipes(params);
      case 'save-recipe':
        return this.saveRecipe(params);
      case 'get-saved-recipes':
        return this.getSavedRecipes(params);

      // Recipe Wishlist
      case 'add-to-wishlist':
        return this.addToWishlist(params);
      case 'get-wishlist':
        return this.getWishlist(params);
      case 'remove-from-wishlist':
        return this.removeFromWishlist(params);

      // Invoice processing
      case 'process-invoice':
        return this.processInvoice(params);
      case 'match-invoice':
        return this.matchInvoice(params);

      // Analytics
      case 'get-summary':
        return this.getSummary(params);
      case 'get-suggestions':
        return this.getSuggestions(params);

      // Delivery
      case 'create-recipe-order':
        return this.createRecipeOrder(params);
      case 'get-delivery-providers':
        return this.getDeliveryProviders();
      case 'place-wolt-order':
        return this.placeWoltOrder(params);
      case 'get-wolt-order-status':
        return this.getWoltOrderStatus(params);
      case 'cancel-wolt-order':
        return this.cancelWoltOrder(params);

      // Grocery ordering with deep links
      case 'order-shopping-list':
        return this.orderShoppingList(params);
      case 'order-groceries':
        return this.orderGroceries(params);
      case 'get-grocery-stores':
        return this.getGroceryStores();

      // Rami Levy integration (auto cart population)
      case 'rami-levy-setup':
        return this.ramiLevySetup(params);
      case 'rami-levy-status':
        return this.ramiLevyStatus(params);
      case 'rami-levy-search':
        return this.ramiLevySearch(params);
      case 'rami-levy-add-to-cart':
        return this.ramiLevyAddToCart(params);
      case 'rami-levy-remove-from-cart':
        return this.ramiLevyRemoveFromCart(params);
      case 'rami-levy-update-quantity':
        return this.ramiLevyUpdateQuantity(params);
      case 'rami-levy-clear-cart':
        return this.ramiLevyClearCart(params);
      case 'rami-levy-get-cart':
        return this.ramiLevyGetCart(params);
      case 'rami-levy-checkout':
        return this.ramiLevyCheckout(params);
      case 'rami-levy-order-ingredients':
        return this.ramiLevyOrderIngredients(params);
      case 'rami-levy-delete-tokens':
        return this.ramiLevyDeleteTokens(params);

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ===========================================================================
  // ITEM MANAGEMENT
  // ===========================================================================

  private async addItem(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, itemData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemData) return { success: false, error: 'Item data is required' };
    if (!itemData.name) return { success: false, error: 'Item name is required' };

    this.emitLog(`🍳 Adding item to inventory: ${itemData.name}`, 'info');

    try {
      const item = await cookingService.addItem(userId, itemData);
      this.emitLog('✅ Item added to inventory', 'success');
      return { success: true, data: { item } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to add item: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async updateItem(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, itemId, itemData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };

    try {
      const item = await cookingService.updateItem(userId, itemId, itemData || {});
      this.emitLog('✅ Item updated', 'success');
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async deleteItem(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, itemId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };

    try {
      await cookingService.deleteItem(userId, itemId);
      this.emitLog('🗑️ Item removed from inventory', 'info');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getItems(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await cookingService.getItems(userId, filters);
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async updateStatus(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, itemId, status } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };
    if (!status) return { success: false, error: 'Status is required' };

    try {
      const item = await cookingService.updateItemStatus(userId, itemId, status);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getExpiringItems(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await cookingService.getExpiringItems(userId);
      if (items.length > 0) {
        this.emitLog(`⚠️ ${items.length} items expiring soon`, 'warning');
      }
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getLowStockItems(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await cookingService.getLowStockItems(userId);
      if (items.length > 0) {
        this.emitLog(`📉 ${items.length} items low in stock`, 'warning');
      }
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // SHOPPING LISTS
  // ===========================================================================

  private async createList(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, listName, listDescription } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!listName) return { success: false, error: 'List name is required' };

    try {
      const list = await cookingService.createList(userId, listName, listDescription);
      this.emitLog(`📝 Shopping list created: ${listName}`, 'success');
      return { success: true, data: { list } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getLists(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const lists = await cookingService.getLists(userId);
      return { success: true, data: { lists } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async addListItem(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { listId, listItemData } = params;

    if (!listId) return { success: false, error: 'List ID is required' };
    if (!listItemData || !listItemData.name) return { success: false, error: 'Item name is required' };

    try {
      const item = await cookingService.addListItem(listId, listItemData);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async toggleListItem(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { listItemId, isChecked } = params;

    if (!listItemId) return { success: false, error: 'List item ID is required' };
    if (isChecked === undefined) return { success: false, error: 'isChecked is required' };

    try {
      const item = await cookingService.toggleListItem(listItemId, isChecked);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async completeList(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, listId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!listId) return { success: false, error: 'List ID is required' };

    try {
      const list = await cookingService.completeList(userId, listId);
      this.emitLog('✅ Shopping list completed and inventory updated', 'success');
      return { success: true, data: { list } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // RECIPES
  // ===========================================================================

  private async findRecipes(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, recipeParams } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('🍳 Searching for recipes...', 'info');

    try {
      const recipes = await cookingService.findRecipes(userId, recipeParams || {});
      this.emitLog(`✅ Found ${recipes.length} recipes`, 'success');
      return { success: true, data: { recipes } };
    } catch (error: any) {
      this.emitLog(`❌ Recipe search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async saveRecipe(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, recipe, notes } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!recipe) return { success: false, error: 'Recipe data is required' };

    try {
      const saved = await cookingService.saveRecipe(userId, recipe, notes);
      this.emitLog(`📖 Recipe saved: ${recipe.title}`, 'success');
      return { success: true, data: { recipe: saved } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getSavedRecipes(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const recipes = await cookingService.getSavedRecipes(userId, filters as any);
      return { success: true, data: { recipes } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // RECIPE WISHLIST
  // ===========================================================================

  private async addToWishlist(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, recipe } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!recipe) return { success: false, error: 'Recipe data is required' };

    try {
      const saved = await cookingService.addToWishlist(userId, recipe);
      this.emitLog(`💝 Recipe added to wishlist: ${recipe.title}`, 'success');
      return { success: true, data: { recipe: saved } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getWishlist(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const wishlist = await cookingService.getWishlist(userId);
      return { success: true, data: { wishlist } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async removeFromWishlist(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, recipeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!recipeId) return { success: false, error: 'Recipe ID is required' };

    try {
      await cookingService.removeFromWishlist(userId, recipeId);
      this.emitLog('🗑️ Recipe removed from wishlist', 'info');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // INVOICE PROCESSING
  // ===========================================================================

  private async processInvoice(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { invoiceId, invoiceDate, merchant, invoiceItems } = params;

    if (!invoiceId) return { success: false, error: 'Invoice ID is required' };
    if (!invoiceItems || invoiceItems.length === 0) {
      return { success: false, error: 'Invoice items are required' };
    }

    this.emitLog(`📄 Processing invoice from ${merchant || 'unknown store'}...`, 'info');

    try {
      const result = await cookingService.processInvoiceItems(
        invoiceId,
        invoiceDate ? new Date(invoiceDate) : new Date(),
        merchant || 'Unknown',
        invoiceItems
      );
      this.emitLog(`✅ Processed ${result.processed} items from invoice`, 'success');
      return { success: true, data: { processed: result.processed, matched: result.matched } };
    } catch (error: any) {
      this.emitLog(`❌ Invoice processing failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async matchInvoice(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, invoiceId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!invoiceId) return { success: false, error: 'Invoice ID is required' };

    this.emitLog('🔍 Matching invoice items to inventory...', 'info');

    try {
      const result = await cookingService.matchInvoiceItems(userId, invoiceId);
      this.emitLog(`✅ Matched ${result.matched} items, created ${result.created} new`, 'success');
      return { success: true, data: { matched: result.matched, created: result.created } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  private async getSummary(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const summary = await cookingService.getInventorySummary(userId);
      return { success: true, data: { summary } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getSuggestions(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const suggestions = await cookingService.getSuggestions(userId);
      if (suggestions.length > 0) {
        this.emitLog(`💡 ${suggestions.length} items suggested for shopping`, 'info');
      }
      return { success: true, data: { suggestions } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // DELIVERY
  // ===========================================================================

  private async createRecipeOrder(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, spoonacularRecipeId, checkInventory = true, providerId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!spoonacularRecipeId) return { success: false, error: 'Recipe ID is required' };

    this.emitLog('🛒 Creating order from recipe...', 'info');
    this.emitProgress(10);

    try {
      const recipeOrder = await recipeDeliveryService.createOrderFromSpoonacularRecipe(
        spoonacularRecipeId,
        userId,
        checkInventory,
        providerId
      );

      if (!recipeOrder) {
        return { success: false, error: 'Failed to create recipe order' };
      }

      this.emitProgress(80);

      const inInventoryCount = recipeOrder.itemsInInventory.length;
      const toOrderCount = recipeOrder.itemsToOrder.length;

      if (inInventoryCount > 0) {
        this.emitLog(`📦 ${inInventoryCount} ingredients already in inventory`, 'success');
      }

      if (toOrderCount > 0) {
        this.emitLog(`🛒 ${toOrderCount} ingredients need to be ordered`, 'info');
        if (recipeOrder.orderPreview) {
          this.emitLog(`💰 Order total: ${recipeOrder.orderPreview.currency} ${recipeOrder.orderPreview.total}`, 'info');
        }
      } else {
        this.emitLog('✅ You have all ingredients in your inventory!', 'success');
      }

      if (recipeOrder.orderLink) {
        this.emitLog(`🔗 Order link ready: ${recipeOrder.orderLink.providerName}`, 'success');
      }

      this.emitProgress(100);

      return { success: true, data: { recipeOrder } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to create recipe order: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async getDeliveryProviders(): Promise<AgentResult<CookingResult>> {
    try {
      const deliveryProviders = recipeDeliveryService.getDeliveryProviders();
      this.emitLog(`📦 ${deliveryProviders.length} delivery providers available`, 'info');
      return { success: true, data: { deliveryProviders } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Place an actual Wolt Drive delivery order
   * This dispatches a courier to pick up and deliver the ingredients
   */
  private async placeWoltOrder(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { orderId, customerContact, deliveryInstructions } = params;

    if (!orderId) return { success: false, error: 'Order ID is required' };
    if (!customerContact?.name || !customerContact?.phone) {
      return { success: false, error: 'Customer contact (name and phone) is required' };
    }

    this.emitLog('🚚 Placing Wolt delivery order...', 'info');
    this.emitProgress(20);

    try {
      const woltDelivery = await deliveryService.createWoltDelivery(
        orderId,
        customerContact,
        deliveryInstructions
      );

      if (!woltDelivery) {
        return { success: false, error: 'Failed to create Wolt delivery' };
      }

      this.emitProgress(80);
      this.emitLog(`✅ Courier dispatched! Delivery ID: ${woltDelivery.id}`, 'success');
      this.emitLog(`🔗 Track your order: ${woltDelivery.tracking.url}`, 'info');
      
      if (woltDelivery.dropoff.eta) {
        this.emitLog(`⏰ Estimated delivery: ${woltDelivery.dropoff.eta}`, 'info');
      }

      this.emitProgress(100);

      return { success: true, data: { woltDelivery } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to place Wolt order: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the status of a Wolt delivery
   */
  private async getWoltOrderStatus(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { woltDeliveryId } = params;

    if (!woltDeliveryId) return { success: false, error: 'Wolt delivery ID is required' };

    try {
      const woltDelivery = await deliveryService.getWoltDeliveryStatus(woltDeliveryId);

      if (!woltDelivery) {
        return { success: false, error: 'Failed to get delivery status' };
      }

      this.emitLog(`📍 Delivery status: ${woltDelivery.status}`, 'info');

      return { success: true, data: { woltDelivery } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a Wolt delivery
   */
  private async cancelWoltOrder(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { woltDeliveryId } = params;

    if (!woltDeliveryId) return { success: false, error: 'Wolt delivery ID is required' };

    this.emitLog('🛑 Cancelling Wolt delivery...', 'info');

    try {
      const cancelled = await deliveryService.cancelWoltDelivery(woltDeliveryId);

      if (cancelled) {
        this.emitLog('✅ Delivery cancelled successfully', 'success');
      } else {
        this.emitLog('❌ Failed to cancel delivery', 'error');
      }

      return { success: cancelled, data: { woltOrderCancelled: cancelled } };
    } catch (error: any) {
      this.emitLog(`❌ Error cancelling delivery: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // GROCERY ORDERING (DEEP LINKS)
  // ===========================================================================

  /**
   * Order items from a shopping list via deep links to grocery stores
   */
  private async orderShoppingList(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, listId, preferredStores } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!listId) return { success: false, error: 'List ID is required' };

    this.emitLog('🛒 Creating grocery order from shopping list...', 'info');
    this.emitProgress(10);

    try {
      // Get the shopping list items
      const lists = await cookingService.getLists(userId);
      const list = lists.find((l: any) => l.id === listId);

      if (!list) {
        return { success: false, error: 'Shopping list not found' };
      }

      const uncheckedItems = list.items?.filter((item: any) => !item.isChecked) || [];

      if (uncheckedItems.length === 0) {
        this.emitLog('ℹ️ No unchecked items in shopping list', 'info');
        return { success: true, data: { groceryOrder: undefined } };
      }

      this.emitProgress(30);

      // Create grocery order with deep links
      const groceryOrder = await groceryDeepLinkProvider.createOrderFromShoppingList(
        uncheckedItems.map((item: any) => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit,
          category: item.category
        })),
        userId,
        preferredStores
      );

      this.emitProgress(80);

      this.emitLog(`✅ Grocery order created with ${groceryOrder.storeLinks.length} store options`, 'success');
      this.emitLog(`📦 ${groceryOrder.items.length} items ready to order`, 'info');

      // Log available stores
      for (const link of groceryOrder.storeLinks) {
        this.emitLog(`🔗 ${link.storeName}: ${link.webUrl}`, 'info');
      }

      this.emitProgress(100);

      return { success: true, data: { groceryOrder } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to create grocery order: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Order all groceries based on low stock items and suggestions
   */
  private async orderGroceries(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, preferredStores, groceryItems } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('🛒 Creating grocery order...', 'info');
    this.emitProgress(10);

    try {
      let itemsToOrder: Array<{ name: string; quantity: number; unit?: string }> = [];

      // If specific items provided, use those
      if (groceryItems && groceryItems.length > 0) {
        itemsToOrder = groceryItems.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit
        }));
        this.emitLog(`📝 Using ${itemsToOrder.length} provided items`, 'info');
      } else {
        // Otherwise, gather items from various sources
        this.emitProgress(20);

        // 1. Get low stock items
        const lowStockItems = await cookingService.getLowStockItems(userId);
        if (lowStockItems.length > 0) {
          this.emitLog(`📉 Found ${lowStockItems.length} low stock items`, 'info');
          itemsToOrder.push(...lowStockItems.map((item: any) => ({
            name: item.name,
            quantity: 1,
            unit: item.unit
          })));
        }

        this.emitProgress(40);

        // 2. Get suggestions
        const suggestions = await cookingService.getSuggestions(userId);
        if (suggestions.length > 0) {
          this.emitLog(`💡 Found ${suggestions.length} suggested items`, 'info');
          itemsToOrder.push(...suggestions.map((name: string) => ({
            name,
            quantity: 1
          })));
        }

        this.emitProgress(50);

        // 3. Get unchecked items from active shopping lists
        const lists = await cookingService.getLists(userId);
        for (const list of lists) {
          if (list.status === 'active' && list.items) {
            const uncheckedItems = list.items.filter((item: any) => !item.isChecked);
            itemsToOrder.push(...uncheckedItems.map((item: any) => ({
              name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit
            })));
          }
        }

        this.emitProgress(60);
      }

      // Remove duplicates by name
      const uniqueItems = Array.from(
        new Map(itemsToOrder.map(item => [item.name.toLowerCase(), item])).values()
      );

      if (uniqueItems.length === 0) {
        this.emitLog('ℹ️ No items to order - inventory looks good!', 'info');
        return { success: true, data: { groceryOrder: undefined } };
      }

      this.emitProgress(70);

      // Create grocery order
      const groceryOrder = await groceryDeepLinkProvider.createGroceryOrder({
        items: uniqueItems,
        userId,
        preferredStores,
        location: { country: 'IL' }
      });

      this.emitProgress(90);

      this.emitLog(`✅ Grocery order created: ${groceryOrder.items.length} items`, 'success');
      this.emitLog(`🏪 Available at ${groceryOrder.storeLinks.length} stores:`, 'info');

      for (const link of groceryOrder.storeLinks) {
        this.emitLog(`  • ${link.storeName}`, 'info');
      }

      this.emitProgress(100);

      return { success: true, data: { groceryOrder } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to create grocery order: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available grocery stores
   */
  private async getGroceryStores(): Promise<AgentResult<CookingResult>> {
    try {
      const groceryStores = groceryDeepLinkProvider.getAvailableStores('IL');
      this.emitLog(`🏪 ${groceryStores.length} grocery stores available`, 'info');
      return { success: true, data: { groceryStores } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // RAMI LEVY INTEGRATION
  // ===========================================================================

  /**
   * Setup Rami Levy authentication tokens
   */
  private async ramiLevySetup(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, ramiLevyTokens, skipValidation } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!ramiLevyTokens) return { success: false, error: 'Rami Levy tokens are required' };
    if (!ramiLevyTokens.apiKey) return { success: false, error: 'API key (Bearer token) is required' };
    if (!ramiLevyTokens.cookie) return { success: false, error: 'Cookie is required' };
    // Note: ecomToken is optional - only needed for cart operations, appears when logged in

    this.emitLog('🔐 Setting up Rami Levy authentication...', 'info');

    try {
      // Store tokens
      const stored = await ramiLevyService.storeTokens(userId, ramiLevyTokens);
      
      if (!stored) {
        return { success: false, error: 'Failed to store tokens' };
      }

      // Skip validation if requested (for debugging token issues)
      if (skipValidation) {
        this.emitLog('⚠️ Skipping validation (trust mode). Tokens saved but not verified.', 'info');
        return { 
          success: true, 
          data: { 
            ramiLevyStatus: { 
              isValid: true, 
              userId, 
              errorMessage: 'Tokens saved without validation (trust mode)' 
            },
            ramiLevyStores: ramiLevyService.getAvailableStores()
          } 
        };
      }

      // Initialize and validate
      const status = await ramiLevyService.initialize(userId);

      if (status.isValid) {
        this.emitLog('✅ Rami Levy authentication configured successfully!', 'success');
        return { 
          success: true, 
          data: { 
            ramiLevyStatus: status,
            ramiLevyStores: ramiLevyService.getAvailableStores()
          } 
        };
      } else {
        this.emitLog(`❌ Token validation failed: ${status.errorMessage}`, 'error');
        return { 
          success: false, 
          error: status.errorMessage || 'Token validation failed' 
        };
      }
    } catch (error: any) {
      this.emitLog(`❌ Setup failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Rami Levy token status
   */
  private async ramiLevyStatus(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const status = await ramiLevyService.getTokenStatus(userId);
      
      return { 
        success: true, 
        data: { 
          ramiLevyStatus: status,
          ramiLevyStores: status.isValid ? ramiLevyService.getAvailableStores() : undefined
        } 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search Rami Levy products
   */
  private async ramiLevySearch(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, searchQuery, storeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!searchQuery) return { success: false, error: 'Search query is required' };

    this.emitLog(`🔍 Searching Rami Levy for: ${searchQuery}`, 'info');

    try {
      // Initialize service for this user
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { 
          success: false, 
          error: status.errorMessage || 'Please configure Rami Levy authentication first' 
        };
      }

      const result = await ramiLevyService.searchProducts(userId, searchQuery, { storeId });

      this.emitLog(`📦 Found ${result.products.length} products`, 'success');

      return { 
        success: true, 
        data: { 
          ramiLevySearchResult: result,
          ramiLevyProducts: result.products
        } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Add products to Rami Levy cart
   */
  private async ramiLevyAddToCart(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, productId, quantity, storeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productId) return { success: false, error: 'Product ID is required' };

    this.emitLog(`🛒 Adding product ${productId} to cart...`, 'info');

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = await ramiLevyService.addToCart(
        userId,
        [{ productId, quantity: quantity || 1 }],
        { storeId }
      );

      this.emitLog(`✅ Added to cart. Total: ₪${cart.totalPrice.toFixed(2)}`, 'success');

      return { 
        success: true, 
        data: { 
          ramiLevyCart: cart,
          ramiLevyCheckoutUrl: ramiLevyService.getCheckoutUrl()
        } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to add to cart: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove products from Rami Levy cart
   */
  private async ramiLevyRemoveFromCart(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, productIds, storeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productIds || productIds.length === 0) {
      return { success: false, error: 'Product IDs are required' };
    }

    this.emitLog(`🗑️ Removing ${productIds.length} products from cart...`, 'info');

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = await ramiLevyService.removeFromCart(userId, productIds, { storeId });

      this.emitLog(`✅ Removed from cart. Items remaining: ${cart.itemCount}`, 'success');

      return { 
        success: true, 
        data: { ramiLevyCart: cart } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to remove from cart: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update product quantity in Rami Levy cart
   */
  private async ramiLevyUpdateQuantity(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, productId, quantity, storeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productId) return { success: false, error: 'Product ID is required' };
    if (quantity === undefined) return { success: false, error: 'Quantity is required' };

    this.emitLog(`🔄 Updating quantity for product ${productId}...`, 'info');

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = await ramiLevyService.updateCartQuantity(userId, productId, quantity, { storeId });

      this.emitLog(`✅ Quantity updated. Total: ₪${cart.totalPrice.toFixed(2)}`, 'success');

      return { 
        success: true, 
        data: { ramiLevyCart: cart } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to update quantity: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear Rami Levy cart
   */
  private async ramiLevyClearCart(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, storeId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('🗑️ Clearing cart...', 'info');

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = await ramiLevyService.clearCart(userId, { storeId });

      this.emitLog('✅ Cart cleared', 'success');

      return { 
        success: true, 
        data: { ramiLevyCart: cart } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to clear cart: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current Rami Levy cart
   */
  private async ramiLevyGetCart(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = ramiLevyService.getCart(userId);

      return { 
        success: true, 
        data: { 
          ramiLevyCart: cart || { items: [], totalPrice: 0, totalSavings: 0, itemCount: 0 },
          ramiLevyCheckoutUrl: ramiLevyService.getCheckoutUrl()
        } 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Rami Levy checkout URL
   */
  private async ramiLevyCheckout(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { success: false, error: 'Please configure Rami Levy authentication first' };
      }

      const cart = ramiLevyService.getCart(userId);
      const checkoutUrl = ramiLevyService.getCheckoutUrl();

      this.emitLog('🛒 Ready for checkout!', 'success');
      this.emitLog(`📍 Go to: ${checkoutUrl}`, 'info');

      return { 
        success: true, 
        data: { 
          ramiLevyCart: cart || undefined,
          ramiLevyCheckoutUrl: checkoutUrl
        } 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Order ingredients from a recipe - the main integration flow
   * This automatically searches for products and adds them to cart
   */
  private async ramiLevyOrderIngredients(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId, ingredients, storeId, autoSelectFirst = true } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!ingredients || ingredients.length === 0) {
      return { success: false, error: 'Ingredients are required' };
    }

    this.emitLog(`🍳 Ordering ${ingredients.length} ingredients from Rami Levy...`, 'info');
    this.emitProgress(10);

    try {
      // Initialize
      const status = await ramiLevyService.initialize(userId);
      if (!status.isValid) {
        return { 
          success: false, 
          error: status.errorMessage || 'Please configure Rami Levy authentication first' 
        };
      }

      this.emitProgress(20);

      // Create order from ingredients
      const order = await ramiLevyService.createOrderFromIngredients(userId, ingredients, {
        storeId,
        autoSelectFirst
      });

      this.emitProgress(80);

      // Log results
      const matched = order.matchedProducts.filter(m => m.product).length;
      const unmatched = order.unmatchedIngredients.length;

      this.emitLog(`✅ Added ${matched} products to cart`, 'success');
      
      if (unmatched > 0) {
        this.emitLog(`⚠️ ${unmatched} ingredients not found: ${order.unmatchedIngredients.join(', ')}`, 'warning');
      }

      this.emitLog(`💰 Cart total: ₪${order.cart.totalPrice.toFixed(2)}`, 'info');
      this.emitLog(`🛒 Click checkout to complete your order`, 'info');

      this.emitProgress(100);

      return { 
        success: true, 
        data: { 
          ramiLevyOrder: order,
          ramiLevyCart: order.cart,
          ramiLevyCheckoutUrl: order.checkoutUrl
        } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Order failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete Rami Levy tokens (logout)
   */
  private async ramiLevyDeleteTokens(params: CookingParams): Promise<AgentResult<CookingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('🔓 Removing Rami Levy authentication...', 'info');

    try {
      const deleted = await ramiLevyService.deleteTokens(userId);
      
      if (deleted) {
        this.emitLog('✅ Rami Levy authentication removed', 'success');
        return { success: true, data: { tokensDeleted: true } };
      } else {
        return { success: false, error: 'Failed to delete tokens' };
      }
    } catch (error: any) {
      this.emitLog(`❌ Failed to remove authentication: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const cookingAgent = new CookingAgent();
export default cookingAgent;
