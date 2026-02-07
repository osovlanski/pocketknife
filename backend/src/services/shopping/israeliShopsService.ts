/**
 * Israeli Shops Service
 * 
 * Orchestrates product searches across Israeli e-commerce sites.
 * 
 * Strategy:
 * 1. Primary: Google Custom Search API (100 free queries/day)
 * 2. Fallback: Zap.co.il scraper (when quota exhausted or API fails)
 * 
 * NOTE: Store configurations are now stored in the database (ExternalStore table).
 * The hardcoded fallback data is kept for initial migration and offline mode.
 */

import { googleSearchService, quotaManager } from '../core/googleSearchService';
import { zapScraperService } from './zapScraperService';
import claudeService from '../core/claudeService';
import { configService } from '../core/configService';
import { externalStoreService } from '../core/externalDataService';
import { getPrisma } from '../core/databaseService';

interface Product {
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  source: string;
  sourceUrl: string;
  sourceId?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
}

interface SearchResult {
  products: Product[];
  source: 'google_cse' | 'zap_scraper' | 'none';
  quotaStatus: {
    used: number;
    limit: number;
    remaining: number;
  };
}

class IsraeliShopsService {
  /**
   * Search Israeli shops for products
   * Uses Google CSE as primary, falls back to Zap scraper when quota exhausted
   */
  async search(query: string, maxResults: number = 10): Promise<SearchResult> {
    console.log(`🇮🇱 [IsraeliShops] Searching for: "${query}"`);

    const quotaStatus = quotaManager.getStatus();

    // Check if we can use Google CSE
    if (googleSearchService.hasQuota() && googleSearchService.isAvailable()) {
      try {
        console.log('🔍 [IsraeliShops] Using Google Custom Search API');
        const searchResults = await googleSearchService.search(query, 'shopping', {
          maxResults,
          geolocation: 'il'
        });
        
        // Parse results into products
        if (searchResults.length > 0) {
          const products = await this.parseSearchResults(searchResults, query);
          
          return {
            products,
            source: 'google_cse',
            quotaStatus: quotaManager.getStatus()
          };
        }

        // If Google CSE returned no results, try scraper as fallback
        console.log('⚠️ [IsraeliShops] Google CSE returned no results, trying scraper');
      } catch (error: any) {
        console.error('❌ [IsraeliShops] Google CSE failed:', error.message);
        
        // Fall through to scraper
        console.log('🔄 [IsraeliShops] Falling back to Zap scraper');
      }
    } else {
      if (!googleSearchService.isAvailable()) {
        console.log('⚠️ [IsraeliShops] Google CSE not configured, using scraper');
      } else {
        console.log(`⚠️ [IsraeliShops] Google CSE quota exhausted (${quotaStatus.used}/${quotaStatus.limit}), using scraper`);
      }
    }

    // Use Zap scraper as fallback
    try {
      console.log('🔍 [IsraeliShops] Using Zap.co.il scraper');
      const products = await zapScraperService.search(query, maxResults);

      return {
        products,
        source: 'zap_scraper',
        quotaStatus: quotaManager.getStatus()
      };
    } catch (error: any) {
      console.error('❌ [IsraeliShops] Zap scraper also failed:', error.message);
      
      return {
        products: [],
        source: 'none',
        quotaStatus: quotaManager.getStatus()
      };
    }
  }

