/**
 * News Agent
 * 
 * AI-powered personalized news aggregation with learning algorithm.
 * Features:
 * - Multi-source news aggregation (NewsAPI, HackerNews, Reddit, GNews, MediaStack)
 * - User preference learning based on interactions
 * - Geo-location based news (local + global)
 * - Trending topics detection
 * - AI-generated summaries
 * - Integration with notification channels (Telegram, Discord, Notion)
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { newsService, NewsArticle, NewsSearchParams, NewsTrend } from '../services/news';
import { configService } from '../services/core/configService';
import { getPrisma } from '../services/core/databaseService';

// =============================================================================
// TYPES
// =============================================================================

interface NewsAgentParams extends AgentParams {
  action: 
    | 'search'
    | 'get-feed'
    | 'get-digest'
    | 'save-article'
    | 'record-interaction'
    | 'get-saved'
    | 'get-trends'
    | 'update-preferences'
    | 'get-preferences'
    | 'summarize';
  
  // Search params
  query?: string;
  topics?: string[];
  sources?: string[];
  timeRange?: 'today' | 'week' | 'month';
  countryCode?: string;
  maxResults?: number;
  
  // Article params
  article?: NewsArticle;
  articleId?: string;
  articleUrl?: string;
  articleTitle?: string;
  
  // Interaction params
  interactionType?: 'view' | 'read' | 'like' | 'save' | 'share' | 'dismiss';
  readDuration?: number;
  scrollDepth?: number;
  isPositive?: boolean;
  
  // Preference params
  preferences?: {
    topicWeights?: Record<string, number>;
    preferredSources?: string[];
    blockedSources?: string[];
    geoLocation?: string;
    countryCode?: string;
    digestFrequency?: string;
    digestTime?: string;
    notifyVia?: string[];
  };
  
  // Trend params
  geoScope?: 'global' | 'domestic' | 'local';
}

interface NewsAgentResult {
  articles?: NewsArticle[];
  article?: NewsArticle;
  savedArticles?: any[];
  trends?: NewsTrend[];
  digest?: {
    articles: NewsArticle[];
    summary: string;
  };
  preferences?: any;
  summary?: string;
  success?: boolean;
}

// =============================================================================
// NEWS AGENT
// =============================================================================

export class NewsAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'news',
    name: 'News Agent',
    description: 'Personalized news aggregation with AI-powered learning and multi-source integration',
    icon: '📰',
    color: '#EF4444' // Red
  };

  protected async run(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { action } = params;

    switch (action) {
      case 'search':
        return this.searchNews(params);
      case 'get-feed':
        return this.getPersonalizedFeed(params);
      case 'get-digest':
        return this.getDigest(params);
      case 'save-article':
        return this.saveArticle(params);
      case 'record-interaction':
        return this.recordInteraction(params);
      case 'get-saved':
        return this.getSavedArticles(params);
      case 'get-trends':
        return this.getTrends(params);
      case 'update-preferences':
        return this.updatePreferences(params);
      case 'get-preferences':
        return this.getPreferences(params);
      case 'summarize':
        return this.summarizeArticle(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Search news across multiple sources
   */
  private async searchNews(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { query, topics, sources, timeRange, countryCode, maxResults, userId } = params;

    this.emitLog(`🔍 Searching news: "${query || topics?.join(', ') || 'all topics'}"`, 'info');
    this.emitProgress(10);

    try {
      // Get user preferences for personalized ranking
      let userPreferences;
      if (userId) {
        userPreferences = await newsService.getUserPreferences(userId);
      }

      this.emitProgress(30);

      const searchParams: NewsSearchParams = {
        query,
        topics,
        sources: sources || (['hackernews', 'reddit', 'lobsters', 'devto', 'gnews', 'mediastack'] as string[]),
        timeRange,
        countryCode,
        maxResults: maxResults || configService.get('news.search.maxResults', 30)
      };

      const articles = await newsService.searchNews(searchParams, userPreferences || undefined);

      this.emitProgress(90);
      this.emitLog(`✅ Found ${articles.length} news articles`, 'success');

      // Log activity
      await this.saveUserActivity(userId, 'search', {
        query,
        topics,
        resultsCount: articles.length
      });

      return {
        success: true,
        data: { articles }
      };
    } catch (error: any) {
      this.emitLog(`❌ News search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get personalized news feed based on learned preferences
   */
  private async getPersonalizedFeed(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId, maxResults = 20 } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required for personalized feed' };
    }

    this.emitLog('📱 Generating personalized news feed...', 'info');
    this.emitProgress(10);

    try {
      // Get user preferences
      const preferences = await newsService.getUserPreferences(userId);
      
      if (!preferences) {
        this.emitLog('⚠️ No preferences found, using default topics', 'warning');
      }

      this.emitProgress(30);

      // Get topics with high weights
      const preferredTopics = Object.entries(preferences?.topicWeights || {})
        .filter(([, weight]) => weight > 0.4)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);

      if (preferredTopics.length === 0) {
        // Use configurable default topics
        const defaultTopics = configService.get('news.topics.default', ['tech', 'business', 'science']);
        preferredTopics.push(...defaultTopics);
      }

      const articles = await newsService.searchNews({
        topics: preferredTopics,
        sources: preferences?.preferredSources,
        countryCode: preferences?.countryCode,
        includeGlobal: true,
        maxResults
      }, preferences || undefined);

      this.emitProgress(100);
      this.emitLog(`✅ Feed generated with ${articles.length} articles`, 'success');

      return {
        success: true,
        data: { articles }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to generate feed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get news digest (daily/weekly summary)
   */
  private async getDigest(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required for digest' };
    }

    this.emitLog('📊 Generating news digest...', 'info');
    this.emitProgress(20);

    try {
      const digest = await newsService.generateDigest(userId);
      
      this.emitProgress(100);
      this.emitLog('✅ Digest generated', 'success');

      return {
        success: true,
        data: { digest }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to generate digest: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Save an article to user's collection
   */
  private async saveArticle(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId, article } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    if (!article) {
      return { success: false, error: 'Article data is required' };
    }

    this.emitLog(`💾 Saving article: ${article.title}`, 'info');

    try {
      await newsService.saveArticle(userId, article);
      
      // Record the save interaction for learning
      await newsService.recordInteraction(
        userId,
        article.id,
        article.url,
        article.title,
        article.source,
        'save',
        { topics: article.topics, isPositive: true }
      );

      this.emitLog('✅ Article saved', 'success');

      return {
        success: true,
        data: { article, success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record user interaction with an article (for learning)
   */
  private async recordInteraction(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { 
      userId, 
      articleId, 
      articleUrl, 
      articleTitle,
      interactionType,
      readDuration,
      scrollDepth,
      isPositive,
      article
    } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    if (!interactionType) {
      return { success: false, error: 'Interaction type is required' };
    }

    const id = articleId || article?.id || '';
    const url = articleUrl || article?.url || '';
    const title = articleTitle || article?.title || '';
    const source = article?.source || 'unknown';
    const topics = article?.topics || [];

    try {
      await newsService.recordInteraction(
        userId,
        id,
        url,
        title,
        source,
        interactionType,
        { readDuration, scrollDepth, topics, isPositive }
      );

      // Log interaction for analytics
      this.emitLog(`📝 Recorded ${interactionType} interaction`, 'info');

      return {
        success: true,
        data: { success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's saved articles
   */
  private async getSavedArticles(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId, maxResults = 50 } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const savedArticles = await newsService.getSavedArticles(userId, { limit: maxResults });

      return {
        success: true,
        data: { savedArticles }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trending topics
   */
  private async getTrends(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { geoScope = 'global', countryCode } = params;

    this.emitLog(`📈 Fetching ${geoScope} trending topics...`, 'info');

    try {
      const trends = await newsService.getTrendingTopics(geoScope, countryCode);

      this.emitLog(`✅ Found ${trends.length} trending topics`, 'success');

      return {
        success: true,
        data: { trends }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user preferences
   */
  private async updatePreferences(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId, preferences } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    if (!preferences) {
      return { success: false, error: 'Preferences data is required' };
    }

    try {
      await newsService.updateUserPreferences(userId, preferences);

      this.emitLog('✅ Preferences updated', 'success');

      return {
        success: true,
        data: { preferences, success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user preferences
   */
  private async getPreferences(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { userId } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const prisma = getPrisma();
      if (!prisma) {
        return { success: false, error: 'Database not available' };
      }

      const preferences = await prisma.newsPreference.findUnique({
        where: { userId }
      });

      return {
        success: true,
        data: { preferences }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AI summary for an article
   */
  private async summarizeArticle(params: NewsAgentParams): Promise<AgentResult<NewsAgentResult>> {
    const { articleUrl, article } = params;

    const url = articleUrl || article?.url;
    if (!url) {
      return { success: false, error: 'Article URL is required' };
    }

    this.emitLog('🤖 Generating AI summary...', 'info');
    this.emitProgress(30);

    try {
      const summary = await newsService.generateSummary(url, article?.content);

      this.emitProgress(100);
      this.emitLog('✅ Summary generated', 'success');

      return {
        success: true,
        data: { summary }
      };
    } catch (error: any) {
      this.emitLog(`❌ Summary generation failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const newsAgent = new NewsAgent();
export default newsAgent;



