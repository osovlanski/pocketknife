/**
 * Delivery Service
 * 
 * Manages delivery providers and orchestrates order creation.
 * Uses a provider pattern to support multiple delivery services (Wolt, Instacart, etc.)
 * 
 * Currently includes MockDeliveryProvider for development/testing.
 */

import { v4 as uuidv4 } from 'uuid';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import logger from '../../utils/logger';
import type {
  IDeliveryProvider,
  DeliveryProviderInfo,
  DeliveryProduct,
  DeliveryOrderItem,
  DeliveryLocation,
  ProductSearchOptions,
  OrderPreview,
  OrderLink,
  WoltDeliveryResponse
} from '../../types/delivery';

// =============================================================================
// MOCK DELIVERY PROVIDER
// =============================================================================

/**
 * Mock delivery provider for development and testing.
 * Simulates Wolt-like behavior with realistic product data.
 */
class MockDeliveryProvider implements IDeliveryProvider {
  readonly info: DeliveryProviderInfo = {
    id: 'mock-wolt',
    name: 'wolt',
    displayName: 'Wolt (Demo)',
    baseUrl: configService.get('delivery.mock.baseUrl', 'https://wolt.com'),
    supportedCountries: ['IL', 'FI', 'DE', 'PL', 'CZ', 'HU', 'GR', 'CY', 'JP'],
    supportedCities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Helsinki', 'Berlin'],
    features: ['grocery', 'restaurant', 'express_delivery', 'scheduled_delivery'],
    isAvailable: true,
    averageDeliveryMinutes: 30,
    minimumOrderAmount: 30,
    currency: 'ILS'
  };