  /**
   * Parse Google search results into product format using Claude
   */
  private async parseSearchResults(
    results: Array<{ title: string; link: string; snippet: string; displayLink: string; imageUrl?: string }>,
    query: string
  ): Promise<Product[]> {
    try {
      const prompt = `Parse these Israeli e-commerce search results into product data.
Extract: product name, price (in ILS or USD), store name, and any discount.
If price isn't clear, estimate based on the product type.

Search query: "${query}"

Search results:
${results.slice(0, configService.get('limits.shopping.israeliShops.search.maxResults', 8) as number).map((item, i) => `
${i + 1}. Title: ${item.title}
   URL: ${item.link}
   Site: ${item.displayLink}
   Description: ${item.snippet}
`).join('\n')}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "products": [
    {
      "title": "clean product name",
      "price": 199.99,
      "currency": "ILS",
      "originalPrice": 249.99,
      "discount": 20,
      "source": "store name",
      "category": "Electronics/Gaming/etc"
    }
  ]
}`;

      const aiMaxTokens = configService.get('shopping.ai.maxTokens', 2000);
      const response = await claudeService.generateText(prompt, aiMaxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      return (parsed.products || []).map((product: any, index: number) => {
        const item = results[index];
        return {
          title: product.title || item?.title || 'Unknown Product',
          description: item?.snippet,
          price: product.price || 0,
          originalPrice: product.originalPrice,
          currency: product.currency || 'ILS',
          discount: product.discount,
          source: this.extractStoreName(item?.displayLink || product.source || 'israeli'),
          sourceUrl: item?.link || '',
          sourceId: `gcs-${Date.now()}-${index}`,
          imageUrl: item?.imageUrl,
          category: product.category,
          tags: ['israeli', this.extractStoreName(item?.displayLink || '')]
        };
      }).filter((p: Product) => p.sourceUrl && p.price > 0);
    } catch (error: any) {
      console.error('❌ [IsraeliShops] Failed to parse results:', error.message);
      return [];
    }
  }

  /**
   * Extract store name from domain (uses fallback mapping)
   */
  private extractStoreName(displayLink: string): string {
    const storeNames = this.getFallbackStoreNames();

    for (const [domain, name] of Object.entries(storeNames)) {
      if (displayLink.includes(domain)) return name;
    }

    return displayLink.replace(/^www\./, '').split('.')[0] || 'Israeli Shop';
  }

  /**
   * Fallback store name mappings
   */
  private getFallbackStoreNames(): Record<string, string> {
    return {
      'zap.co.il': 'Zap',
      'ksp.co.il': 'KSP',
      'ivory.co.il': 'Ivory',
      'shufersal.co.il': 'Shufersal',
      'rami-levy.co.il': 'Rami Levy',
      'bug.co.il': 'Bug',
      'azrieli.com': 'Azrieli',
      'ace.co.il': 'ACE',
      'homecenter.co.il': 'Home Center',
      'lastprice.co.il': 'Last Price'
    };
  }

  /**
   * Get store name mappings from database
   */
  async getStoreNamesAsync(): Promise<Record<string, string>> {
    try {
      const prisma = getPrisma();
      if (!prisma) return this.getFallbackStoreNames();
      
      const dbStores = await (prisma as any).externalStore.findMany({
        where: { status: 'ACTIVE', country: 'IL' }
      });
      
      if (dbStores.length > 0) {
        const mapping: Record<string, string> = {};
        dbStores.forEach((s: any) => {
          mapping[s.domain] = s.name;
        });
        return mapping;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch store names from database');
    }
    
    return this.getFallbackStoreNames();
  }

  /**
   * Get current service status
   */
  getStatus(): {
    googleCseAvailable: boolean;
    googleCseConfigured: boolean;
    quotaStatus: ReturnType<typeof quotaManager.getStatus>;
    recommendedSource: string;
  } {
    const quotaStatus = quotaManager.getStatus();
    const googleCseConfigured = googleSearchService.isAvailable();
    const googleCseAvailable = googleCseConfigured && googleSearchService.hasQuota();

    return {
      googleCseAvailable,
      googleCseConfigured,
      quotaStatus,
      recommendedSource: googleCseAvailable ? 'google_cse' : 'zap_scraper'
    };
  }

  /**
   * Check if Israeli shop search is available
   */
  isAvailable(): boolean {
    // Always available - either via Google CSE or Zap scraper
    return true;
  }

  /**
   * Get direct search URLs for Israeli shops (sync fallback)
   */
  getSearchUrls(query: string): Record<string, string> {
    return this.getFallbackSearchUrls(query);
  }

  /**
   * Fallback search URL patterns
   */
  private getFallbackSearchUrls(query: string): Record<string, string> {
    const encodedQuery = encodeURIComponent(query);
    
    return {
      zap: `https://www.zap.co.il/search.aspx?keyword=${encodedQuery}`,
      ksp: `https://ksp.co.il/m_action/search/?q=${encodedQuery}`,
      ivory: `https://www.ivory.co.il/search?q=${encodedQuery}`,
      bug: `https://www.bug.co.il/search?q=${encodedQuery}`,
      shufersal: `https://www.shufersal.co.il/online/he/search?q=${encodedQuery}`,
      ramiLevy: `https://www.rami-levy.co.il/he/online/search?q=${encodedQuery}`
    };
  }

  /**
   * Get search URLs from database
   */
  async getSearchUrlsAsync(query: string): Promise<Record<string, string>> {
    const encodedQuery = encodeURIComponent(query);
    
    try {
      const prisma = getPrisma();
      if (!prisma) return this.getFallbackSearchUrls(query);
      
      const dbStores = await (prisma as any).externalStore.findMany({
        where: { 
          status: 'ACTIVE', 
          country: 'IL',
          searchUrlPattern: { not: null }
        }
      });
      
      if (dbStores.length > 0) {
        const urls: Record<string, string> = {};
        dbStores.forEach((s: any) => {
          if (s.searchUrlPattern) {
            urls[s.slug] = s.searchUrlPattern.replace('{query}', encodedQuery);
          }
        });
        return urls;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch search URLs from database');
    }
    
    return this.getFallbackSearchUrls(query);
  }

  /**
   * Migrate hardcoded stores to database
   */
  async migrateToDatabase(): Promise<number> {
    const stores = [
      { name: 'Zap', domain: 'zap.co.il', searchUrlPattern: 'https://www.zap.co.il/search.aspx?keyword={query}', categories: ['electronics', 'comparison'] },
      { name: 'KSP', domain: 'ksp.co.il', searchUrlPattern: 'https://ksp.co.il/m_action/search/?q={query}', categories: ['electronics', 'computers'] },
      { name: 'Ivory', domain: 'ivory.co.il', searchUrlPattern: 'https://www.ivory.co.il/search?q={query}', categories: ['electronics', 'appliances'] },
      { name: 'Bug', domain: 'bug.co.il', searchUrlPattern: 'https://www.bug.co.il/search?q={query}', categories: ['electronics', 'computers'] },
      { name: 'Shufersal', domain: 'shufersal.co.il', searchUrlPattern: 'https://www.shufersal.co.il/online/he/search?q={query}', categories: ['grocery', 'supermarket'] },
      { name: 'Rami Levy', domain: 'rami-levy.co.il', searchUrlPattern: 'https://www.rami-levy.co.il/he/online/search?q={query}', categories: ['grocery', 'supermarket'] },
      { name: 'Azrieli', domain: 'azrieli.com', searchUrlPattern: null, categories: ['mall', 'fashion'] },
      { name: 'ACE', domain: 'ace.co.il', searchUrlPattern: 'https://www.ace.co.il/catalogsearch/result/?q={query}', categories: ['home', 'hardware'] },
      { name: 'Home Center', domain: 'homecenter.co.il', searchUrlPattern: 'https://www.homecenter.co.il/search?q={query}', categories: ['home', 'furniture'] },
      { name: 'Last Price', domain: 'lastprice.co.il', searchUrlPattern: 'https://www.lastprice.co.il/search?q={query}', categories: ['comparison', 'deals'] }
    ];

    let count = 0;
    for (const store of stores) {
      try {
        await externalStoreService.create({
          name: store.name,
          domain: store.domain,
          websiteUrl: `https://${store.domain}`,
          searchUrlPattern: store.searchUrlPattern || undefined,
          country: 'IL',
          currency: 'ILS',
          categories: store.categories
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating store ${store.name}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Migrated ${count} Israeli stores to database`);
    return count;
  }

  /**
   * Convert ILS to USD (approximate conversion)
   */
  convertIlsToUsd(ilsPrice: number, rate: number = 0.27): number {
    return Math.round(ilsPrice * rate * 100) / 100;
  }
}

// Export singleton instance
export const israeliShopsService = new IsraeliShopsService();
export default israeliShopsService;

