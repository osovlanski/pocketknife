/**
 * AliExpress Product Search Service
 * 
 * Provides product search using RapidAPI's AliExpress Data API.
 * Great for budget products and bulk items.
 * 
 * RapidAPI: https://rapidapi.com/apidojo/api/unofficial-aliexpress
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface AliExpressProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  source: string;
  sourceUrl: string;
  sourceId: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  orders?: number;
  seller?: {
    name: string;
    rating?: number;
  };
  shipping?: {
    cost: number;
    freeShipping: boolean;
    deliveryDays?: number;
  };
  category?: string;
}

export interface AliExpressSearchParams {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'default' | 'price_asc' | 'price_desc' | 'orders' | 'rating';
  freeShipping?: boolean;
  limit?: number;
}

// =============================================================================
// ALIEXPRESS SERVICE
// =============================================================================

class AliExpressService {
  private client: AxiosInstance | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (rapidApiKey) {
      this.client = axios.create({
        baseURL: 'https://aliexpress-datahub.p.rapidapi.com',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com'
        },
        timeout: (configService.get('shopping.api.timeoutMs') as number) || 15000
      });
      logger.init('AliExpress RapidAPI client initialized');
    }
  }

  /**
   * Check if AliExpress search is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Search products on AliExpress
   */
  async search(params: AliExpressSearchParams): Promise<AliExpressProduct[]> {
    if (!this.client) {
      logger.warn('AliExpress service not available - RAPIDAPI_KEY not configured');
      return [];
    }

    const { 
      query, 
      category,
      minPrice, 
      maxPrice,
      sortBy = 'default',
      freeShipping = false,
      limit = 20 
    } = params;

    // Check cache first
    const cacheKey = `aliexpress:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<AliExpressProduct[]>(cacheKey);
    if (cached) {
      logger.cache('AliExpress search cache hit');
      return cached;
    }

    try {
      logger.search('Searching AliExpress', { query });

      // Map sortBy to API parameter
      const sortMap: Record<string, string> = {
        'default': 'default',
        'price_asc': 'price_asc',
        'price_desc': 'price_desc',
        'orders': 'orders_desc',
        'rating': 'rating_desc'
      };

      const response = await this.client.get('/item/search', {
        params: {
          q: query,
          page: 1,
          sort: sortMap[sortBy],
          ...(category && { catId: category }),
          ...(minPrice && { startPrice: minPrice }),
          ...(maxPrice && { endPrice: maxPrice }),
          ...(freeShipping && { isFreeShip: 'y' })
        }
      });

      const items = response.data?.result?.resultList || [];
      
      const products: AliExpressProduct[] = items
        .slice(0, limit)
        .map((item: any, index: number) => this.mapProduct(item, index));

      // Cache for 30 minutes
      await cacheService.set(cacheKey, products, { ttl: 1800 });

      logger.success('AliExpress search completed', { count: products.length });
      return products;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('AliExpress RapidAPI rate limit exceeded');
      } else {
        logger.fail('AliExpress search failed', { error: error.message });
      }
      return [];
    }
  }

  /**
   * Get product details by ID
   */
  async getProduct(productId: string): Promise<AliExpressProduct | null> {
    if (!this.client) return null;

    const cacheKey = `aliexpress:product:${productId}`;
    const cached = await cacheService.get<AliExpressProduct>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/item/detail', {
        params: { itemId: productId }
      });

      const data = response.data?.result;
      if (!data) return null;

      const product = this.mapProductDetails(data);
      
      await cacheService.set(cacheKey, product, { ttl: 3600 }); // 1 hour cache
      return product;
    } catch (error: any) {
      logger.fail('Failed to get AliExpress product', { productId, error: error.message });
      return null;
    }
  }

  /**
   * Get recommended/trending products
   */
  async getRecommended(category?: string): Promise<AliExpressProduct[]> {
    if (!this.client) return [];

    const cacheKey = `aliexpress:recommended:${category || 'all'}`;
    const cached = await cacheService.get<AliExpressProduct[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/item/recommend', {
        params: {
          ...(category && { catId: category })
        }
      });

      const items = response.data?.result || [];
      const products = items.map((item: any, index: number) => this.mapProduct(item, index));

      await cacheService.set(cacheKey, products, { ttl: 1800 });
      return products;
    } catch (error: any) {
      logger.fail('Failed to get AliExpress recommendations', { error: error.message });
      return [];
    }
  }

  /**
   * Map search result to AliExpressProduct
   */
  private mapProduct(item: any, index: number): AliExpressProduct {
    const priceData = item.item || item;
    
    // Extract price - AliExpress has various price formats
    let price = 0;
    let originalPrice: number | undefined;
    
    if (priceData.salePrice) {
      price = parseFloat(String(priceData.salePrice).replace(/[^0-9.]/g, '') || '0');
    } else if (priceData.price) {
      price = parseFloat(String(priceData.price).replace(/[^0-9.]/g, '') || '0');
    } else if (priceData.sku?.def?.price) {
      price = parseFloat(String(priceData.sku.def.price).replace(/[^0-9.]/g, '') || '0');
    }

    if (priceData.originalPrice) {
      originalPrice = parseFloat(String(priceData.originalPrice).replace(/[^0-9.]/g, '') || '0');
    }

    const discount = originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : (priceData.discount ? parseInt(String(priceData.discount)) : undefined);

    // Extract rating
    const rating = priceData.starRating 
      ? parseFloat(String(priceData.starRating))
      : (priceData.averageStar ? parseFloat(String(priceData.averageStar)) : undefined);

    // Extract orders count
    const orders = priceData.orders 
      ? parseInt(String(priceData.orders).replace(/[^0-9]/g, '') || '0')
      : (priceData.trade?.tradeDesc ? parseInt(String(priceData.trade.tradeDesc).replace(/[^0-9]/g, '') || '0') : undefined);

    return {
      id: `aliexpress-${priceData.itemId || priceData.productId || Date.now()}-${index}`,
      title: priceData.title || priceData.subject || 'Unknown Product',
      description: priceData.description,
      price,
      originalPrice,
      currency: 'USD',
      discount,
      source: 'aliexpress',
      sourceUrl: priceData.productDetailUrl || priceData.itemUrl || `https://www.aliexpress.com/item/${priceData.itemId}.html`,
      sourceId: priceData.itemId || priceData.productId || `ali-${Date.now()}-${index}`,
      imageUrl: priceData.imageUrl || priceData.image?.imgUrl,
      rating,
      reviewCount: priceData.reviewCount || priceData.totalValidNum,
      orders,
      seller: priceData.store ? {
        name: priceData.store.storeName || priceData.store.name,
        rating: priceData.store.positiveRate ? parseFloat(String(priceData.store.positiveRate)) : undefined
      } : undefined,
      shipping: {
        cost: priceData.shippingFee ? parseFloat(String(priceData.shippingFee).replace(/[^0-9.]/g, '') || '0') : 0,
        freeShipping: priceData.freeShipping || priceData.logisticsDesc?.includes('Free') || false,
        deliveryDays: priceData.deliveryDays
      },
      category: priceData.categoryName
    };
  }

  /**
   * Map product details response
   */
  private mapProductDetails(data: any): AliExpressProduct {
    const item = data.item || data;
    
    const price = item.sku?.def?.promotionPrice || item.sku?.def?.price || 0;
    const originalPrice = item.sku?.def?.price;

    return {
      id: `aliexpress-${item.itemId}`,
      title: item.title || item.subject || 'Unknown Product',
      description: item.description,
      price: typeof price === 'string' ? parseFloat(price) : price,
      originalPrice: typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice,
      currency: 'USD',
      discount: item.discount,
      source: 'aliexpress',
      sourceUrl: item.productDetailUrl || `https://www.aliexpress.com/item/${item.itemId}.html`,
      sourceId: item.itemId,
      imageUrl: item.imagePathList?.[0] || item.imageUrl,
      rating: item.averageStar ? parseFloat(item.averageStar) : undefined,
      reviewCount: item.totalValidNum,
      orders: item.formatTradeCount,
      seller: item.store ? {
        name: item.store.storeName,
        rating: item.store.positiveRate ? parseFloat(item.store.positiveRate) : undefined
      } : undefined,
      shipping: {
        cost: 0,
        freeShipping: item.logistics?.freeShipping || false,
        deliveryDays: item.logistics?.deliveryDays
      },
      category: item.categoryName
    };
  }
}

// Export singleton
export const aliexpressService = new AliExpressService();
export default aliexpressService;

