/**
 * Zap.co.il Scraper Service
 * 
 * Scrapes product data from Zap.co.il (Israel's largest price comparison site).
 * Used as a fallback when Google CSE quota is exhausted.
 */

import axios from 'axios';
import claudeService from '../core/claudeService';

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

// Common browser User-Agent to avoid blocking
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

class ZapScraperService {
  private readonly baseUrl = 'https://www.zap.co.il';

  /**
   * Search products on Zap.co.il
   */
  async search(query: string, maxResults: number = 10): Promise<Product[]> {
    try {
      console.log(`🔍 [ZapScraper] Searching: "${query}"`);

      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `${this.baseUrl}/search.aspx?keyword=${encodedQuery}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      if (!response.data) {
        console.log('⚠️ [ZapScraper] No data received');
        return [];
      }

      const html = response.data;
      console.log(`📄 [ZapScraper] Got ${html.length} bytes of HTML`);

      // Parse HTML using Claude
      return await this.parseHtml(html, query, searchUrl, maxResults);
    } catch (error: any) {
      console.error('❌ [ZapScraper] Search failed:', error.message);
      
      // If scraping fails, return empty array (graceful degradation)
      return [];
    }
  }

  /**
   * Parse Zap.co.il HTML using Claude to extract product data
   */
  private async parseHtml(
    html: string, 
    query: string, 
    searchUrl: string,
    maxResults: number
  ): Promise<Product[]> {
    try {
      // Extract relevant HTML sections to reduce token usage
      const relevantHtml = this.extractProductSections(html);
      
      if (!relevantHtml) {
        console.log('⚠️ [ZapScraper] No product sections found in HTML');
        return [];
      }

      const prompt = `Parse this Zap.co.il (Israeli price comparison) HTML and extract product information.

Search query: "${query}"

HTML content (product listings):
${relevantHtml.substring(0, 15000)}

Extract up to ${maxResults} products. For each product, find:
- Product name (in Hebrew or English)
- Price in ILS (Israeli Shekels) 
- Store name (the cheapest offer)
- Product URL/link if available
- Original price if there's a discount

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "products": [
    {
      "title": "product name",
      "price": 299.00,
      "originalPrice": 399.00,
      "store": "store name",
      "productPath": "/path/to/product or full URL",
      "imageUrl": "image URL if found"
    }
  ]
}

If no products found, return: {"products": []}`;

      const response = await claudeService.generateText(prompt, 2500);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleanResponse);
      } catch {
        console.error('❌ [ZapScraper] Failed to parse Claude response');
        return [];
      }

      const products: Product[] = (parsed.products || []).map((p: any, index: number) => {
        // Build product URL
        let productUrl = searchUrl;
        if (p.productPath) {
          if (p.productPath.startsWith('http')) {
            productUrl = p.productPath;
          } else {
            productUrl = `${this.baseUrl}${p.productPath.startsWith('/') ? '' : '/'}${p.productPath}`;
          }
        }

        // Calculate discount
        let discount: number | undefined;
        if (p.originalPrice && p.price && p.originalPrice > p.price) {
          discount = Math.round((1 - p.price / p.originalPrice) * 100);
        }

        return {
          title: p.title || `Product ${index + 1}`,
          description: `Found on ${p.store || 'Zap.co.il'}`,
          price: parseFloat(p.price) || 0,
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : undefined,
          currency: 'ILS',
          discount,
          source: p.store || 'Zap',
          sourceUrl: productUrl,
          sourceId: `zap-${Date.now()}-${index}`,
          imageUrl: p.imageUrl,
          category: this.inferCategory(query),
          tags: ['israeli', 'zap', p.store?.toLowerCase() || 'unknown'].filter(Boolean)
        };
      }).filter((p: Product) => p.price > 0);

      console.log(`📦 [ZapScraper] Parsed ${products.length} products`);
      return products;
    } catch (error: any) {
      console.error('❌ [ZapScraper] Parse failed:', error.message);
      return [];
    }
  }

  /**
   * Extract product-related HTML sections to reduce token usage
   */
  private extractProductSections(html: string): string {
    // Try to find product listing containers
    const patterns = [
      /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<div[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<li[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/li>/gi
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        return matches.slice(0, 15).join('\n');
      }
    }

    // If no specific patterns found, try to find the main content area
    const mainContentMatch = html.match(/<main[^>]*>[\s\S]*?<\/main>/i);
    if (mainContentMatch) {
      return mainContentMatch[0].substring(0, 20000);
    }

    // Last resort: return a chunk of the body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1].substring(0, 20000);
    }

    return html.substring(0, 20000);
  }

  /**
   * Infer product category from search query
   */
  private inferCategory(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    const categories: Record<string, string[]> = {
      'Electronics': ['phone', 'laptop', 'tablet', 'headphones', 'speaker', 'camera', 'tv', 'monitor', 'טלפון', 'מחשב', 'אוזניות'],
      'Gaming': ['game', 'gaming', 'console', 'playstation', 'xbox', 'nintendo', 'פלייסטיישן', 'קונסולה'],
      'Appliances': ['refrigerator', 'washing', 'microwave', 'oven', 'מקרר', 'מכונת כביסה', 'מיקרוגל'],
      'Fashion': ['shirt', 'dress', 'shoes', 'bag', 'watch', 'חולצה', 'שמלה', 'נעליים'],
      'Home': ['furniture', 'sofa', 'table', 'chair', 'bed', 'רהיט', 'ספה', 'כיסא', 'מיטה'],
      'Cooking': ['food', 'grocery', 'אוכל', 'מזון', 'שופרסל', 'רמי לוי'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Get direct product search URL for Zap
   */
  getSearchUrl(query: string): string {
    return `${this.baseUrl}/search.aspx?keyword=${encodeURIComponent(query)}`;
  }
}

// Export singleton instance
export const zapScraperService = new ZapScraperService();
export default zapScraperService;



