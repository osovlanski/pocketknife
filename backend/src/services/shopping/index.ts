/**
 * Shopping Services
 * 
 * Services for product search and price comparison across multiple platforms.
 * 
 * Available services:
 * - productAggregatorService: Unified search across all platforms
 * - ebayService: eBay Browse API via RapidAPI
 * - amazonService: Amazon Product API via RapidAPI
 * - aliexpressService: AliExpress API via RapidAPI
 * - israeliShopsService: Israeli shops (Google CSE + Zap scraper)
 * - zapScraperService: Direct Zap.co.il scraper
 */

// Main aggregator (use this for most cases)
export { productAggregatorService, UnifiedProduct, AggregatedSearchParams, AggregatedSearchResult } from './productAggregatorService';

// Individual platform services
export { ebayService, EbayProduct, EbaySearchParams } from './ebayService';
export { amazonService, AmazonProduct, AmazonSearchParams } from './amazonService';
export { aliexpressService, AliExpressProduct, AliExpressSearchParams } from './aliexpressService';

// Israeli shops
export { israeliShopsService } from './israeliShopsService';
export { zapScraperService } from './zapScraperService';

