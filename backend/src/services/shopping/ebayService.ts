/**
 * eBay Browse API Service
 * 
 * Provides real product search using eBay's Browse API via RapidAPI.
 * Also supports direct eBay API access with OAuth.
 * 
 * RapidAPI: https://rapidapi.com/eBay/api/ebay-search-result
 * Direct API: https://developer.ebay.com/api-docs/buy/browse/overview.html
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface EbayProduct {
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
  condition?: string;
  seller?: {
    name: string;
    feedbackScore?: number;
    feedbackPercentage?: number;
  };
  shipping?: {
    cost: number;
    type: string;
  };
  location?: string;
  category?: string;
  itemEndDate?: Date;
}

export interface EbaySearchParams {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED' | 'REFURBISHED';
  sortBy?: 'price' | 'newlyListed' | 'endingSoonest' | 'bestMatch';
  limit?: number;
}

interface EbayApiResponse {
  itemSummaries?: Array<{
    itemId: string;
    title: string;
    price: { value: string; currency: string };
    itemWebUrl: string;
    image?: { imageUrl: string };
    condition?: string;
    seller?: {
      username: string;
      feedbackScore?: number;
      feedbackPercentage?: string;
    };
    shippingOptions?: Array<{
      shippingCost?: { value: string; currency: string };
      shippingCostType?: string;
    }>;
    itemLocation?: { country: string };
    categories?: Array<{ categoryName: string }>;
    currentBidPrice?: { value: string; currency: string };
    buyItNowAvailable?: boolean;
  }>;
  total?: number;
}

// =============================================================================
// EBAY SERVICE
// =============================================================================

class EbayService {
  private rapidApiClient: AxiosInstance | null = null;
  private directApiClient: AxiosInstance | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    // RapidAPI client (primary - easier to use)
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (rapidApiKey) {
      this.rapidApiClient = axios.create({
        baseURL: 'https://ebay-search-result.p.rapidapi.com',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'ebay-search-result.p.rapidapi.com'
        },
        timeout: configService.get('shopping.api.timeoutMs', 10000)
      });
      logger.init('eBay RapidAPI client initialized');
    }

    // Direct eBay API client (fallback - requires OAuth)
    const ebayAppId = process.env.EBAY_APP_ID;
    const ebayCertId = process.env.EBAY_CERT_ID;
    if (ebayAppId && ebayCertId) {
      this.directApiClient = axios.create({
        baseURL: 'https://api.ebay.com/buy/browse/v1',
        timeout: configService.get('shopping.api.timeoutMs', 10000)
      });
      logger.init('eBay Direct API client initialized');
    }
  }

  /**
   * Check if eBay search is available
   */
  isAvailable(): boolean {
    return !!(this.rapidApiClient || this.directApiClient);
  }

  /**
   * Get OAuth token for direct eBay API
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    if (!appId || !certId) return null;

    try {
      const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');
      const response = await axios.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000);
      return this.accessToken;
    } catch (error: any) {
      logger.fail('Failed to get eBay OAuth token', { error: error.message });
      return null;
    }
  }

  /**
   * Search products on eBay
   */
  async search(params: EbaySearchParams): Promise<EbayProduct[]> {
    const { query, category, minPrice, maxPrice, condition, sortBy, limit = 20 } = params;

    // Check cache first
    const cacheKey = `ebay:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<EbayProduct[]>(cacheKey);
    if (cached) {
      logger.cache('eBay search cache hit');
      return cached;
    }

    // Try RapidAPI first (simpler)
    if (this.rapidApiClient) {
      try {
        const products = await this.searchViaRapidApi(params);
        if (products.length > 0) {
          await cacheService.set(cacheKey, products, { ttl: configService.get('cache.shopping.ebay.searchTtlSeconds', 1800) as number }); // 30 min cache
          return products;
        }
      } catch (error: any) {
        logger.warn('eBay RapidAPI search failed, trying direct API', { error: error.message });
      }
    }

    // Try direct eBay API
    if (this.directApiClient) {
      try {
        const products = await this.searchViaDirectApi(params);
        if (products.length > 0) {
          await cacheService.set(cacheKey, products, { ttl: configService.get('cache.shopping.ebay.searchTtlSeconds', 1800) as number });
          return products;
        }
      } catch (error: any) {
        logger.fail('eBay direct API search failed', { error: error.message });
      }
    }

    return [];
  }

  /**
   * Search via RapidAPI
   */
  private async searchViaRapidApi(params: EbaySearchParams): Promise<EbayProduct[]> {
    if (!this.rapidApiClient) return [];

    const { query, limit = 20 } = params;

    try {
      const response = await this.rapidApiClient.get('/search', {
        params: {
          keywords: query,
          page_number: '1',
          sort_order: params.sortBy === 'price' ? 'PricePlusShippingLowest' : 'BestMatch',
          entries_per_page: String(Math.min(limit, 50))
        }
      });

      const items = response.data?.results || [];
      
      return items.map((item: any, index: number) => this.mapRapidApiResult(item, index));
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('eBay RapidAPI rate limit exceeded');
      }
      throw error;
    }
  }

  /**
   * Search via direct eBay Browse API
   */
  private async searchViaDirectApi(params: EbaySearchParams): Promise<EbayProduct[]> {
    if (!this.directApiClient) return [];

    const token = await this.getAccessToken();
    if (!token) return [];

    const { query, minPrice, maxPrice, condition, sortBy, limit = 20 } = params;

    try {
      // Build filter string
      const filters: string[] = [];
      if (minPrice) filters.push(`price:[${minPrice}]`);
      if (maxPrice) filters.push(`price:[..${maxPrice}]`);
      if (condition) filters.push(`conditions:{${condition}}`);

      const sortMap: Record<string, string> = {
        price: 'price',
        newlyListed: 'newlyListed',
        endingSoonest: 'endingSoonest',
        bestMatch: ''
      };

      const response = await this.directApiClient.get<EbayApiResponse>('/item_summary/search', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        },
        params: {
          q: query,
          limit: Math.min(limit, 50),
          ...(filters.length > 0 && { filter: filters.join(',') }),
          ...(sortBy && sortMap[sortBy] && { sort: sortMap[sortBy] })
        }
      });

      const items = response.data?.itemSummaries || [];
      
      return items.map((item, index) => this.mapDirectApiResult(item, index));
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, clear it
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw error;
    }
  }

  /**
   * Map RapidAPI result to EbayProduct
   */
  private mapRapidApiResult(item: any, index: number): EbayProduct {
    const price = parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0');
    const originalPrice = item.original_price 
      ? parseFloat(item.original_price.replace(/[^0-9.]/g, '') || '0')
      : undefined;
    
    const discount = originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : undefined;

    return {
      id: `ebay-${item.item_id || Date.now()}-${index}`,
      title: item.title || 'Unknown Product',
      description: item.subtitle,
      price,
      originalPrice,
      currency: 'USD',
      discount,
      source: 'ebay',
      sourceUrl: item.item_link || item.url || `https://www.ebay.com/itm/${item.item_id}`,
      sourceId: item.item_id || `rapid-${Date.now()}-${index}`,
      imageUrl: item.image || item.thumbnail,
      condition: item.condition,
      seller: item.seller_name ? {
        name: item.seller_name,
        feedbackScore: item.seller_feedback_score,
        feedbackPercentage: item.seller_positive_feedback
      } : undefined,
      shipping: item.shipping_cost ? {
        cost: parseFloat(item.shipping_cost.replace(/[^0-9.]/g, '') || '0'),
        type: item.shipping_type || 'Standard'
      } : undefined,
      location: item.item_location,
      category: item.category
    };
  }

  /**
   * Map direct eBay API result to EbayProduct
   */
  private mapDirectApiResult(item: any, index: number): EbayProduct {
    const price = parseFloat(item.price?.value || '0');
    const currentBid = item.currentBidPrice 
      ? parseFloat(item.currentBidPrice.value || '0')
      : undefined;
    
    const shippingCost = item.shippingOptions?.[0]?.shippingCost
      ? parseFloat(item.shippingOptions[0].shippingCost.value || '0')
      : 0;

    return {
      id: `ebay-${item.itemId}`,
      title: item.title || 'Unknown Product',
      price: currentBid || price,
      currency: item.price?.currency || 'USD',
      source: 'ebay',
      sourceUrl: item.itemWebUrl,
      sourceId: item.itemId,
      imageUrl: item.image?.imageUrl,
      condition: item.condition,
      seller: item.seller ? {
        name: item.seller.username,
        feedbackScore: item.seller.feedbackScore,
        feedbackPercentage: item.seller.feedbackPercentage 
          ? parseFloat(item.seller.feedbackPercentage) 
          : undefined
      } : undefined,
      shipping: {
        cost: shippingCost,
        type: item.shippingOptions?.[0]?.shippingCostType || 'Standard'
      },
      location: item.itemLocation?.country,
      category: item.categories?.[0]?.categoryName
    };
  }

  /**
   * Get product details by ID
   */
  async getProduct(itemId: string): Promise<EbayProduct | null> {
    if (!this.directApiClient) return null;

    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await this.directApiClient.get(`/item/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      return this.mapDirectApiResult(response.data, 0);
    } catch (error: any) {
      logger.fail('Failed to get eBay product', { itemId, error: error.message });
      return null;
    }
  }
}

// Export singleton
export const ebayService = new EbayService();
export default ebayService;