  // Mock product database with common grocery items
  private readonly mockProducts: Record<string, DeliveryProduct[]> = {
    'eggs': [
      { id: 'egg-1', name: 'Large Free-Range Eggs (12 pack)', price: 18.90, currency: 'ILS', unit: 'pack', quantity: 12, inStock: true, providerId: 'mock-wolt', category: 'dairy' },
      { id: 'egg-2', name: 'Organic Eggs (6 pack)', price: 14.50, currency: 'ILS', unit: 'pack', quantity: 6, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'milk': [
      { id: 'milk-1', name: 'Fresh Milk 3% (1L)', price: 6.90, currency: 'ILS', unit: 'liter', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'dairy' },
      { id: 'milk-2', name: 'Tnuva Milk 1% (1L)', price: 6.50, currency: 'ILS', unit: 'liter', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'butter': [
      { id: 'butter-1', name: 'Unsalted Butter (200g)', price: 12.90, currency: 'ILS', unit: 'g', quantity: 200, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'cheese': [
      { id: 'cheese-1', name: 'Parmesan Cheese (200g)', price: 34.90, currency: 'ILS', unit: 'g', quantity: 200, inStock: true, providerId: 'mock-wolt', category: 'dairy' },
      { id: 'cheese-2', name: 'Mozzarella (250g)', price: 18.90, currency: 'ILS', unit: 'g', quantity: 250, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'parmesan': [
      { id: 'parm-1', name: 'Parmigiano Reggiano (200g)', price: 45.90, currency: 'ILS', unit: 'g', quantity: 200, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'pasta': [
      { id: 'pasta-1', name: 'Barilla Spaghetti (500g)', price: 9.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'pantry' },
      { id: 'pasta-2', name: 'De Cecco Penne (500g)', price: 12.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'pantry' }
    ],
    'tomato': [
      { id: 'tomato-1', name: 'Fresh Tomatoes (1kg)', price: 12.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'produce' },
      { id: 'tomato-2', name: 'Cherry Tomatoes (500g)', price: 14.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'produce' }
    ],
    'onion': [
      { id: 'onion-1', name: 'Yellow Onions (1kg)', price: 5.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'produce' }
    ],
    'garlic': [
      { id: 'garlic-1', name: 'Fresh Garlic (200g)', price: 8.90, currency: 'ILS', unit: 'g', quantity: 200, inStock: true, providerId: 'mock-wolt', category: 'produce' }
    ],
    'olive oil': [
      { id: 'oil-1', name: 'Extra Virgin Olive Oil (750ml)', price: 39.90, currency: 'ILS', unit: 'ml', quantity: 750, inStock: true, providerId: 'mock-wolt', category: 'pantry' }
    ],
    'chicken': [
      { id: 'chicken-1', name: 'Chicken Breast (1kg)', price: 49.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'meat' },
      { id: 'chicken-2', name: 'Chicken Thighs (1kg)', price: 39.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'meat' }
    ],
    'beef': [
      { id: 'beef-1', name: 'Ground Beef (500g)', price: 44.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'meat' }
    ],
    'bacon': [
      { id: 'bacon-1', name: 'Turkey Bacon (200g)', price: 24.90, currency: 'ILS', unit: 'g', quantity: 200, inStock: true, providerId: 'mock-wolt', category: 'meat' }
    ],
    'guanciale': [
      { id: 'guan-1', name: 'Guanciale (150g)', price: 39.90, currency: 'ILS', unit: 'g', quantity: 150, inStock: false, providerId: 'mock-wolt', category: 'meat' },
      { id: 'pancetta-1', name: 'Pancetta (150g)', price: 29.90, currency: 'ILS', unit: 'g', quantity: 150, inStock: true, providerId: 'mock-wolt', category: 'meat' }
    ],
    'salt': [
      { id: 'salt-1', name: 'Sea Salt (500g)', price: 7.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'spices' }
    ],
    'pepper': [
      { id: 'pepper-1', name: 'Black Pepper (100g)', price: 12.90, currency: 'ILS', unit: 'g', quantity: 100, inStock: true, providerId: 'mock-wolt', category: 'spices' }
    ],
    'flour': [
      { id: 'flour-1', name: 'All-Purpose Flour (1kg)', price: 8.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'pantry' }
    ],
    'sugar': [
      { id: 'sugar-1', name: 'White Sugar (1kg)', price: 7.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'pantry' }
    ],
    'rice': [
      { id: 'rice-1', name: 'Basmati Rice (1kg)', price: 14.90, currency: 'ILS', unit: 'kg', quantity: 1, inStock: true, providerId: 'mock-wolt', category: 'pantry' }
    ],
    'cream': [
      { id: 'cream-1', name: 'Heavy Cream 38% (250ml)', price: 9.90, currency: 'ILS', unit: 'ml', quantity: 250, inStock: true, providerId: 'mock-wolt', category: 'dairy' }
    ],
    'lemon': [
      { id: 'lemon-1', name: 'Fresh Lemons (500g)', price: 8.90, currency: 'ILS', unit: 'g', quantity: 500, inStock: true, providerId: 'mock-wolt', category: 'produce' }
    ],
    'basil': [
      { id: 'basil-1', name: 'Fresh Basil (30g)', price: 6.90, currency: 'ILS', unit: 'g', quantity: 30, inStock: true, providerId: 'mock-wolt', category: 'produce' }
    ],
    'oregano': [
      { id: 'oregano-1', name: 'Dried Oregano (50g)', price: 8.90, currency: 'ILS', unit: 'g', quantity: 50, inStock: true, providerId: 'mock-wolt', category: 'spices' }
    ]
  };

  async isAvailable(location?: DeliveryLocation): Promise<boolean> {
    // Mock: available in supported cities
    if (location?.city) {
      return this.info.supportedCities?.includes(location.city) ?? true;
    }
    return true;
  }

  async searchProducts(
    ingredients: string[],
    options?: ProductSearchOptions
  ): Promise<DeliveryProduct[]> {
    const results: DeliveryProduct[] = [];
    const maxResults = options?.maxResults || 3;

    for (const ingredient of ingredients) {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      
      // Search in mock products
      let found = false;
      for (const [key, products] of Object.entries(this.mockProducts)) {
        if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
          const filtered = options?.includeOutOfStock 
            ? products 
            : products.filter(p => p.inStock);
          results.push(...filtered.slice(0, maxResults));
          found = true;
          break;
        }
      }

      // Generate a mock product if not found
      if (!found) {
        results.push({
          id: `generic-${uuidv4().slice(0, 8)}`,
          name: `${ingredient} (Generic)`,
          price: Math.round(10 + Math.random() * 30),
          currency: 'ILS',
          unit: 'unit',
          quantity: 1,
          inStock: true,
          providerId: 'mock-wolt',
          category: 'other'
        });
      }
    }

    return results;
  }

  async createOrderPreview(
    items: DeliveryOrderItem[],
    location?: DeliveryLocation
  ): Promise<OrderPreview> {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const deliveryFee = configService.get('delivery.mock.deliveryFee', 9.90);
    const serviceFee = subtotal * 0.05; // 5% service fee

    const preview: OrderPreview = {
      id: `order-${uuidv4()}`,
      providerId: this.info.id,
      providerName: this.info.displayName,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee,
      serviceFee: Math.round(serviceFee * 100) / 100,
      total: Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100,
      currency: this.info.currency,
      estimatedDeliveryMinutes: this.info.averageDeliveryMinutes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };

    return preview;
  }

  async generateOrderLink(orderPreview: OrderPreview): Promise<OrderLink> {
    // Generate a mock Wolt deep link
    const baseUrl = this.info.baseUrl;
    const itemsParam = encodeURIComponent(
      orderPreview.items.map(i => `${i.product.name}:${i.quantity}`).join(',')
    );
    
    const url = `${baseUrl}/checkout?items=${itemsParam}&ref=pocketknife`;
    const deepLink = `wolt://checkout?orderId=${orderPreview.id}`;

    return {
      orderId: orderPreview.id,
      providerId: this.info.id,
      providerName: this.info.displayName,
      url,
      deepLink,
      expiresAt: orderPreview.expiresAt,
      itemCount: orderPreview.items.length,
      total: orderPreview.total,
      currency: orderPreview.currency
    };
  }
}

// =============================================================================
// DELIVERY SERVICE
// =============================================================================

class DeliveryService {
  private providers: Map<string, IDeliveryProvider> = new Map();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    // Register mock provider if enabled
    if (configService.get('delivery.mock.enabled', true)) {
      const mockProvider = new MockDeliveryProvider();
      this.providers.set(mockProvider.info.id, mockProvider);
      logger.init('Mock delivery provider registered');
    }

    // Register Wolt Drive provider if enabled and configured
    if (configService.get('delivery.wolt.enabled', false)) {
      // Dynamically import to avoid issues if not configured
      import('./woltDriveProvider').then(({ woltDriveProvider }) => {
        if (woltDriveProvider.info.isAvailable) {
          this.providers.set(woltDriveProvider.info.id, woltDriveProvider);
          logger.init('Wolt Drive provider registered');
        }
      }).catch(err => {
        logger.warn('Failed to load Wolt Drive provider', { error: err.message });
      });
    }

    this.initialized = true;
    logger.init(`Delivery service initialized with ${this.providers.size} providers`);
  }

  /**
   * Get all available delivery providers
   */
  getProviders(): DeliveryProviderInfo[] {
    return Array.from(this.providers.values()).map(p => p.info);
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(providerId: string): IDeliveryProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): IDeliveryProvider | undefined {
    const defaultId = configService.get('delivery.defaultProvider', 'mock-wolt');
    return this.providers.get(defaultId) || this.providers.values().next().value;
  }

  /**
   * Search products across all providers or a specific one
   */
  async searchProducts(
    ingredients: string[],
    options?: ProductSearchOptions & { providerId?: string }
  ): Promise<Map<string, DeliveryProduct[]>> {
    const results = new Map<string, DeliveryProduct[]>();
    
    const providersToSearch = options?.providerId
      ? [this.providers.get(options.providerId)].filter(Boolean)
      : Array.from(this.providers.values());

    for (const provider of providersToSearch) {
      if (!provider) continue;
      
      try {
        const products = await provider.searchProducts(ingredients, options);
        results.set(provider.info.id, products);
      } catch (error: any) {
        logger.fail(`Failed to search products from ${provider.info.name}`, {
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Create an order preview from items
   */
  async createOrderPreview(
    items: DeliveryOrderItem[],
    providerId?: string,
    location?: DeliveryLocation
  ): Promise<OrderPreview | null> {
    const provider = providerId 
      ? this.getProvider(providerId) 
      : this.getDefaultProvider();

    if (!provider) {
      logger.fail('No delivery provider available');
      return null;
    }

    try {
      const preview = await provider.createOrderPreview(items, location);
      
      // Cache the preview
      const cacheKey = `delivery:preview:${preview.id}`;
      await cacheService.set(cacheKey, preview, { ttl: 1800 }); // 30 minutes

      logger.success('Order preview created', {
        orderId: preview.id,
        provider: provider.info.name,
        total: preview.total
      });

      return preview;
    } catch (error: any) {
      logger.fail('Failed to create order preview', { error: error.message });
      return null;
    }
  }

  /**
   * Generate a link to complete the order on the provider's platform
   */
  async generateOrderLink(orderPreviewId: string): Promise<OrderLink | null> {
    // Try to get from cache
    const cacheKey = `delivery:preview:${orderPreviewId}`;
    const preview = await cacheService.get<OrderPreview>(cacheKey);

    if (!preview) {
      logger.fail('Order preview not found or expired', { orderPreviewId });
      return null;
    }

    const provider = this.getProvider(preview.providerId);
    if (!provider) {
      logger.fail('Provider not found for order', { providerId: preview.providerId });
      return null;
    }

    try {
      const link = await provider.generateOrderLink(preview);
      logger.success('Order link generated', { url: link.url });
      return link;
    } catch (error: any) {
      logger.fail('Failed to generate order link', { error: error.message });
      return null;
    }
  }

  /**
   * Register a new delivery provider
   */
  registerProvider(provider: IDeliveryProvider): void {
    this.providers.set(provider.info.id, provider);
    logger.init(`Registered delivery provider: ${provider.info.name}`);
  }

  /**
   * Create an actual Wolt Drive delivery
   * This dispatches a courier to pick up and deliver the order
   */
  async createWoltDelivery(
    orderId: string,
    customerContact: { name: string; phone: string },
    deliveryInstructions?: string
  ): Promise<WoltDeliveryResponse | null> {
    const woltProvider = this.providers.get('wolt-drive');
    
    if (!woltProvider) {
      logger.fail('Wolt Drive provider not available');
      return null;
    }

    // Dynamically import to access Wolt-specific methods
    try {
      const { woltDriveProvider } = await import('./woltDriveProvider');
      return woltDriveProvider.createDelivery(orderId, customerContact, deliveryInstructions);
    } catch (error: any) {
      logger.fail('Failed to create Wolt delivery', { error: error.message });
      return null;
    }
  }

  /**
   * Get Wolt delivery status
   */
  async getWoltDeliveryStatus(deliveryId: string): Promise<WoltDeliveryResponse | null> {
    try {
      const { woltDriveProvider } = await import('./woltDriveProvider');
      return woltDriveProvider.getDeliveryStatus(deliveryId);
    } catch (error: any) {
      logger.fail('Failed to get Wolt delivery status', { error: error.message });
      return null;
    }
  }

  /**
   * Cancel a Wolt delivery
   */
  async cancelWoltDelivery(deliveryId: string): Promise<boolean> {
    try {
      const { woltDriveProvider } = await import('./woltDriveProvider');
      return woltDriveProvider.cancelDelivery(deliveryId);
    } catch (error: any) {
      logger.fail('Failed to cancel Wolt delivery', { error: error.message });
      return false;
    }
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService();
export default deliveryService;
