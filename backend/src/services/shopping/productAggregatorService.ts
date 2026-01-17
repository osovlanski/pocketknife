/**
 * Product Aggregator Service
 * 
 * Orchestrates product searches across multiple e-commerce platforms:
 * - eBay (via RapidAPI or direct Browse API)
 * - Amazon (via RapidAPI)
 * - AliExpress (via RapidAPI)
 * - Israeli shops (via Google CSE or Zap scraper)
 * 
 * Features:
 * - Parallel multi-source search
 * - Result normalization and deduplication
 * - AI-powered deal scoring
 * - Price comparison across sources
 */

import { ebayService, EbayProduct, EbaySearchParams } from './ebayService';
import { amazonService, AmazonProduct, AmazonSearchParams } from './amazonService';
import { aliexpressService, AliExpressProduct, AliExpressSearchParams } from './aliexpressService';
import { israeliShopsService } from './israeliShopsService';
import claudeService from '../core/claudeService';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedProduct {
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
  condition?: string;
  seller?: {
    name: string;
    rating?: number;
  };
  shipping?: {
    cost: number;
    freeShipping?: boolean;
    type?: string;
  };
  category?: string;
  dealScore?: number;
  dealReason?: string;
  isPrime?: boolean;
  tags?: string[];
}

export interface AggregatedSearchParams {
  query: string;
  sources?: ('ebay' | 'amazon' | 'aliexpress' | 'israeli')[];
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED' | 'REFURBISHED';
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'deals';
  limit?: number;
  country?: string;
  scoreDealsWith?: 'ai' | 'algorithm' | 'none';
}

export interface AggregatedSearchResult {
  products: UnifiedProduct[];
  totalCount: number;
  sources: {
    name: string;
    count: number;
    available: boolean;
    error?: string;
  }[];
  searchDurationMs: number;
}

// =============================================================================
// PRODUCT AGGREGATOR SERVICE
// =============================================================================

class ProductAggregatorService {
  /**
   * Get available sources
   */
  getAvailableSources(): string[] {
    const sources: string[] = [];
    if (ebayService.isAvailable()) sources.push('ebay');
    if (amazonService.isAvailable()) sources.push('amazon');
    if (aliexpressService.isAvailable()) sources.push('aliexpress');
    if (israeliShopsService.isAvailable()) sources.push('israeli');
    return sources;
  }

  /**
   * Search products across multiple platforms
   */
  async search(params: AggregatedSearchParams): Promise<AggregatedSearchResult> {
    const startTime = Date.now();
    const {
      query,
      sources = ['ebay', 'amazon', 'aliexpress'],
      minPrice,
      maxPrice,
      condition,
      sortBy = 'relevance',
      limit = 30,
      country = 'US',
      scoreDealsWith = 'algorithm'
    } = params;

    logger.search('Aggregated product search started', { query, sources });

    const sourceResults: AggregatedSearchResult['sources'] = [];
    const allProducts: UnifiedProduct[] = [];

    // Prepare search promises for each source
    const searchPromises: Promise<{ source: string; products: UnifiedProduct[]; error?: string }>[] = [];

    if (sources.includes('ebay') && ebayService.isAvailable()) {
      searchPromises.push(
        this.searchEbay({ query, minPrice, maxPrice, condition, limit: Math.ceil(limit / sources.length) })
          .then(products => ({ source: 'ebay', products }))
          .catch(error => ({ source: 'ebay', products: [], error: error.message }))
      );
    }

    if (sources.includes('amazon') && amazonService.isAvailable()) {
      searchPromises.push(
        this.searchAmazon({ query, minPrice, maxPrice, limit: Math.ceil(limit / sources.length), country })
          .then(products => ({ source: 'amazon', products }))
          .catch(error => ({ source: 'amazon', products: [], error: error.message }))
      );
    }

    if (sources.includes('aliexpress') && aliexpressService.isAvailable()) {
      searchPromises.push(
        this.searchAliExpress({ query, minPrice, maxPrice, limit: Math.ceil(limit / sources.length) })
          .then(products => ({ source: 'aliexpress', products }))
          .catch(error => ({ source: 'aliexpress', products: [], error: error.message }))
      );
    }

    if (sources.includes('israeli') && israeliShopsService.isAvailable()) {
      searchPromises.push(
        this.searchIsraeli(query, Math.ceil(limit / sources.length))
          .then(products => ({ source: 'israeli', products }))
          .catch(error => ({ source: 'israeli', products: [], error: error.message }))
      );
    }

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises);

    // Collect results
    for (const result of results) {
      sourceResults.push({
        name: result.source,
        count: result.products.length,
        available: !result.error,
        error: result.error
      });
      allProducts.push(...result.products);
    }

    // Score deals if requested
    let scoredProducts = allProducts;
    if (scoreDealsWith === 'ai' && allProducts.length > 0) {
      scoredProducts = await this.scoreDealsBatchWithAI(allProducts);
    } else if (scoreDealsWith === 'algorithm') {
      scoredProducts = this.scoreDealsBatchWithAlgorithm(allProducts);
    }

