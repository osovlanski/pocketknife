/**
 * Wolt Drive API Provider
 * 
 * Integration with Wolt Drive API for real delivery orders.
 * Wolt Drive is a white-label logistics solution that uses Wolt's courier fleet.
 * 
 * API Flow:
 * 1. Get shipment promise (estimated fee/time) via /shipment-promises
 * 2. Create delivery with promise ID via /deliveries
 * 3. Track delivery via tracking URL
 * 
 * Requirements:
 * - Wolt Drive Merchant account
 * - Physical venue for pickup
 * - API credentials (WOLT_MERCHANT_ID, WOLT_API_TOKEN)
 */

import axios, { AxiosInstance } from 'axios';
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
  WoltShipmentPromiseRequest,
  WoltShipmentPromiseResponse,
  WoltDeliveryRequest,
  WoltDeliveryResponse,
  WoltParcel,
  UserDeliveryAddress
} from '../../types/delivery';

// =============================================================================
// WOLT DRIVE PROVIDER
// =============================================================================

export class WoltDriveProvider implements IDeliveryProvider {
  private client: AxiosInstance | null = null;
  private readonly venueId: string;
  private readonly merchantId: string;

  readonly info: DeliveryProviderInfo = {
    id: 'wolt-drive',
    name: 'wolt',
    displayName: 'Wolt Drive',
    logoUrl: 'https://wolt.com/favicon.ico',
    baseUrl: 'https://wolt.com',
    supportedCountries: ['IL', 'FI', 'DE', 'PL', 'CZ', 'HU', 'GR', 'CY', 'JP', 'SE', 'DK', 'NO'],
    features: ['grocery', 'restaurant', 'express_delivery', 'scheduled_delivery'],
    isAvailable: false,
    averageDeliveryMinutes: 45,
    minimumOrderAmount: 0,
    currency: 'ILS'
  };

