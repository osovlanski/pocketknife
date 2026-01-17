/**
 * Amazon Product Search Service
 * 
 * Provides product search using RapidAPI's Real-Time Amazon Data API.
 * This is a third-party API that scrapes Amazon data.
 * 
 * RapidAPI: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface AmazonProduct {
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
  isPrime?: boolean;
  seller?: string;
  category?: string;
  features?: string[];
}

export interface AmazonSearchParams {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  primeOnly?: boolean;
  sortBy?: 'relevanceblender' | 'price-asc-rank' | 'price-desc-rank' | 'review-rank' | 'date-desc-rank';
  limit?: number;
  country?: string;
}

// =============================================================================
// AMAZON SERVICE
// =============================================================================

class AmazonService {
  private client: AxiosInstance | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (rapidApiKey) {
      this.client = axios.create({
        baseURL: 'https://real-time-amazon-data.p.rapidapi.com',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com'
        },
        timeout: configService.get('shopping.api.timeoutMs', 15000)
      });
      logger.init('Amazon RapidAPI client initialized');
    }
  }

  /**
   * Check if Amazon search is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Search products on Amazon
   */
  async search(params: AmazonSearchParams): Promise<AmazonProduct[]> {
    if (!this.client) {
      logger.warn('Amazon service not available - RAPIDAPI_KEY not configured');
      return [];
    }

    const { 
      query, 
      category, 
      minPrice, 
      maxPrice, 
      primeOnly = false,
      sortBy = 'relevanceblender',
      limit = 20,
      country = 'US'
    } = params;

    // Check cache first
    const cacheKey = `amazon:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<AmazonProduct[]>(cacheKey);
    if (cached) {
      logger.cache('Amazon search cache hit');
      return cached;
    }

    try {
      logger.search('Searching Amazon', { query, country });

      const response = await this.client.get('/search', {
        params: {
          query,
          page: '1',
          country,
          sort_by: sortBy,
          ...(category && { category_id: category }),
          ...(minPrice && { min_price: minPrice }),
          ...(maxPrice && { max_price: maxPrice }),
          ...(primeOnly && { prime_eligible: 'true' })
        }
      });

      const products = response.data?.data?.products || [];
      
      const mappedProducts: AmazonProduct[] = products
        .slice(0, limit)
        .map((item: any, index: number) => this.mapProduct(item, index, country));

      // Cache for 30 minutes
      await cacheService.set(cacheKey, mappedProducts, { ttl: 1800 });

      logger.success('Amazon search completed', { count: mappedProducts.length });
      return mappedProducts;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('Amazon RapidAPI rate limit exceeded');
      } else {
        logger.fail('Amazon search failed', { error: error.message });
      }
      return [];
    }
  }

  /**
   * Get product details by ASIN
   */
  async getProduct(asin: string, country: string = 'US'): Promise<AmazonProduct | null> {
    if (!this.client) return null;

    const cacheKey = `amazon:product:${asin}:${country}`;
    const cached = await cacheService.get<AmazonProduct>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/product-details', {
        params: { asin, country }
      });

      const data = response.data?.data;
      if (!data) return null;

      const product = this.mapProductDetails(data, country);
      
      await cacheService.set(cacheKey, product, { ttl: 3600 }); // 1 hour cache
      return product;
    } catch (error: any) {
      logger.fail('Failed to get Amazon product', { asin, error: error.message });
      return null;
    }
  }

  /**
   * Get product reviews
   */
  async getReviews(asin: string, country: string = 'US'): Promise<any[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.get('/product-reviews', {
        params: { asin, country, page: '1' }
      });

      return response.data?.data?.reviews || [];
    } catch (error: any) {
      logger.fail('Failed to get Amazon reviews', { asin, error: error.message });
      return [];
    }
  }

  /**
   * Get deals and offers
   */
  async getDeals(country: string = 'US'): Promise<AmazonProduct[]> {
    if (!this.client) return [];

    const cacheKey = `amazon:deals:${country}`;
    const cached = await cacheService.get<AmazonProduct[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/deals', {
        params: { country }
      });

      const deals = response.data?.data?.deals || [];
      const products = deals.map((item: any, index: number) => this.mapDeal(item, index, country));

      await cacheService.set(cacheKey, products, { ttl: 900 }); // 15 min cache for deals
      return products;
    } catch (error: any) {
      logger.fail('Failed to get Amazon deals', { error: error.message });
      return [];
    }
  }

  /**
   * Map search result to AmazonProduct
   */
  private mapProduct(item: any, index: number, country: string): AmazonProduct {
    const price = item.product_price 
      ? parseFloat(item.product_price.replace(/[^0-9.]/g, '') || '0')
      : 0;
    
    const originalPrice = item.product_original_price
      ? parseFloat(item.product_original_price.replace(/[^0-9.]/g, '') || '0')
      : undefined;

    const discount = originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : undefined;

    return {
      id: `amazon-${item.asin || Date.now()}-${index}`,
      title: item.product_title || 'Unknown Product',
      description: item.product_description,
      price,
      originalPrice,
      currency: this.getCurrencyForCountry(country),
      discount,
      source: 'amazon',
      sourceUrl: item.product_url || `https://www.amazon.com/dp/${item.asin}`,
      sourceId: item.asin || `amz-${Date.now()}-${index}`,
      imageUrl: item.product_photo || item.product_main_image_url,
      rating: item.product_star_rating ? parseFloat(item.product_star_rating) : undefined,
      reviewCount: item.product_num_ratings ? parseInt(item.product_num_ratings) : undefined,
      isPrime: item.is_prime || false,
      seller: item.sales_volume,
      category: item.product_category
    };
  }

  /**
   * Map product details response
   */
  private mapProductDetails(data: any, country: string): AmazonProduct {
    const price = data.product_price 
      ? parseFloat(data.product_price.replace(/[^0-9.]/g, '') || '0')
      : 0;
    
    const originalPrice = data.product_original_price
      ? parseFloat(data.product_original_price.replace(/[^0-9.]/g, '') || '0')
      : undefined;

    return {
      id: `amazon-${data.asin}`,
      title: data.product_title || 'Unknown Product',
      description: data.product_description || data.about_product?.join(' '),
      price,
      originalPrice,
      currency: this.getCurrencyForCountry(country),
      discount: data.product_discount_percentage 
        ? parseInt(data.product_discount_percentage) 
        : undefined,
      source: 'amazon',
      sourceUrl: data.product_url,
      sourceId: data.asin,
      imageUrl: data.product_photo || data.product_main_image_url,
      rating: data.product_star_rating ? parseFloat(data.product_star_rating) : undefined,
      reviewCount: data.product_num_ratings ? parseInt(data.product_num_ratings) : undefined,
      isPrime: data.is_prime || false,
      seller: data.sold_by?.name,
      category: data.product_category,
      features: data.about_product || []
    };
  }

  /**
   * Map deal to AmazonProduct
   */
  private mapDeal(item: any, index: number, country: string): AmazonProduct {
    return {
      id: `amazon-deal-${item.deal_id || Date.now()}-${index}`,
      title: item.deal_title || 'Unknown Deal',
      description: item.deal_badge,
      price: item.deal_price ? parseFloat(item.deal_price.replace(/[^0-9.]/g, '') || '0') : 0,
      originalPrice: item.list_price ? parseFloat(item.list_price.replace(/[^0-9.]/g, '') || '0') : undefined,
      currency: this.getCurrencyForCountry(country),
      discount: item.savings_percentage ? parseInt(item.savings_percentage) : undefined,
      source: 'amazon-deals',
      sourceUrl: item.deal_url || '',
      sourceId: item.deal_id || `deal-${Date.now()}-${index}`,
      imageUrl: item.deal_photo,
      isPrime: item.is_prime || false,
      category: 'Deals'
    };
  }

  /**
   * Get currency code for country
   */
  private getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      'US': 'USD',
      'UK': 'GBP',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'JP': 'JPY',
      'CA': 'CAD',
      'AU': 'AUD',
      'IN': 'INR'
    };
    return currencyMap[country] || 'USD';
  }
}

// Export singleton
export const amazonService = new AmazonService();
export default amazonService;

