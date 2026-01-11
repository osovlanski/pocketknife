/**
 * Notion Integration Service
 * 
 * Integrates with Notion API for universal knowledge management.
 * Used by: ToDo Agent, Learning Agent, Jobs Agent, Cooking Agent
 */

import { Client } from '@notionhq/client';
import { configService } from '../core/configService';

// Types
export interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  properties: Record<string, any>;
}

export interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, any>;
}

export interface NotionStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
  workspaceName?: string;
}

class NotionService {
  private client: Client | null = null;

  private get token(): string {
    return process.env.NOTION_TOKEN || '';
  }

  /**
   * Check if Notion is configured
   */
  isConfigured(): boolean {
    return !!this.token;
  }

  /**
   * Get Notion client (lazy initialization)
   */
  private getClient(): Client {
    if (!this.client && this.token) {
      this.client = new Client({ auth: this.token });
    }
    if (!this.client) {
      throw new Error('Notion not configured. Set NOTION_TOKEN in .env');
    }
    return this.client;
  }

  /**
   * Get connection status
   */
  async getStatus(): Promise<NotionStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'NOTION_TOKEN not set in .env'
      };
    }

    try {
      const client = this.getClient();
      // Test connection by searching for nothing (quick test)
      const response = await client.search({ query: '', page_size: 1 });
      
      return {
        configured: true,
        connected: true,
        workspaceName: 'Connected'
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
   * Search pages and databases
   */
  async search(query: string, filter?: 'page' | 'database'): Promise<NotionPage[]> {
    const client = this.getClient();
    
    const searchParams: any = {
      query,
      page_size: configService.get('notion.search.maxResults', 20)
    };

    if (filter) {
      searchParams.filter = { property: 'object', value: filter };
    }

    const response = await client.search(searchParams);

    return response.results.map((result: any) => ({
      id: result.id,
      title: this.extractTitle(result),
      url: result.url,
      createdTime: result.created_time,
      lastEditedTime: result.last_edited_time,
      properties: result.properties || {}
    }));
  }

  /**
   * Get a database by ID
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const client = this.getClient();
    const response = await client.databases.retrieve({ database_id: databaseId }) as any;

    return {
      id: response.id,
      title: this.extractDatabaseTitle(response),
      properties: response.properties
    };
  }

  /**
   * Query a database
   */
  async queryDatabase(databaseId: string, filter?: any, sorts?: any[]): Promise<NotionPage[]> {
    const client = this.getClient() as any;
    
    const queryParams: any = {
      database_id: databaseId,
      page_size: configService.get('notion.query.maxResults', 100)
    };

    if (filter) queryParams.filter = filter;
    if (sorts) queryParams.sorts = sorts;

    const response = await client.databases.query(queryParams);

    return response.results.map((page: any) => ({
      id: page.id,
      title: this.extractTitle(page),
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      properties: page.properties
    }));
  }

  /**
   * Create a page in a database
   */
  async createDatabaseEntry(databaseId: string, properties: Record<string, any>): Promise<NotionPage> {
    const client = this.getClient();

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties
    }) as any;

    return {
      id: response.id,
      title: this.extractTitle(response),
      url: response.url,
      createdTime: response.created_time,
      lastEditedTime: response.last_edited_time,
      properties: response.properties
    };
  }

  /**
   * Update a page's properties
   */
  async updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    const client = this.getClient();

    const response = await client.pages.update({
      page_id: pageId,
      properties
    }) as any;

    return {
      id: response.id,
      title: this.extractTitle(response),
      url: response.url,
      createdTime: response.created_time,
      lastEditedTime: response.last_edited_time,
      properties: response.properties
    };
  }

  /**
   * Archive (soft delete) a page
   */
  async archivePage(pageId: string): Promise<void> {
    const client = this.getClient();
    await client.pages.update({
      page_id: pageId,
      archived: true
    });
  }

  // ==========================================================================
  // HELPER METHODS FOR COMMON USE CASES
  // ==========================================================================

  /**
   * Save a learning resource to Notion
   */
  async saveLearningResource(databaseId: string, resource: {
    title: string;
    url: string;
    category: string;
    tags: string[];
    notes?: string;
  }): Promise<NotionPage> {
    return this.createDatabaseEntry(databaseId, {
      Name: { title: [{ text: { content: resource.title } }] },
      URL: { url: resource.url },
      Category: { select: { name: resource.category } },
      Tags: { multi_select: resource.tags.map(tag => ({ name: tag })) },
      Notes: resource.notes ? { rich_text: [{ text: { content: resource.notes } }] } : undefined,
      'Date Added': { date: { start: new Date().toISOString() } }
    });
  }

  /**
   * Save a job application to Notion
   */
  async saveJobApplication(databaseId: string, job: {
    company: string;
    position: string;
    url: string;
    status: string;
    salary?: string;
    notes?: string;
  }): Promise<NotionPage> {
    return this.createDatabaseEntry(databaseId, {
      Company: { title: [{ text: { content: job.company } }] },
      Position: { rich_text: [{ text: { content: job.position } }] },
      URL: { url: job.url },
      Status: { select: { name: job.status } },
      Salary: job.salary ? { rich_text: [{ text: { content: job.salary } }] } : undefined,
      Notes: job.notes ? { rich_text: [{ text: { content: job.notes } }] } : undefined,
      'Applied Date': { date: { start: new Date().toISOString() } }
    });
  }

  /**
   * Save a recipe to Notion
   */
  async saveRecipe(databaseId: string, recipe: {
    title: string;
    url?: string;
    ingredients: string[];
    instructions?: string;
    prepTime?: number;
    cookTime?: number;
  }): Promise<NotionPage> {
    return this.createDatabaseEntry(databaseId, {
      Name: { title: [{ text: { content: recipe.title } }] },
      URL: recipe.url ? { url: recipe.url } : undefined,
      Ingredients: { multi_select: recipe.ingredients.slice(0, 100).map(ing => ({ name: ing.substring(0, 100) })) },
      Instructions: recipe.instructions ? { rich_text: [{ text: { content: recipe.instructions.substring(0, 2000) } }] } : undefined,
      'Prep Time': recipe.prepTime ? { number: recipe.prepTime } : undefined,
      'Cook Time': recipe.cookTime ? { number: recipe.cookTime } : undefined,
      'Date Added': { date: { start: new Date().toISOString() } }
    });
  }

  /**
   * Create a task in Notion
   */
  async createTask(databaseId: string, task: {
    title: string;
    dueDate?: string;
    priority?: 'Low' | 'Medium' | 'High';
    status?: string;
    notes?: string;
  }): Promise<NotionPage> {
    return this.createDatabaseEntry(databaseId, {
      Name: { title: [{ text: { content: task.title } }] },
      'Due Date': task.dueDate ? { date: { start: task.dueDate } } : undefined,
      Priority: task.priority ? { select: { name: task.priority } } : undefined,
      Status: { select: { name: task.status || 'Not Started' } },
      Notes: task.notes ? { rich_text: [{ text: { content: task.notes } }] } : undefined
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private extractTitle(page: any): string {
    if (page.properties?.Name?.title?.[0]?.text?.content) {
      return page.properties.Name.title[0].text.content;
    }
    if (page.properties?.title?.title?.[0]?.text?.content) {
      return page.properties.title.title[0].text.content;
    }
    // Try to find any title property
    for (const key of Object.keys(page.properties || {})) {
      const prop = page.properties[key];
      if (prop?.title?.[0]?.text?.content) {
        return prop.title[0].text.content;
      }
    }
    return 'Untitled';
  }

  private extractDatabaseTitle(database: any): string {
    if (database.title?.[0]?.text?.content) {
      return database.title[0].text.content;
    }
    return 'Untitled Database';
  }
}

export const notionService = new NotionService();
export default notionService;
