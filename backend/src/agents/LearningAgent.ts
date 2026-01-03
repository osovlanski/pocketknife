/**
 * Learning Agent
 * 
 * Searches technical content across multiple sources, generates AI summaries,
 * and persists user's learning history to the database.
 * 
 * Sources: Dev.to, Hacker News, Reddit, Tech Newsletters
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import learningService from '../services/learning/learningService';
import { getPrisma } from '../services/core/databaseService';

interface LearningParams extends AgentParams {
  action: 'search' | 'summarize' | 'topic-summary' | 'save-article' | 'get-history';
  query?: string;
  sources?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'all';
  articleUrl?: string;
  articleTitle?: string;
  articleData?: {
    id: string;
    title: string;
    url: string;
    source: string;
    description?: string;
    summary?: string;
    tags?: string[];
  };
}

interface LearningResult {
  resources?: any[];
  summary?: string;
  savedArticle?: any;
  history?: any[];
}

export class LearningAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'learning',
    name: 'Learning Agent',
    description: 'Search and summarize technical content from Dev.to, Hacker News, Reddit, and newsletters',
    icon: '📚',
    color: '#10B981' // Emerald
  };

  protected async run(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { action, userId } = params;

    switch (action) {
      case 'search':
        return this.searchResources(params);
      case 'summarize':
        return this.summarizeArticle(params);
      case 'topic-summary':
        return this.generateTopicSummary(params);
      case 'save-article':
        return this.saveArticle(params);
      case 'get-history':
        return this.getHistory(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Search for learning resources across multiple sources
   */
  private async searchResources(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { query, sources = ['devto', 'hackernews', 'reddit', 'newsletters'], timeRange = 'week' } = params;

    if (!query) {
      return { success: false, error: 'Search query is required' };
    }

    this.emitLog(`🔍 Searching for "${query}" across ${sources.length} sources...`, 'info');
    this.emitProgress(10);

    const searchSources = sources.length > 0 ? sources : ['devto', 'hackernews', 'reddit', 'newsletters'];
    let completedSources = 0;
    const totalSources = searchSources.length;

    // Create a wrapper IO object that emits to our agent's log
    const ioWrapper = {
      emit: (event: string, data: any) => {
        if (event === 'learning-log') {
          this.emitLog(data.message, data.type);
        }
      }
    };

    const resources = await learningService.searchAllSources(
      { query, sources: searchSources, timeRange },
      ioWrapper
    );

    // Check for stop request
    if (this.shouldStop()) {
      return { success: true, data: { resources: [] }, stopped: true };
    }

    this.emitProgress(90);
    this.emitLog(`✅ Found ${resources.length} learning resources`, 'success');

    // Log search activity
    if (params.userId) {
      await this.saveUserActivity(params.userId, 'search', {
        query,
        sources: searchSources,
        resultsCount: resources.length
      });
    }

    return {
      success: true,
      data: { resources }
    };
  }

  /**
   * Summarize a specific article
   */
  private async summarizeArticle(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { articleUrl, articleTitle } = params;

    if (!articleUrl || !articleTitle) {
      return { success: false, error: 'Article URL and title are required' };
    }

    this.emitLog(`📝 Generating summary for: ${articleTitle}`, 'info');
    this.emitProgress(20);

    try {
      const summary = await learningService.summarizeArticle(articleUrl, articleTitle);
      
      this.emitProgress(100);
      this.emitLog(`✅ Summary generated successfully`, 'success');

      // Log activity
      if (params.userId) {
        await this.saveUserActivity(params.userId, 'summarize', {
          articleUrl,
          articleTitle,
          summaryLength: summary.length
        });
      }

      return {
        success: true,
        data: { summary }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a topic summary for learning
   */
  private async generateTopicSummary(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { query } = params;

    if (!query) {
      return { success: false, error: 'Topic is required' };
    }

    this.emitLog(`📚 Generating topic summary for: ${query}`, 'info');
    this.emitProgress(20);

    try {
      const summary = await learningService.generateTopicSummary(query);
      
      this.emitProgress(100);
      this.emitLog(`✅ Topic summary generated`, 'success');

      // Log activity
      if (params.userId) {
        await this.saveUserActivity(params.userId, 'topic-summary', {
          topic: query
        });
      }

      return {
        success: true,
        data: { summary }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save an article to user's learning history
   */
  private async saveArticle(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { userId, articleData } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required to save articles' };
    }

    if (!articleData) {
      return { success: false, error: 'Article data is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog(`💾 Saving article: ${articleData.title}`, 'info');

    try {
      // Store in activity log with metadata
      await prisma.activityLog.create({
        data: {
          userId,
          agent: 'learning',
          action: 'save_article',
          details: articleData.title,
          metadata: {
            articleId: articleData.id,
            title: articleData.title,
            url: articleData.url,
            source: articleData.source,
            description: articleData.description,
            summary: articleData.summary,
            tags: articleData.tags
          },
          status: 'success'
        }
      });

      this.emitLog(`✅ Article saved to learning history`, 'success');

      return {
        success: true,
        data: { savedArticle: articleData }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's saved articles history
   */
  private async getHistory(params: LearningParams): Promise<AgentResult<LearningResult>> {
    const { userId } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const savedArticles = await prisma.activityLog.findMany({
        where: {
          userId,
          agent: 'learning',
          action: 'save_article'
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Extract article data from metadata
      const history = savedArticles.map(log => ({
        id: log.id,
        savedAt: log.createdAt,
        ...(log.metadata as any)
      }));

      return {
        success: true,
        data: { history }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const learningAgent = new LearningAgent();
export default learningAgent;