  constructor() {
    this.venueId = process.env.WOLT_VENUE_ID || configService.get('delivery.wolt.venueId', '');
    this.merchantId = process.env.WOLT_MERCHANT_ID || configService.get('delivery.wolt.merchantId', '');
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiToken = process.env.WOLT_API_TOKEN;
    const baseUrl = configService.get('delivery.wolt.apiBaseUrl', 'https://daas-public-api.wolt.com/v1');

    if (apiToken && this.merchantId) {
      this.client = axios.create({
        baseURL: baseUrl,
        timeout: configService.get('delivery.wolt.timeoutMs', 30000),
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'X-Wolt-Merchant-Id': this.merchantId
        }
      });
      this.info.isAvailable = true;
      logger.init('Wolt Drive API client initialized');
    } else {
      logger.warn('Wolt Drive not configured - missing WOLT_API_TOKEN or WOLT_MERCHANT_ID');
    }
  }

  /**
   * Check if Wolt Drive is available
   */
  async isAvailable(location?: DeliveryLocation): Promise<boolean> {
    if (!this.client || !this.venueId) {
      return false;
    }

    // If location provided, we could check if it's within delivery range
    // For now, just return availability based on configuration
    return this.info.isAvailable;
  }

  /**
   * Search for products - Wolt Drive doesn't provide product catalog
   * Products come from your own inventory/catalog
   */
  async searchProducts(
    ingredients: string[],
    options?: ProductSearchOptions
  ): Promise<DeliveryProduct[]> {
    // Wolt Drive is a delivery-only service - products come from your catalog
    // Return generic products for the ingredients
    return ingredients.map((ingredient, index) => ({
      id: `wolt-${uuidv4().slice(0, 8)}`,
      name: ingredient,
      description: `${ingredient} for delivery`,
      price: 0, // Price from your catalog
      currency: this.info.currency,
      unit: 'unit',
      quantity: 1,
      inStock: true,
      providerId: this.info.id,
      category: 'grocery'
    }));
  }

  /**
   * Get a shipment promise (estimated delivery fee and time)
   */
  async getShipmentPromise(
    dropoffAddress: UserDeliveryAddress
  ): Promise<WoltShipmentPromiseResponse | null> {
    if (!this.client || !this.venueId) {
      logger.fail('Wolt Drive not configured');
      return null;
    }

    const request: WoltShipmentPromiseRequest = {
      pickup: {
        venue_id: this.venueId,
        options: {
          min_preparation_time_minutes: configService.get('delivery.wolt.minPreparationMinutes', 15)
        }
      },
      dropoff: {
        location: {
          formatted_address: dropoffAddress.formattedAddress,
          coordinates: {
            lat: dropoffAddress.coordinates.lat,
            lon: dropoffAddress.coordinates.lon
          }
        }
      }
    };

    try {
      logger.api('Requesting Wolt shipment promise', { address: dropoffAddress.formattedAddress });
      
      const response = await this.client.post<WoltShipmentPromiseResponse>(
        '/shipment-promises',
        request
      );

      const promise = response.data;

      logger.success('Wolt shipment promise received', {
        id: promise.id,
        price: promise.price,
        eta: promise.time_estimate_minutes
      });

      // Cache the promise for later use
      await cacheService.set(
        `wolt:promise:${promise.id}`,
        promise,
        { ttl: configService.get('cache.delivery.wolt.promiseTtlSeconds', 1800) as number } // 30 minutes
      );

      return promise;
    } catch (error: any) {
      logger.fail('Failed to get Wolt shipment promise', {
        error: error.response?.data || error.message
      });
      return null;
    }
  }

  /**
   * Create order preview with shipment promise
   */
  async createOrderPreview(
    items: DeliveryOrderItem[],
    location?: DeliveryLocation
  ): Promise<OrderPreview> {
    // For Wolt Drive, we need the actual delivery address
    const dropoffAddress: UserDeliveryAddress = {
      formattedAddress: location?.address || 'Address required',
      coordinates: {
        lat: location?.latitude || 0,
        lon: location?.longitude || 0
      }
    };

    // Get shipment promise for pricing
    const promise = await this.getShipmentPromise(dropoffAddress);

    // Calculate subtotal from items (your product prices)
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const deliveryFee = promise?.price.amount || 0;
    const serviceFee = 0; // Wolt Drive doesn't charge separate service fee

    const preview: OrderPreview = {
      id: promise?.id || `preview-${uuidv4()}`,
      providerId: this.info.id,
      providerName: this.info.displayName,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee: deliveryFee / 100, // Wolt returns amount in cents
      serviceFee,
      total: Math.round((subtotal + deliveryFee / 100) * 100) / 100,
      currency: promise?.price.currency || this.info.currency,
      estimatedDeliveryMinutes: promise?.time_estimate_minutes,
      createdAt: new Date(),
      expiresAt: promise 
        ? new Date(promise.valid_until) 
        : new Date(Date.now() + 30 * 60 * 1000)
    };

    // Cache the preview
    await cacheService.set(
      `wolt:preview:${preview.id}`,
      { preview, promise, dropoffAddress },
      { ttl: configService.get('cache.delivery.wolt.previewTtlSeconds', 1800) as number }
    );

    return preview;
  }

  /**
   * Create actual delivery order
   */
  async createDelivery(
    orderId: string,
    customerContact: { name: string; phone: string },
    deliveryInstructions?: string
  ): Promise<WoltDeliveryResponse | null> {
    if (!this.client) {
      logger.fail('Wolt Drive not configured');
      return null;
    }

    // Get cached preview data
    const cachedData = await cacheService.get<{
      preview: OrderPreview;
      promise: WoltShipmentPromiseResponse;
      dropoffAddress: UserDeliveryAddress;
    }>(`wolt:preview:${orderId}`);

    if (!cachedData) {
      logger.fail('Order preview not found or expired', { orderId });
      return null;
    }

    const { preview, promise, dropoffAddress } = cachedData;

    // Build parcels from order items
    const parcels: WoltParcel[] = [{
      description: `Grocery order: ${preview.items.map(i => i.originalIngredient).join(', ')}`,
      type: configService.get('delivery.wolt.defaultParcelType', 'bag') as 'bag',
    }];

    const request: WoltDeliveryRequest = {
      shipment_promise_id: promise.id,
      pickup: {
        venue_id: this.venueId,
        options: {
          min_preparation_time_minutes: configService.get('delivery.wolt.minPreparationMinutes', 15)
        }
      },
      dropoff: {
        location: {
          formatted_address: dropoffAddress.formattedAddress,
          coordinates: dropoffAddress.coordinates
        },
        contact: {
          name: customerContact.name,
          phone: customerContact.phone
        },
        comment: deliveryInstructions
      },
      parcels,
      merchant_order_reference_id: orderId
    };

    try {
      logger.api('Creating Wolt delivery', { orderId });

      const response = await this.client.post<WoltDeliveryResponse>(
        '/deliveries',
        request
      );

      const delivery = response.data;

      logger.success('Wolt delivery created', {
        deliveryId: delivery.id,
        trackingUrl: delivery.tracking.url,
        eta: delivery.dropoff.eta
      });

      return delivery;
    } catch (error: any) {
      logger.fail('Failed to create Wolt delivery', {
        error: error.response?.data || error.message
      });
      return null;
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(deliveryId: string): Promise<WoltDeliveryResponse | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.get<WoltDeliveryResponse>(
        `/deliveries/${deliveryId}`
      );
      return response.data;
    } catch (error: any) {
      logger.fail('Failed to get delivery status', { error: error.message });
      return null;
    }
  }

  /**
   * Cancel a delivery
   */
  async cancelDelivery(deliveryId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.post(`/deliveries/${deliveryId}/cancel`);
      logger.success('Wolt delivery cancelled', { deliveryId });
      return true;
    } catch (error: any) {
      logger.fail('Failed to cancel delivery', { error: error.message });
      return false;
    }
  }

  /**
   * Generate order link - for Wolt Drive, this returns the tracking URL
   * Note: The actual order is created via createDelivery()
   */
  async generateOrderLink(orderPreview: OrderPreview): Promise<OrderLink> {
    // For Wolt Drive, we create the actual delivery and return tracking URL
    // But since we need customer contact info, we just return a placeholder
    // The actual delivery should be created via createDelivery() method
    
    return {
      orderId: orderPreview.id,
      providerId: this.info.id,
      providerName: this.info.displayName,
      url: `https://wolt.com/track/${orderPreview.id}`, // Placeholder - real URL from createDelivery
      deepLink: `wolt://track/${orderPreview.id}`,
      expiresAt: orderPreview.expiresAt,
      itemCount: orderPreview.items.length,
      total: orderPreview.total,
      currency: orderPreview.currency
    };
  }
}

// Export singleton
export const woltDriveProvider = new WoltDriveProvider();
export default woltDriveProvider;
