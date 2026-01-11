/**
 * MeiliSearch Integration Service
 * 
 * Local full-text search engine for instant search across cached data.
 * Used by: Jobs Agent, Learning Agent, Cooking Agent
 * 
 * Setup: docker run -d --name meilisearch -p 7700:7700 getmeili/meilisearch
 */

import { MeiliSearch, Index } from 'meilisearch';
import { configService } from '../core/configService';

// Types
export interface SearchResult<T> {
  hits: T[];
  query: string;
  processingTimeMs: number;
  totalHits: number;
}

export interface MeiliStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
  version?: string;
}

// Index names
export const INDEXES = {
  JOBS: 'jobs',
  LEARNING_RESOURCES: 'learning_resources',
  RECIPES: 'recipes',
  PRODUCTS: 'products'
} as const;

class MeiliSearchService {
  private client: MeiliSearch | null = null;

  private get host(): string {
    return process.env.MEILISEARCH_HOST || 'http://localhost:7700';
  }

  private get apiKey(): string | undefined {
    return process.env.MEILISEARCH_API_KEY;
  }

  /**
   * Check if MeiliSearch is configured
   */
  isConfigured(): boolean {
    return !!this.host;
  }

  /**
   * Get MeiliSearch client (lazy initialization)
   */
  private getClient(): MeiliSearch {
    if (!this.client) {
      this.client = new MeiliSearch({
        host: this.host,
        apiKey: this.apiKey
      });
    }
    return this.client;
  }

  /**
   * Get connection status
   */
  async getStatus(): Promise<MeiliStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'MEILISEARCH_HOST not set'
      };
    }

    try {
      const client = this.getClient();
      const health = await client.health();
      const version = await client.getVersion();
      
      return {
        configured: true,
        connected: health.status === 'available',
        version: version.pkgVersion
      };
    } catch (error: any) {
      return {
        configured: true,
        connected: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Get or create an index
   */
  async getIndex<T extends Record<string, any>>(indexName: string): Promise<Index<T>> {
    const client = this.getClient();
    
    try {
      return await client.getIndex(indexName);
    } catch {
      // Create index if it doesn't exist
      await client.createIndex(indexName, { primaryKey: 'id' });
      return await client.getIndex(indexName);
    }
  }

  /**
   * Search an index
   */
  async search<T extends Record<string, any>>(
    indexName: string,
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string | string[];
      sort?: string[];
      attributesToRetrieve?: string[];
    }
  ): Promise<SearchResult<T>> {
    const index = await this.getIndex<T>(indexName);
    
    const result = await index.search(query, {
      limit: options?.limit || configService.get('meilisearch.defaultLimit', 20),
      offset: options?.offset || 0,
      filter: options?.filter,
      sort: options?.sort,
      attributesToRetrieve: options?.attributesToRetrieve
    });

    return {
      hits: result.hits as T[],
      query: result.query,
      processingTimeMs: result.processingTimeMs,
      totalHits: result.estimatedTotalHits || result.hits.length
    };
  }

  /**
   * Add or update documents in an index
   */
  async addDocuments<T extends Record<string, any>>(
    indexName: string,
    documents: T[]
  ): Promise<void> {
    if (documents.length === 0) return;
    
    const index = await this.getIndex<T>(indexName);
    await index.addDocuments(documents);
  }

  /**
   * Delete documents from an index
   */
  async deleteDocuments(indexName: string, ids: string[]): Promise<void> {
    const index = await this.getIndex(indexName);
    await index.deleteDocuments(ids);
  }

  /**
   * Clear all documents from an index
   */
  async clearIndex(indexName: string): Promise<void> {
    const index = await this.getIndex(indexName);
    await index.deleteAllDocuments();
  }

  /**
   * Configure index settings
   */
  async configureIndex(
    indexName: string,
    settings: {
      searchableAttributes?: string[];
      filterableAttributes?: string[];
      sortableAttributes?: string[];
      distinctAttribute?: string;
    }
  ): Promise<void> {
    const index = await this.getIndex(indexName);
    await index.updateSettings(settings);
  }

  // ==========================================================================
  // PRE-CONFIGURED INDEX HELPERS
  // ==========================================================================

  /**
   * Initialize jobs index with optimal settings
   */
  async initJobsIndex(): Promise<void> {
    await this.configureIndex(INDEXES.JOBS, {
      searchableAttributes: ['title', 'company', 'description', 'location', 'skills'],
      filterableAttributes: ['remoteType', 'experienceLevel', 'salary', 'source'],
      sortableAttributes: ['matchScore', 'postedDate', 'salary'],
      distinctAttribute: 'id'
    });
  }

  /**
   * Search jobs with smart defaults
   */
  async searchJobs(query: string, filters?: {
    remoteOnly?: boolean;
    minSalary?: number;
    experienceLevel?: string;
  }): Promise<SearchResult<any>> {
    const filterArray: string[] = [];
    
    if (filters?.remoteOnly) {
      filterArray.push('remoteType = "Remote"');
    }
    if (filters?.minSalary) {
      filterArray.push(`salary >= ${filters.minSalary}`);
    }
    if (filters?.experienceLevel) {
      filterArray.push(`experienceLevel = "${filters.experienceLevel}"`);
    }

    return this.search(INDEXES.JOBS, query, {
      filter: filterArray.length > 0 ? filterArray : undefined,
      sort: ['matchScore:desc']
    });
  }

  /**
   * Initialize learning resources index
   */
  async initLearningIndex(): Promise<void> {
    await this.configureIndex(INDEXES.LEARNING_RESOURCES, {
      searchableAttributes: ['title', 'description', 'tags', 'source'],
      filterableAttributes: ['category', 'source', 'difficulty'],
      sortableAttributes: ['publishedDate', 'relevanceScore']
    });
  }

  /**
   * Search learning resources
   */
  async searchLearningResources(query: string, category?: string): Promise<SearchResult<any>> {
    return this.search(INDEXES.LEARNING_RESOURCES, query, {
      filter: category ? `category = "${category}"` : undefined,
      sort: ['relevanceScore:desc']
    });
  }

  /**
   * Initialize recipes index
   */
  async initRecipesIndex(): Promise<void> {
    await this.configureIndex(INDEXES.RECIPES, {
      searchableAttributes: ['title', 'ingredients', 'cuisine', 'tags'],
      filterableAttributes: ['cuisine', 'prepTime', 'cookTime', 'difficulty'],
      sortableAttributes: ['matchScore', 'prepTime']
    });
  }

  /**
   * Search recipes by ingredients
   */
  async searchRecipesByIngredients(ingredients: string[]): Promise<SearchResult<any>> {
    const query = ingredients.join(' ');
    return this.search(INDEXES.RECIPES, query, {
      sort: ['matchScore:desc'],
      limit: 20
    });
  }
}

export const meiliSearchService = new MeiliSearchService();
export default meiliSearchService;
