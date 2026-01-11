/**
 * Integration Services
 * 
 * External productivity and search integrations.
 */

// Productivity
export { notionService } from './notionService';
export type { NotionPage, NotionDatabase, NotionStatus } from './notionService';

// Social
export { facebookService } from './facebookService';
export type { FacebookStatus, FacebookUser } from './facebookService';

// Search
export { meiliSearchService, INDEXES } from './meiliSearchService';
export type { SearchResult, MeiliStatus } from './meiliSearchService';

export { serpApiService } from './serpApiService';
export type { SerpSearchResult, SerpShoppingResult, SerpApiStatus } from './serpApiService';
