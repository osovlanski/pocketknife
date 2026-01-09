/**
 * Core Services
 * 
 * Shared services used across multiple agents:
 * AI client, process control, database, cache, config, search.
 */

export { default as claudeService } from './claudeService';
export { default as processControlService } from './processControlService';
export { databaseService, prisma } from './databaseService';
export { cacheService, cacheKeys } from './cacheService';
export { configService } from './configService';
export { googleSearchService, quotaManager } from './googleSearchService';
export { externalApiService } from './externalApiService';
export type { SearchResult, ParsedSearchResult, AgentType } from './googleSearchService';
export type { ExternalApiConfig } from './externalApiService';


