/**
 * Grocery Deep Link Provider
 * 
 * Generates deep links to popular grocery stores with pre-filled carts.
 * Supports Israeli stores (Shufersal, Rami Levy) and international (Wolt).
 * 
 * This provider does NOT place actual orders - it creates links for users
 * to complete their orders on the respective platforms.
 */

import { v4 as uuidv4 } from 'uuid';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import logger from '../../utils/logger';
import type {
  DeliveryProviderInfo,
  DeliveryProduct,
  DeliveryOrderItem,
  OrderPreview,
  OrderLink
} from '../../types/delivery';

// =============================================================================
// TYPES
// =============================================================================

export interface GroceryStore {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  baseUrl: string;
  searchUrl: string;
  cartUrl?: string;
  deepLinkScheme?: string;
  supportedCountries: string[];
  currency: string;
  isAvailable: boolean;
}

export interface GroceryCartLink {
  storeId: string;
  storeName: string;
  storeLogoUrl: string;
  webUrl: string;
  deepLink?: string;
  searchLinks: Array<{
    item: string;
    url: string;
  }>;
  itemCount: number;
  estimatedTotal?: number;
  currency: string;
  expiresAt: Date;
}

export interface GroceryOrderRequest {
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    category?: string;
  }>;
  userId: string;
  preferredStores?: string[];
  location?: {
    city?: string;
    country?: string;
  };
}

export interface GroceryOrderResult {
  orderId: string;
  items: GroceryOrderRequest['items'];
  storeLinks: GroceryCartLink[];
  createdAt: Date;
  expiresAt: Date;
}

// =============================================================================
// STORE DEFINITIONS
// =============================================================================

const GROCERY_STORES: GroceryStore[] = [
  {
    id: 'wolt',
    name: 'wolt',
    displayName: 'Wolt',
    logoUrl: 'https://wolt.com/favicon.ico',
    baseUrl: 'https://wolt.com',
    searchUrl: 'https://wolt.com/en/isr/search?q=',
    deepLinkScheme: 'wolt://',
    supportedCountries: ['IL', 'FI', 'DE', 'PL', 'CZ', 'HU', 'GR', 'CY', 'JP', 'SE', 'DK', 'NO'],
    currency: 'ILS',
    isAvailable: true
  },
  {
    id: 'shufersal',
    name: 'shufersal',
    displayName: 'Shufersal Online',
    logoUrl: 'https://www.shufersal.co.il/favicon.ico',
    baseUrl: 'https://www.shufersal.co.il',
    searchUrl: 'https://www.shufersal.co.il/online/he/search?q=',
    cartUrl: 'https://www.shufersal.co.il/online/he/checkout',
    supportedCountries: ['IL'],
    currency: 'ILS',
    isAvailable: true
  },
  {
    id: 'rami-levy',
    name: 'rami-levy',
    displayName: 'Rami Levy Online',
    logoUrl: 'https://www.rami-levy.co.il/favicon.ico',
    baseUrl: 'https://www.rami-levy.co.il',
    searchUrl: 'https://www.rami-levy.co.il/he/online/search?q=',
    cartUrl: 'https://www.rami-levy.co.il/he/online/cart',
    supportedCountries: ['IL'],
    currency: 'ILS',
    isAvailable: true
  },
  {
    id: 'victory',
    name: 'victory',
    displayName: 'Victory Online',
    logoUrl: 'https://www.victoryonline.co.il/favicon.ico',
    baseUrl: 'https://www.victoryonline.co.il',
    searchUrl: 'https://www.victoryonline.co.il/search?q=',
    supportedCountries: ['IL'],
    currency: 'ILS',
    isAvailable: true
  },
  {
    id: 'yochananof',
    name: 'yochananof',
    displayName: 'Yochananof',
    logoUrl: 'https://yochananof.co.il/favicon.ico',
    baseUrl: 'https://yochananof.co.il',
    searchUrl: 'https://yochananof.co.il/search?keyword=',
    supportedCountries: ['IL'],
    currency: 'ILS',
    isAvailable: true
  }
];

// =============================================================================
// GROCERY DEEP LINK PROVIDER
// =============================================================================

class GroceryDeepLinkProvider {
  private stores: Map<string, GroceryStore> = new Map();

  constructor() {
    this.initializeStores();
  }

  private initializeStores(): void {
    for (const store of GROCERY_STORES) {
      if (store.isAvailable) {
        this.stores.set(store.id, store);
      }
    }
    logger.init(`Grocery deep link provider initialized with ${this.stores.size} stores`);
  }

  /**
   * Get all available grocery stores
   */
  getAvailableStores(country?: string): GroceryStore[] {
    const stores = Array.from(this.stores.values());
    
    if (country) {
      return stores.filter(s => s.supportedCountries.includes(country));
    }
    
    return stores;
  }

