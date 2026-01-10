/**
 * Groceries Agent
 * 
 * Manages grocery inventory, shopping lists, and recipe discovery.
 * 
 * Features:
 * - Manual grocery item CRUD operations
 * - Automatic grocery detection from invoices/receipts
 * - Recipe search based on available ingredients
 * - Shopping list management
 * - Expiry tracking and low stock alerts
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { groceriesService, GroceryItemData, GroceryFilters, RecipeSearchParams } from '../services/groceries';

interface GroceriesParams extends AgentParams {
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
    | 'process-invoice'
    | 'match-invoice'
    | 'get-summary'
    | 'get-suggestions';
  itemData?: GroceryItemData;
  itemId?: string;
  listId?: string;
  listItemId?: string;
  listName?: string;
  listDescription?: string;
  listItemData?: { name: string; quantity?: number; unit?: string; category?: string };
  isChecked?: boolean;
  status?: string;
  filters?: GroceryFilters;
  recipeParams?: RecipeSearchParams;
  recipe?: any;
  notes?: string;
  invoiceId?: string;
  invoiceDate?: string;
  merchant?: string;
  invoiceItems?: Array<{ name: string; quantity?: number; unit?: string; price?: number }>;
}

interface GroceriesResult {
  item?: any;
  items?: any[];
  list?: any;
  lists?: any[];
  recipes?: any[];
  recipe?: any;
  summary?: any;
  suggestions?: string[];
  processed?: number;
  matched?: number;
  created?: number;
}

export class GroceriesAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'groceries',
    name: 'Groceries Agent',
    description: 'Manage grocery inventory, find recipes, and track shopping lists',
    icon: '🛒',
    color: '#22C55E' // Green
  };

  protected async run(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
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

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ===========================================================================
  // ITEM MANAGEMENT
  // ===========================================================================

  private async addItem(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, itemData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemData) return { success: false, error: 'Item data is required' };
    if (!itemData.name) return { success: false, error: 'Item name is required' };

    this.emitLog(`🛒 Adding grocery item: ${itemData.name}`, 'info');

    try {
      const item = await groceriesService.addItem(userId, itemData);
      this.emitLog('✅ Item added to inventory', 'success');
      return { success: true, data: { item } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to add item: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async updateItem(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, itemId, itemData } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };

    try {
      const item = await groceriesService.updateItem(userId, itemId, itemData || {});
      this.emitLog('✅ Item updated', 'success');
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async deleteItem(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, itemId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };

    try {
      await groceriesService.deleteItem(userId, itemId);
      this.emitLog('🗑️ Item removed from inventory', 'info');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getItems(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await groceriesService.getItems(userId, filters);
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async updateStatus(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, itemId, status } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!itemId) return { success: false, error: 'Item ID is required' };
    if (!status) return { success: false, error: 'Status is required' };

    try {
      const item = await groceriesService.updateItemStatus(userId, itemId, status);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getExpiringItems(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await groceriesService.getExpiringItems(userId);
      if (items.length > 0) {
        this.emitLog(`⚠️ ${items.length} items expiring soon`, 'warning');
      }
      return { success: true, data: { items } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getLowStockItems(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const items = await groceriesService.getLowStockItems(userId);
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

  private async createList(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, listName, listDescription } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!listName) return { success: false, error: 'List name is required' };

    try {
      const list = await groceriesService.createList(userId, listName, listDescription);
      this.emitLog(`📝 Shopping list created: ${listName}`, 'success');
      return { success: true, data: { list } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getLists(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const lists = await groceriesService.getLists(userId);
      return { success: true, data: { lists } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async addListItem(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { listId, listItemData } = params;

    if (!listId) return { success: false, error: 'List ID is required' };
    if (!listItemData || !listItemData.name) return { success: false, error: 'Item name is required' };

    try {
      const item = await groceriesService.addListItem(listId, listItemData);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async toggleListItem(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { listItemId, isChecked } = params;

    if (!listItemId) return { success: false, error: 'List item ID is required' };
    if (isChecked === undefined) return { success: false, error: 'isChecked is required' };

    try {
      const item = await groceriesService.toggleListItem(listItemId, isChecked);
      return { success: true, data: { item } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async completeList(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, listId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!listId) return { success: false, error: 'List ID is required' };

    try {
      const list = await groceriesService.completeList(userId, listId);
      this.emitLog('✅ Shopping list completed and inventory updated', 'success');
      return { success: true, data: { list } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // RECIPES
  // ===========================================================================

  private async findRecipes(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, recipeParams } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    this.emitLog('🍳 Searching for recipes...', 'info');

    try {
      const recipes = await groceriesService.findRecipes(userId, recipeParams || {});
      this.emitLog(`✅ Found ${recipes.length} recipes`, 'success');
      return { success: true, data: { recipes } };
    } catch (error: any) {
      this.emitLog(`❌ Recipe search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  private async saveRecipe(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, recipe, notes } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!recipe) return { success: false, error: 'Recipe data is required' };

    try {
      const saved = await groceriesService.saveRecipe(userId, recipe, notes);
      this.emitLog(`📖 Recipe saved: ${recipe.title}`, 'success');
      return { success: true, data: { recipe: saved } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getSavedRecipes(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const recipes = await groceriesService.getSavedRecipes(userId, filters as any);
      return { success: true, data: { recipes } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // INVOICE PROCESSING
  // ===========================================================================

  private async processInvoice(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { invoiceId, invoiceDate, merchant, invoiceItems } = params;

    if (!invoiceId) return { success: false, error: 'Invoice ID is required' };
    if (!invoiceItems || invoiceItems.length === 0) {
      return { success: false, error: 'Invoice items are required' };
    }

    this.emitLog(`📄 Processing invoice from ${merchant || 'unknown store'}...`, 'info');

    try {
      const result = await groceriesService.processInvoiceItems(
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

  private async matchInvoice(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId, invoiceId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!invoiceId) return { success: false, error: 'Invoice ID is required' };

    this.emitLog('🔍 Matching invoice items to inventory...', 'info');

    try {
      const result = await groceriesService.matchInvoiceItems(userId, invoiceId);
      this.emitLog(`✅ Matched ${result.matched} items, created ${result.created} new`, 'success');
      return { success: true, data: { matched: result.matched, created: result.created } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  private async getSummary(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const summary = await groceriesService.getInventorySummary(userId);
      return { success: true, data: { summary } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getSuggestions(params: GroceriesParams): Promise<AgentResult<GroceriesResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const suggestions = await groceriesService.getSuggestions(userId);
      if (suggestions.length > 0) {
        this.emitLog(`💡 ${suggestions.length} items suggested for shopping`, 'info');
      }
      return { success: true, data: { suggestions } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const groceriesAgent = new GroceriesAgent();
export default groceriesAgent;
