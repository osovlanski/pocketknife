/**
 * SerpApi Integration Service
 * 
 * Web search API for enhanced Google/Bing search results.
 * Free tier: 100 searches/month
 * 
 * Used by: Learning Agent (tutorials), Shopping Agent (price comparison)
 */

import axios from 'axios';
import { configService } from '../core/configService';
import { cacheService, cacheKeys } from '../core/cacheService';

// Types
export interface SerpSearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  source?: string;
  date?: string;
}

export interface SerpShoppingResult {
  title: string;
  link: string;
  price: string;
  source: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
}

export interface SerpApiStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
  remainingSearches?: number;
}

class SerpApiService {
  private readonly baseUrl = 'https://serpapi.com/search';

  private get apiKey(): string {
    return process.env.SERPAPI_KEY || '';
  }

  /**
   * Check if SerpApi is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get connection status
   */
  async getStatus(): Promise<SerpApiStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'SERPAPI_KEY not set in .env'
      };
    }

    try {
      // Make a minimal search to test connection
      const response = await axios.get('https://serpapi.com/account', {
        params: { api_key: this.apiKey }
      });

      return {
        configured: true,
        connected: true,
        remainingSearches: response.data?.plan_searches_left
      };
    } catch (error: any) {
      return {
        configured: true,
        connected: false,
        error: error.response?.data?.error || error.message || 'Connection failed'
      };
    }
  }

  /**
   * Google Web Search
   */
  async googleSearch(query: string, options?: {
    num?: number;
    location?: string;
    language?: string;
  }): Promise<SerpSearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('SerpApi not configured, skipping search');
      return [];
    }

    // Check cache first
    const cacheKey = `serp:google:${query}:${JSON.stringify(options)}`;
    const cached = await cacheService.get<SerpSearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          engine: 'google',
          q: query,
          num: options?.num || configService.get('serpapi.defaultResults', 10),
          location: options?.location,
          hl: options?.language || 'en'
        },
        timeout: 10000
      });

      const results: SerpSearchResult[] = (response.data.organic_results || []).map((r: any, i: number) => ({
        position: i + 1,
        title: r.title,
        link: r.link,
        snippet: r.snippet || '',
        source: r.source,
        date: r.date
      }));

      // Cache for 1 hour
      await cacheService.set(cacheKey, results, { ttl: 3600 });
      
      return results;
    } catch (error: any) {
      console.error('SerpApi Google search error:', error.message);
      return [];
    }
  }

  /**
   * Google Shopping Search (for price comparison)
   */
  async googleShopping(query: string, options?: {
    minPrice?: number;
    maxPrice?: number;
    location?: string;
  }): Promise<SerpShoppingResult[]> {
    if (!this.isConfigured()) {
      console.warn('SerpApi not configured, skipping shopping search');
      return [];
    }

    // Check cache first
    const cacheKey = `serp:shopping:${query}:${JSON.stringify(options)}`;
    const cached = await cacheService.get<SerpShoppingResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          engine: 'google_shopping',
          q: query,
          location: options?.location,
          tbs: this.buildPriceFilter(options?.minPrice, options?.maxPrice)
        },
        timeout: 10000
      });

      const results: SerpShoppingResult[] = (response.data.shopping_results || []).map((r: any) => ({
        title: r.title,
        link: r.link,
        price: r.price || r.extracted_price,
        source: r.source,
        thumbnail: r.thumbnail,
        rating: r.rating,
        reviews: r.reviews
      }));

      // Cache for 30 minutes (prices change)
      await cacheService.set(cacheKey, results, { ttl: 1800 });
      
      return results;
    } catch (error: any) {
      console.error('SerpApi Shopping search error:', error.message);
      return [];
    }
  }

  /**
   * Search for tutorials and documentation
   */
  async searchTutorials(topic: string, language?: string): Promise<SerpSearchResult[]> {
    const query = `${topic} tutorial documentation guide ${language || ''}`.trim();
    return this.googleSearch(query, { num: 15 });
  }

  /**
   * Search for product prices
   */
  async searchProductPrices(productName: string, options?: {
    minPrice?: number;
    maxPrice?: number;
  }): Promise<SerpShoppingResult[]> {
    return this.googleShopping(productName, options);
  }

  /**
   * Search for recipes
   */
  async searchRecipes(ingredients: string[]): Promise<SerpSearchResult[]> {
    const query = `recipe with ${ingredients.join(' and ')}`;
    return this.googleSearch(query, { num: 10 });
  }

  /**
   * Search for job listings
   */
  async searchJobs(query: string, location?: string): Promise<SerpSearchResult[]> {
    const searchQuery = location 
      ? `${query} jobs ${location}` 
      : `${query} jobs remote`;
    return this.googleSearch(searchQuery, { num: 20 });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private buildPriceFilter(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined;
    
    const parts: string[] = [];
    if (min) parts.push(`price:${min}`);
    if (max) parts.push(`price:${max}`);
    
    return parts.join(',');
  }
}

export const serpApiService = new SerpApiService();
export default serpApiService;
