/**
 * Shopping Agent
 * 
 * Finds deals, tracks prices, and suggests products based on user interests.
 * 
 * Features:
 * - Search products from multiple sources (eBay, AliExpress, Amazon, Telegram)
 * - AI-powered deal scoring
 * - Hobby-based product suggestions
 * - Price tracking and alerts
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getPrisma } from '../services/core/databaseService';
import claudeService from '../services/core/claudeService';
import { 
  productAggregatorService, 
  ebayService, 
  amazonService, 
  aliexpressService,
  israeliShopsService,
  UnifiedProduct
} from '../services/shopping';

interface ShoppingParams extends AgentParams {
  action: 
    | 'search-products'
    | 'search-by-hobby'
    | 'get-deals'
    | 'save-product'
    | 'unsave-product'
    | 'get-saved-products'
    | 'set-price-alert'
    | 'get-price-alerts'
    | 'update-interests'
    | 'get-suggestions';
  query?: string;
  hobbies?: string[];
  productId?: string;
  targetPrice?: number;
  interests?: UserInterest[];
  sources?: string[];
  filters?: ProductFilters;
}

interface UserInterest {
  type: 'hobby' | 'category' | 'brand' | 'keyword';
  value: string;
  weight?: number;
}

interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  source?: string;
  minDiscount?: number;
  minDealScore?: number;
}

interface ShoppingResult {
  products?: Product[];
  savedProducts?: Product[];
  deals?: Product[];
  suggestions?: ProductSuggestion[];
  priceAlerts?: any[];
  search?: any;
}

interface Product {
  id?: string;
  title: string;
  description?: string | null;
  price: number;
  originalPrice?: number | null;
  currency: string;
  discount?: number | null;
  source: string;
  sourceUrl: string;
  sourceId?: string | null;
  imageUrl?: string | null;
  dealScore?: number | null;
  dealReason?: string | null;
  category?: string | null;
  tags?: string[];
  isSaved?: boolean;
}

interface ProductSuggestion {
  product: Product;
  reason: string;
  matchScore: number;
}

export class ShoppingAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'shopping',
    name: 'Shopping Agent',
    description: 'Find deals, track prices, and get product suggestions',
    icon: '🛒',
    color: '#F59E0B' // Amber
  };

  protected async run(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { action } = params;

    switch (action) {
      case 'search-products':
        return this.searchProducts(params);
      case 'search-by-hobby':
        return this.searchByHobby(params);
      case 'get-deals':
        return this.getDeals(params);
      case 'save-product':
        return this.saveProduct(params);
      case 'unsave-product':
        return this.unsaveProduct(params);
      case 'get-saved-products':
        return this.getSavedProducts(params);
      case 'set-price-alert':
        return this.setPriceAlert(params);
      case 'get-price-alerts':
        return this.getPriceAlerts(params);
      case 'update-interests':
        return this.updateInterests(params);
      case 'get-suggestions':
        return this.getSuggestions(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Search products across multiple sources
   */
  private async searchProducts(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, query, sources, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!query) return { success: false, error: 'Search query is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog(`🔍 Searching for: ${query}`, 'info');
    this.emitProgress(10);

    try {
      // Create search record
      const search = await prisma.productSearch.create({
        data: {
          userId,
          query,
          queryType: 'explicit'
        }
      });

      // Search multiple sources
      const sourcesToSearch = sources || ['ebay', 'aliexpress', 'amazon'];
      const allProducts: Product[] = [];

      for (let i = 0; i < sourcesToSearch.length; i++) {
        const source = sourcesToSearch[i];
        this.emitLog(`🔍 Searching ${source}...`, 'info');
        this.emitProgress(20 + (i * 20));

        if (this.shouldStop()) {
          this.emitLog('⏹️ Search stopped by user', 'warning');
          break;
        }

        // Handle Israeli shops source separately
        if (source === 'israeli') {
          const israeliProducts = await this.searchIsraeliShops(query, filters);
          allProducts.push(...israeliProducts);
        } else {
          const products = await this.searchSource(source, query, filters);
          allProducts.push(...products);
        }
      }

      this.emitProgress(70);
      this.emitLog(`📦 Found ${allProducts.length} products, analyzing deals...`, 'info');

      // Score deals using AI
      const scoredProducts = await this.scoreDealsBatch(allProducts);

      this.emitProgress(90);

      // Save products to database
      for (const product of scoredProducts) {
        await prisma.product.create({
          data: {
            searchId: search.id,
            userId,
            title: product.title,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            currency: product.currency,
            discount: product.discount,
            source: product.source,
            sourceUrl: product.sourceUrl,
            sourceId: product.sourceId,
            imageUrl: product.imageUrl,
            dealScore: product.dealScore,
            dealReason: product.dealReason,
            category: product.category,
            tags: product.tags || []
          }
        });
      }

      // Update search results count
      await prisma.productSearch.update({
        where: { id: search.id },
        data: { resultsCount: scoredProducts.length }
      });

      this.emitProgress(100);
      this.emitLog(`✅ Found ${scoredProducts.length} products!`, 'success');

      return {
        success: true,
        data: {
          products: scoredProducts,
          search
        }
      };
    } catch (error: any) {
      this.emitLog(`❌ Search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Search products based on user hobbies/interests
   */
  private async searchByHobby(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, hobbies, query } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!hobbies?.length && !query) return { success: false, error: 'Hobbies or prompt is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog('🧠 Analyzing your interests...', 'info');

    try {
      // Use AI to generate product suggestions based on hobbies
      const prompt = `Based on these hobbies/interests: ${hobbies?.join(', ') || query}

Suggest 10 specific products that someone with these interests would love to have.
Consider different price ranges (budget, mid-range, premium).

For each product, provide:
1. A specific product name (not generic categories)
2. Why it's relevant to the hobby
3. Estimated price range
4. A good search query to find deals

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "productName": "specific product name",
      "reason": "why this is great for this hobby",
      "priceRange": { "min": 10, "max": 50 },
      "searchQuery": "search query to find this product",
      "category": "category",
      "priority": 1-10
    }
  ]
}`;

      const response = await claudeService.generateText(prompt, 2000);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);

      // Create search record
      const search = await prisma.productSearch.create({
        data: {
          userId,
          query: hobbies?.join(', ') || query || 'hobby search',
          queryType: 'hobby_based',
          originalPrompt: query
        }
      });

      // Search for each suggested product
      const allProducts: Product[] = [];
      const suggestions = analysis.suggestions || [];

      this.emitLog(`🎯 Found ${suggestions.length} product ideas, searching deals...`, 'info');

      for (let i = 0; i < Math.min(suggestions.length, 5); i++) {
        const suggestion = suggestions[i];
        this.emitProgress(20 + (i * 15));

        if (this.shouldStop()) break;

        this.emitLog(`🔍 Searching: ${suggestion.productName}`, 'info');
        
        const products = await this.searchSource('ebay', suggestion.searchQuery, {
          minPrice: suggestion.priceRange?.min,
          maxPrice: suggestion.priceRange?.max
        });

        // Add suggestion context to products
        for (const product of products.slice(0, 3)) {
          allProducts.push({
            ...product,
            category: suggestion.category,
            tags: [suggestion.category, ...(product.tags || [])]
          });
        }
      }

      // Score deals
      const scoredProducts = await this.scoreDealsBatch(allProducts);

      // Save products
      for (const product of scoredProducts) {
        await prisma.product.create({
          data: {
            searchId: search.id,
            userId,
            title: product.title,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            currency: product.currency,
            discount: product.discount,
            source: product.source,
            sourceUrl: product.sourceUrl,
            sourceId: product.sourceId,
            imageUrl: product.imageUrl,
            dealScore: product.dealScore,
            dealReason: product.dealReason,
            category: product.category,
            tags: product.tags || []
          }
        });
      }

      // Save user interests
      if (hobbies) {
        for (const hobby of hobbies) {
          await prisma.userInterest.upsert({
            where: {
              userId_interestType_value: {
                userId,
                interestType: 'hobby',
                value: hobby.toLowerCase()
              }
            },
            update: {
              searchCount: { increment: 1 },
              lastUsedAt: new Date()
            },
            create: {
              userId,
              interestType: 'hobby',
              value: hobby.toLowerCase()
            }
          });
        }
      }

      this.emitLog(`✅ Found ${scoredProducts.length} products for your hobbies!`, 'success');

      return {
        success: true,
        data: {
          products: scoredProducts,
          search
        }
      };
    } catch (error: any) {
      this.emitLog(`❌ Hobby search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top deals across all sources
   */
  private async getDeals(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, filters } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const where: any = {
        userId,
        dealScore: { gte: filters?.minDealScore || 70 }
      };

      if (filters?.source) where.source = filters.source;
      if (filters?.category) where.category = filters.category;
      if (filters?.minPrice) where.price = { gte: filters.minPrice };
      if (filters?.maxPrice) where.price = { ...where.price, lte: filters.maxPrice };

      const deals = await prisma.product.findMany({
        where,
        orderBy: { dealScore: 'desc' },
        take: 20
      });

      return { success: true, data: { deals } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a product to favorites
   */
  private async saveProduct(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, productId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productId) return { success: false, error: 'Product ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      await prisma.product.update({
        where: { id: productId },
        data: { isSaved: true }
      });

      this.emitLog('💾 Product saved!', 'success');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsave a product
   */
  private async unsaveProduct(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, productId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productId) return { success: false, error: 'Product ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      await prisma.product.update({
        where: { id: productId },
        data: { isSaved: false }
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get saved products
   */
  private async getSavedProducts(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const savedProducts = await prisma.product.findMany({
        where: { userId, isSaved: true },
        orderBy: { updatedAt: 'desc' }
      });

      return { success: true, data: { savedProducts } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set a price alert for a product
   */
  private async setPriceAlert(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, productId, targetPrice } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!productId) return { success: false, error: 'Product ID is required' };
    if (!targetPrice) return { success: false, error: 'Target price is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return { success: false, error: 'Product not found' };

      await prisma.priceAlert.create({
        data: {
          userId,
          productId,
          targetPrice,
          currentPrice: product.price
        }
      });

      // Enable notification on the product
      await prisma.product.update({
        where: { id: productId },
        data: { notifyOnDrop: true, targetPrice }
      });

      this.emitLog(`🔔 Price alert set for $${targetPrice}`, 'success');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active price alerts
   */
  private async getPriceAlerts(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      const priceAlerts = await prisma.priceAlert.findMany({
        where: { userId, isTriggered: false },
        orderBy: { createdAt: 'desc' }
      });

      return { success: true, data: { priceAlerts } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user interests
   */
  private async updateInterests(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId, interests } = params;

    if (!userId) return { success: false, error: 'User ID is required' };
    if (!interests?.length) return { success: false, error: 'Interests are required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    try {
      for (const interest of interests) {
        await prisma.userInterest.upsert({
          where: {
            userId_interestType_value: {
              userId,
              interestType: interest.type,
              value: interest.value.toLowerCase()
            }
          },
          update: {
            weight: interest.weight || 1.0,
            lastUsedAt: new Date()
          },
          create: {
            userId,
            interestType: interest.type,
            value: interest.value.toLowerCase(),
            weight: interest.weight || 1.0
          }
        });
      }

      this.emitLog('✅ Interests updated!', 'success');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI-powered product suggestions based on user history
   */
  private async getSuggestions(params: ShoppingParams): Promise<AgentResult<ShoppingResult>> {
    const { userId } = params;

    if (!userId) return { success: false, error: 'User ID is required' };

    const prisma = getPrisma();
    if (!prisma) return { success: false, error: 'Database not available' };

    this.emitLog('🎯 Generating personalized suggestions...', 'info');

    try {
      // Get user interests
      const interests = await prisma.userInterest.findMany({
        where: { userId },
        orderBy: [{ weight: 'desc' }, { searchCount: 'desc' }],
        take: 10
      });

      // Get recent saved products
      const savedProducts = await prisma.product.findMany({
        where: { userId, isSaved: true },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });

      // Get recent searches
      const recentSearches = await prisma.productSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (interests.length === 0 && savedProducts.length === 0) {
        return {
          success: true,
          data: {
            suggestions: []
          }
        };
      }

      // Use AI to generate suggestions
      const prompt = `Based on this user profile, suggest 5 products they might like:

User Interests: ${interests.map((i: { interestType: string; value: string }) => `${i.interestType}: ${i.value}`).join(', ')}

Recently Saved Products: ${savedProducts.map((p: { title: string }) => p.title).join(', ')}

Recent Searches: ${recentSearches.map((s: { query: string }) => s.query).join(', ')}

Suggest products that:
1. Match their interests
2. Complement their saved products
3. Are related to their searches

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "productName": "specific product",
      "reason": "why this matches their interests",
      "searchQuery": "query to find deals",
      "matchScore": 0.0 to 1.0,
      "category": "category"
    }
  ]
}`;

      const response = await claudeService.generateText(prompt, 1500);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);

      // Search for suggested products
      const suggestions: ProductSuggestion[] = [];
      
      for (const suggestion of (analysis.suggestions || []).slice(0, 3)) {
        const products = await this.searchSource('ebay', suggestion.searchQuery, { maxPrice: 500 });
        
        if (products.length > 0) {
          suggestions.push({
            product: products[0],
            reason: suggestion.reason,
            matchScore: suggestion.matchScore
          });
        }
      }

      this.emitLog(`🎯 Found ${suggestions.length} personalized suggestions!`, 'success');

      return { success: true, data: { suggestions } };
    } catch (error: any) {
      this.emitLog(`❌ Suggestions failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Search a specific source for products using real APIs
   */
  private async searchSource(source: string, query: string, filters?: ProductFilters): Promise<Product[]> {
    try {
      let products: UnifiedProduct[] = [];

      switch (source) {
        case 'ebay':
          if (ebayService.isAvailable()) {
            const ebayProducts = await ebayService.search({
              query,
              minPrice: filters?.minPrice,
              maxPrice: filters?.maxPrice,
              limit: 15
            });
            products = ebayProducts.map(p => this.mapToProduct(p, 'ebay'));
          }
          break;

        case 'amazon':
          if (amazonService.isAvailable()) {
            const amazonProducts = await amazonService.search({
              query,
              minPrice: filters?.minPrice,
              maxPrice: filters?.maxPrice,
              limit: 15
            });
            products = amazonProducts.map(p => this.mapToProduct(p, 'amazon'));
          }
          break;

        case 'aliexpress':
          if (aliexpressService.isAvailable()) {
            const aliProducts = await aliexpressService.search({
              query,
              minPrice: filters?.minPrice,
              maxPrice: filters?.maxPrice,
              limit: 15
            });
            products = aliProducts.map(p => this.mapToProduct(p, 'aliexpress'));
          }
          break;

        default:
          this.emitLog(`⚠️ Unknown source: ${source}`, 'warning');
          return [];
      }

      // Apply category filter if specified
      if (filters?.category) {
        products = products.filter(p => 
          p.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      return products;
    } catch (error: any) {
      this.emitLog(`⚠️ Error searching ${source}: ${error.message}`, 'warning');
      return [];
    }
  }

  /**
   * Map unified product to internal Product type
   */
  private mapToProduct(p: any, source: string): Product {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency || 'USD',
      discount: p.discount,
      source: source,
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId || p.id,
      imageUrl: p.imageUrl,
      dealScore: p.dealScore,
      dealReason: p.dealReason,
      category: p.category,
      tags: p.tags || [source]
    };
  }

  /**
   * Get service status for available shopping sources
   */
  getServiceStatus(): { source: string; available: boolean }[] {
    return [
      { source: 'ebay', available: ebayService.isAvailable() },
      { source: 'amazon', available: amazonService.isAvailable() },
      { source: 'aliexpress', available: aliexpressService.isAvailable() },
      { source: 'israeli', available: israeliShopsService.isAvailable() }
    ];
  }

  /**
   * Score a batch of products for deal quality using AI
   */
  private async scoreDealsBatch(products: Product[]): Promise<Product[]> {
    if (products.length === 0) return [];

    try {
      const prompt = `Score these products as deals (0-100). Consider:
- Discount percentage (if available)
- Price vs typical market value
- Brand reputation
- Product quality indicators

Products:
${products.slice(0, 20).map((p, i) => `${i + 1}. "${p.title}" - $${p.price} ${p.originalPrice ? `(was $${p.originalPrice}, ${p.discount}% off)` : ''}`).join('\n')}

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

      // Sort by deal score
      return products.sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
    } catch (error) {
      console.error('Failed to score deals:', error);
      // Return products without scores
      return products;
    }
  }

  /**
   * Search Israeli shops using the Israeli Shops Service
   */
  private async searchIsraeliShops(query: string, filters?: ProductFilters): Promise<Product[]> {
    try {
      this.emitLog('🇮🇱 Searching Israeli shops...', 'info');
      
      const result = await israeliShopsService.search(query, 10);
      
      if (result.source === 'google_cse') {
        this.emitLog(`📊 Used Google CSE (${result.quotaStatus.remaining} queries remaining today)`, 'info');
      } else if (result.source === 'zap_scraper') {
        this.emitLog('📊 Used Zap.co.il scraper (Google CSE quota exhausted)', 'info');
      }

      // Convert products to match our interface and apply filters
      const products: Product[] = result.products.map((p, index) => ({
        title: p.title,
        description: p.description,
        price: p.currency === 'ILS' ? israeliShopsService.convertIlsToUsd(p.price) : p.price,
        originalPrice: p.originalPrice && p.currency === 'ILS' 
          ? israeliShopsService.convertIlsToUsd(p.originalPrice) 
          : p.originalPrice,
        currency: 'USD', // Convert all to USD for consistency
        discount: p.discount,
        source: `israeli-${p.source.toLowerCase().replace(/\s+/g, '-')}`,
        sourceUrl: p.sourceUrl,
        sourceId: p.sourceId || `israeli-${Date.now()}-${index}`,
        imageUrl: p.imageUrl,
        category: p.category || this.inferCategory(query),
        tags: [...(p.tags || []), 'israeli']
      }));

      // Apply filters
      return products.filter(product => {
        if (filters?.minPrice && product.price < filters.minPrice) return false;
        if (filters?.maxPrice && product.price > filters.maxPrice) return false;
        if (filters?.category && product.category?.toLowerCase() !== filters.category.toLowerCase()) return false;
        return true;
      });
    } catch (error: any) {
      this.emitLog(`❌ Israeli shops search failed: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Infer product category from search query
   */
  private inferCategory(query: string): string {
    const categories: Record<string, string[]> = {
      'Electronics': ['laptop', 'phone', 'tablet', 'headphones', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse'],
      'Gaming': ['game', 'gaming', 'console', 'controller', 'playstation', 'xbox', 'nintendo'],
      'Fashion': ['shirt', 'dress', 'shoes', 'jacket', 'pants', 'watch', 'bag', 'clothing'],
      'Home': ['furniture', 'lamp', 'decor', 'kitchen', 'bed', 'sofa', 'chair', 'table'],
      'Sports': ['fitness', 'gym', 'bike', 'running', 'yoga', 'sports', 'outdoor'],
      'Books': ['book', 'novel', 'reading', 'literature'],
      'Toys': ['toy', 'lego', 'doll', 'puzzle', 'game']
    };

    const lowerQuery = query.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return category;
      }
    }

    return 'Other';
  }
}

// Export singleton instance
export const shoppingAgent = new ShoppingAgent();
export default shoppingAgent;

