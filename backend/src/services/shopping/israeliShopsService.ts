/**
 * Israeli Shops Service
 * 
 * Orchestrates product searches across Israeli e-commerce sites.
 * 
 * Strategy:
 * 1. Primary: Google Custom Search API (100 free queries/day)
 * 2. Fallback: Zap.co.il scraper (when quota exhausted or API fails)
 */

import { googleSearchService, quotaManager } from '../core/googleSearchService';
import { zapScraperService } from './zapScraperService';
import claudeService from '../core/claudeService';
import { configService } from '../core/configService';

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
${results.slice(0, 8).map((item, i) => `
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
   * Extract store name from domain
   */
  private extractStoreName(displayLink: string): string {
    const storeNames: Record<string, string> = {
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

    for (const [domain, name] of Object.entries(storeNames)) {
      if (displayLink.includes(domain)) return name;
    }

    return displayLink.replace(/^www\./, '').split('.')[0] || 'Israeli Shop';
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
   * Get direct search URLs for Israeli shops
   */
  getSearchUrls(query: string): Record<string, string> {
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
   * Convert ILS to USD (approximate conversion)
   */
  convertIlsToUsd(ilsPrice: number, rate: number = 0.27): number {
    return Math.round(ilsPrice * rate * 100) / 100;
  }
}

// Export singleton instance
export const israeliShopsService = new IsraeliShopsService();
export default israeliShopsService;