    // Sort products
    const sortedProducts = this.sortProducts(scoredProducts, sortBy);

    // Deduplicate by title similarity
    const uniqueProducts = this.deduplicateProducts(sortedProducts);

    // Limit results
    const finalProducts = uniqueProducts.slice(0, limit);

    const searchDurationMs = Date.now() - startTime;
    logger.success('Aggregated search completed', { 
      query, 
      totalProducts: finalProducts.length,
      durationMs: searchDurationMs 
    });

    return {
      products: finalProducts,
      totalCount: finalProducts.length,
      sources: sourceResults,
      searchDurationMs
    };
  }

  /**
   * Search eBay and normalize results
   */
  private async searchEbay(params: EbaySearchParams): Promise<UnifiedProduct[]> {
    const products = await ebayService.search(params);
    return products.map(p => this.normalizeEbayProduct(p));
  }

  /**
   * Search Amazon and normalize results
   */
  private async searchAmazon(params: AmazonSearchParams): Promise<UnifiedProduct[]> {
    const products = await amazonService.search(params);
    return products.map(p => this.normalizeAmazonProduct(p));
  }

  /**
   * Search AliExpress and normalize results
   */
  private async searchAliExpress(params: AliExpressSearchParams): Promise<UnifiedProduct[]> {
    const products = await aliexpressService.search(params);
    return products.map(p => this.normalizeAliExpressProduct(p));
  }

  /**
   * Search Israeli shops and normalize results
   */
  private async searchIsraeli(query: string, limit: number): Promise<UnifiedProduct[]> {
    const result = await israeliShopsService.search(query, limit);
    return result.products.map((p, i) => this.normalizeIsraeliProduct(p, i));
  }

  /**
   * Normalize eBay product to unified format
   */
  private normalizeEbayProduct(p: EbayProduct): UnifiedProduct {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      discount: p.discount,
      source: 'ebay',
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId,
      imageUrl: p.imageUrl,
      condition: p.condition,
      seller: p.seller ? { name: p.seller.name, rating: p.seller.feedbackPercentage } : undefined,
      shipping: p.shipping ? { cost: p.shipping.cost, type: p.shipping.type } : undefined,
      category: p.category,
      tags: ['ebay', p.condition?.toLowerCase() || 'unknown'].filter(Boolean)
    };
  }

  /**
   * Normalize Amazon product to unified format
   */
  private normalizeAmazonProduct(p: AmazonProduct): UnifiedProduct {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      discount: p.discount,
      source: 'amazon',
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId,
      imageUrl: p.imageUrl,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isPrime: p.isPrime,
      seller: p.seller ? { name: p.seller } : undefined,
      category: p.category,
      tags: ['amazon', p.isPrime ? 'prime' : ''].filter(Boolean)
    };
  }

  /**
   * Normalize AliExpress product to unified format
   */
  private normalizeAliExpressProduct(p: AliExpressProduct): UnifiedProduct {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      discount: p.discount,
      source: 'aliexpress',
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId,
      imageUrl: p.imageUrl,
      rating: p.rating,
      reviewCount: p.reviewCount,
      seller: p.seller,
      shipping: p.shipping ? { 
        cost: p.shipping.cost, 
        freeShipping: p.shipping.freeShipping 
      } : undefined,
      category: p.category,
      tags: ['aliexpress', p.shipping?.freeShipping ? 'free-shipping' : ''].filter(Boolean)
    };
  }

  /**
   * Normalize Israeli product to unified format
   */
  private normalizeIsraeliProduct(p: any, index: number): UnifiedProduct {
    // Convert ILS to USD if needed
    const price = p.currency === 'ILS' 
      ? israeliShopsService.convertIlsToUsd(p.price)
      : p.price;
    const originalPrice = p.originalPrice && p.currency === 'ILS'
      ? israeliShopsService.convertIlsToUsd(p.originalPrice)
      : p.originalPrice;

    return {
      id: `israeli-${p.sourceId || Date.now()}-${index}`,
      title: p.title,
      description: p.description,
      price,
      originalPrice,
      currency: 'USD',
      discount: p.discount,
      source: `israeli-${p.source.toLowerCase().replace(/\s+/g, '-')}`,
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId || `isr-${Date.now()}-${index}`,
      imageUrl: p.imageUrl,
      category: p.category,
      tags: ['israeli', p.source.toLowerCase(), ...(p.tags || [])].filter(Boolean)
    };
  }

  /**
   * Score deals using algorithm (fast)
   */
  private scoreDealsBatchWithAlgorithm(products: UnifiedProduct[]): UnifiedProduct[] {
    return products.map(product => {
      let score = 50; // Base score
      let reasons: string[] = [];

      // Discount scoring (max +25)
      if (product.discount) {
        if (product.discount >= 50) {
          score += 25;
          reasons.push('50%+ off');
        } else if (product.discount >= 30) {
          score += 18;
          reasons.push('30%+ off');
        } else if (product.discount >= 15) {
          score += 10;
          reasons.push('15%+ off');
        } else {
          score += 5;
        }
      }

      // Rating scoring (max +15)
      if (product.rating) {
        if (product.rating >= 4.5) {
          score += 15;
          reasons.push('Highly rated');
        } else if (product.rating >= 4.0) {
          score += 10;
        } else if (product.rating >= 3.5) {
          score += 5;
        }
      }

      // Review count scoring (max +10)
      if (product.reviewCount) {
        if (product.reviewCount >= 1000) {
          score += 10;
          reasons.push('Popular');
        } else if (product.reviewCount >= 100) {
          score += 5;
        }
      }

      // Prime/free shipping bonus (max +5)
      if (product.isPrime || product.shipping?.freeShipping) {
        score += 5;
        reasons.push(product.isPrime ? 'Prime' : 'Free shipping');
      }

      // Price-based scoring (budget items score higher for value)
      if (product.price < 20 && product.rating && product.rating >= 4.0) {
        score += 5;
        reasons.push('Great value');
      }

      return {
        ...product,
        dealScore: Math.min(100, Math.max(0, score)),
        dealReason: reasons.length > 0 ? reasons.join(', ') : undefined
      };
    });
  }

  /**
   * Score deals using AI (more accurate but slower)
   */
  private async scoreDealsBatchWithAI(products: UnifiedProduct[]): Promise<UnifiedProduct[]> {
    if (products.length === 0) return [];

    try {
      const prompt = `Score these products as deals (0-100). Consider:
- Discount percentage (if available)
- Price vs typical market value
- Brand reputation
- Product quality indicators (ratings, reviews)
- Shipping value

Products:
${products.slice(0, 20).map((p, i) => `${i + 1}. "${p.title}" - $${p.price} ${p.originalPrice ? `(was $${p.originalPrice}, ${p.discount}% off)` : ''} | Rating: ${p.rating || 'N/A'} | Source: ${p.source}`).join('\n')}

Respond ONLY with valid JSON:
{
  "scores": [
    { "index": 0, "score": 85, "reason": "Great discount on quality item" }
  ]
}`;

      const response = await claudeService.generateText(prompt, 1500);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);

      // Apply scores to products
      for (const scoreData of analysis.scores || []) {
        if (products[scoreData.index]) {
          products[scoreData.index].dealScore = scoreData.score;
          products[scoreData.index].dealReason = scoreData.reason;
        }
      }

      return products;
    } catch (error) {
      logger.warn('AI deal scoring failed, falling back to algorithm');
      return this.scoreDealsBatchWithAlgorithm(products);
    }
  }

  /**
   * Sort products by specified criteria
   */
  private sortProducts(products: UnifiedProduct[], sortBy: string): UnifiedProduct[] {
    switch (sortBy) {
      case 'price_asc':
        return [...products].sort((a, b) => a.price - b.price);
      case 'price_desc':
        return [...products].sort((a, b) => b.price - a.price);
      case 'rating':
        return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'deals':
        return [...products].sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
      case 'relevance':
      default:
        // Mix of relevance factors
        return [...products].sort((a, b) => {
          const scoreA = (a.dealScore || 50) + (a.rating || 0) * 10;
          const scoreB = (b.dealScore || 50) + (b.rating || 0) * 10;
          return scoreB - scoreA;
        });
    }
  }

  /**
   * Deduplicate products by title similarity
   */
  private deduplicateProducts(products: UnifiedProduct[]): UnifiedProduct[] {
    const seen = new Set<string>();
    const unique: UnifiedProduct[] = [];

    for (const product of products) {
      // Normalize title for comparison
      const normalizedTitle = product.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 50);

      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        unique.push(product);
      }
    }

    return unique;
  }

  /**
   * Get best price across all sources for a product
   */
  async findBestPrice(query: string): Promise<{
    cheapest: UnifiedProduct | null;
    alternatives: UnifiedProduct[];
  }> {
    const result = await this.search({
      query,
      sources: ['ebay', 'amazon', 'aliexpress'],
      sortBy: 'price_asc',
      limit: 10
    });

    const products = result.products;
    
    return {
      cheapest: products[0] || null,
      alternatives: products.slice(1, 5)
    };
  }

  /**
   * Get service status
   */
  getStatus(): {
    sources: { name: string; available: boolean; reason?: string }[];
    totalAvailable: number;
  } {
    const sources = [
      { 
        name: 'ebay', 
        available: ebayService.isAvailable(),
        reason: !ebayService.isAvailable() ? 'RAPIDAPI_KEY or EBAY_APP_ID not configured' : undefined
      },
      { 
        name: 'amazon', 
        available: amazonService.isAvailable(),
        reason: !amazonService.isAvailable() ? 'RAPIDAPI_KEY not configured' : undefined
      },
      { 
        name: 'aliexpress', 
        available: aliexpressService.isAvailable(),
        reason: !aliexpressService.isAvailable() ? 'RAPIDAPI_KEY not configured' : undefined
      },
      { 
        name: 'israeli', 
        available: israeliShopsService.isAvailable(),
        reason: undefined
      }
    ];

    return {
      sources,
      totalAvailable: sources.filter(s => s.available).length
    };
  }
}

// Export singleton
export const productAggregatorService = new ProductAggregatorService();
export default productAggregatorService;