  /**
   * Get a specific store by ID
   */
  getStore(storeId: string): GroceryStore | undefined {
    return this.stores.get(storeId);
  }

  /**
   * Generate search URL for an item at a specific store
   */
  generateSearchUrl(store: GroceryStore, itemName: string): string {
    const encodedItem = encodeURIComponent(itemName);
    return `${store.searchUrl}${encodedItem}`;
  }

  /**
   * Generate deep link for a store (if available)
   */
  generateDeepLink(store: GroceryStore, items: string[]): string | undefined {
    if (!store.deepLinkScheme) return undefined;

    // Wolt deep link format
    if (store.id === 'wolt') {
      const itemsParam = encodeURIComponent(items.join(','));
      return `${store.deepLinkScheme}search?query=${itemsParam}`;
    }

    return undefined;
  }

  /**
   * Create a grocery cart with links to multiple stores
   */
  async createGroceryOrder(request: GroceryOrderRequest): Promise<GroceryOrderResult> {
    const orderId = `grocery-${uuidv4()}`;
    const expiresAt = new Date(Date.now() + configService.get('delivery.order.expiryMinutes', 30) * 60 * 1000);

    // Determine which stores to include
    let storesToUse = this.getAvailableStores(request.location?.country || 'IL');
    
    if (request.preferredStores && request.preferredStores.length > 0) {
      storesToUse = storesToUse.filter(s => request.preferredStores!.includes(s.id));
    }

    // Generate links for each store
    const storeLinks: GroceryCartLink[] = storesToUse.map(store => {
      const searchLinks = request.items.map(item => ({
        item: item.name,
        url: this.generateSearchUrl(store, item.name)
      }));

      const itemNames = request.items.map(i => i.name);
      const deepLink = this.generateDeepLink(store, itemNames);

      // Create a combined search URL for all items
      const combinedQuery = itemNames.slice(0, 5).join(' '); // Limit to 5 items for URL length
      const webUrl = this.generateSearchUrl(store, combinedQuery);

      return {
        storeId: store.id,
        storeName: store.displayName,
        storeLogoUrl: store.logoUrl,
        webUrl,
        deepLink,
        searchLinks,
        itemCount: request.items.length,
        currency: store.currency,
        expiresAt
      };
    });

    const result: GroceryOrderResult = {
      orderId,
      items: request.items,
      storeLinks,
      createdAt: new Date(),
      expiresAt
    };

    // Cache the order
    await cacheService.set(
      `grocery:order:${orderId}`,
      result,
      { ttl: configService.get('delivery.order.expiryMinutes', 30) * 60 }
    );

    logger.success('Grocery order created', {
      orderId,
      itemCount: request.items.length,
      storeCount: storeLinks.length
    });

    return result;
  }

  /**
   * Get a cached grocery order
   */
  async getGroceryOrder(orderId: string): Promise<GroceryOrderResult | null> {
    return cacheService.get<GroceryOrderResult>(`grocery:order:${orderId}`);
  }

  /**
   * Create order from shopping list items
   */
  async createOrderFromShoppingList(
    listItems: Array<{ name: string; quantity?: number; unit?: string; category?: string }>,
    userId: string,
    preferredStores?: string[]
  ): Promise<GroceryOrderResult> {
    const items = listItems.map(item => ({
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit,
      category: item.category
    }));

    return this.createGroceryOrder({
      items,
      userId,
      preferredStores,
      location: { country: 'IL' } // Default to Israel
    });
  }

  /**
   * Create order from recipe ingredients
   */
  async createOrderFromIngredients(
    ingredients: Array<{ name: string; amount?: number; unit?: string }>,
    userId: string,
    preferredStores?: string[]
  ): Promise<GroceryOrderResult> {
    const items = ingredients.map(ing => ({
      name: ing.name,
      quantity: ing.amount || 1,
      unit: ing.unit
    }));

    return this.createGroceryOrder({
      items,
      userId,
      preferredStores,
      location: { country: 'IL' }
    });
  }

  /**
   * Get store info as DeliveryProviderInfo (for compatibility)
   */
  getProviderInfoList(): DeliveryProviderInfo[] {
    return Array.from(this.stores.values()).map(store => ({
      id: store.id,
      name: store.name,
      displayName: store.displayName,
      logoUrl: store.logoUrl,
      baseUrl: store.baseUrl,
      supportedCountries: store.supportedCountries,
      features: ['grocery', 'express_delivery'] as any[],
      isAvailable: store.isAvailable,
      currency: store.currency
    }));
  }
}

// Export singleton
export const groceryDeepLinkProvider = new GroceryDeepLinkProvider();
export default groceryDeepLinkProvider;
