/**
 * News Service
 * 
 * Aggregates news from multiple sources, applies learning algorithm based on
 * user interactions, and provides personalized news feeds.
 * 
 * Sources: NewsAPI, HackerNews, Reddit, RSS feeds, GNews
 */

import axios from 'axios';
import { getPrisma } from '../core/databaseService';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import claudeService from '../core/claudeService';
import { telegramNotificationService } from '../notifications';
import { discordNotificationService } from '../notifications';

// =============================================================================
// TYPES
// =============================================================================

export interface NewsArticle {
  id: string;
  url: string;
  title: string;
  description: string;
  content?: string;
  author?: string;
  source: string;
  sourceName: string;
  imageUrl?: string;
  publishedAt: Date;
  topics: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  readingTime?: number;
  relevanceScore?: number;
}

export interface NewsSearchParams {
  query?: string;
  topics?: string[];
  sources?: string[];
  timeRange?: 'today' | 'week' | 'month';
  geoLocation?: string;
  countryCode?: string;
  includeGlobal?: boolean;
  maxResults?: number;
}

export interface UserNewsPreferences {
  topicWeights: Record<string, number>;
  preferredSources: string[];
  geoLocation?: string;
  countryCode?: string;
}

export interface NewsTrend {
  topic: string;
  relatedTopics: string[];
  trendScore: number;
  articleCount: number;
  geoScope: 'global' | 'domestic' | 'local';
}

// =============================================================================
// NEWS SOURCES CONFIGURATION
// =============================================================================

const NEWS_SOURCES = {
  newsapi: {
    name: 'NewsAPI',
    baseUrl: 'https://newsapi.org/v2',
    apiKeyEnv: 'NEWSAPI_KEY',
    categories: ['technology', 'business', 'science', 'sports', 'entertainment', 'health', 'general']
  },
  gnews: {
    name: 'GNews',
    baseUrl: 'https://gnews.io/api/v4',
    apiKeyEnv: 'GNEWS_API_KEY',
    categories: ['technology', 'business', 'science', 'sports', 'entertainment', 'health', 'world', 'nation']
  },
  hackernews: {
    name: 'Hacker News',
    baseUrl: 'https://hacker-news.firebaseio.com/v0',
    categories: ['tech', 'startups', 'programming']
  },
  reddit: {
    name: 'Reddit',
    baseUrl: 'https://www.reddit.com',
    subreddits: ['technology', 'worldnews', 'science', 'programming', 'business', 'sports']
  },
  mediastack: {
    name: 'MediaStack',
    baseUrl: 'http://api.mediastack.com/v1',
    apiKeyEnv: 'MEDIASTACK_API_KEY',
    categories: ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology']
  }
};

// Topic to category mapping
const TOPIC_MAPPINGS: Record<string, string[]> = {
  tech: ['technology', 'programming', 'startups', 'ai', 'software'],
  business: ['business', 'finance', 'economy', 'markets', 'investing'],
  politics: ['politics', 'government', 'elections', 'policy'],
  sports: ['sports', 'football', 'basketball', 'soccer', 'tennis'],
  science: ['science', 'research', 'space', 'physics', 'biology'],
  health: ['health', 'medicine', 'fitness', 'wellness'],
  entertainment: ['entertainment', 'movies', 'music', 'gaming', 'celebrities'],
  money: ['finance', 'crypto', 'stocks', 'investing', 'economy']
};

// =============================================================================
// NEWS SERVICE
// =============================================================================

export const newsService = {
  /**
   * Search news from multiple sources
   */
  searchNews: async (
    params: NewsSearchParams,
    userPreferences?: UserNewsPreferences
  ): Promise<NewsArticle[]> => {
    const {
      query,
      topics = [],
      sources = ['hackernews', 'reddit', 'newsapi'],
      timeRange = 'today',
      geoLocation,
      countryCode,
      includeGlobal = true,
      maxResults = configService.get('news.search.maxResults', 30)
    } = params;

    const cacheKey = `news:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<NewsArticle[]>(cacheKey);
    if (cached) return cached;

    const allArticles: NewsArticle[] = [];
    const searchPromises: Promise<NewsArticle[]>[] = [];

    // Search each enabled source
    if (sources.includes('hackernews')) {
      searchPromises.push(newsService.searchHackerNews(query, topics, maxResults));
    }
    if (sources.includes('reddit')) {
      searchPromises.push(newsService.searchReddit(query, topics, maxResults));
    }
    if (sources.includes('newsapi') && process.env.NEWSAPI_KEY) {
      searchPromises.push(newsService.searchNewsAPI(query, topics, countryCode, maxResults));
    }
    if (sources.includes('gnews') && process.env.GNEWS_API_KEY) {
      searchPromises.push(newsService.searchGNews(query, topics, countryCode, maxResults));
    }
    if (sources.includes('mediastack') && process.env.MEDIASTACK_API_KEY) {
      searchPromises.push(newsService.searchMediaStack(query, topics, countryCode, maxResults));
    }

    const results = await Promise.allSettled(searchPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        allArticles.push(...result.value);
      }
    }

    // Apply relevance scoring if user preferences provided
    let scoredArticles = allArticles;
    if (userPreferences) {
      scoredArticles = newsService.applyRelevanceScoring(allArticles, userPreferences);
    }

    // Sort by relevance and recency
    scoredArticles.sort((a, b) => {
      const scoreA = (a.relevanceScore || 50) + (new Date(a.publishedAt).getTime() / 1000000000);
      const scoreB = (b.relevanceScore || 50) + (new Date(b.publishedAt).getTime() / 1000000000);
      return scoreB - scoreA;
    });

    // Deduplicate by title similarity
    const uniqueArticles = newsService.deduplicateArticles(scoredArticles);

    // Limit results
    const finalArticles = uniqueArticles.slice(0, maxResults);

    // Cache results
    const cacheTtl = configService.get('news.cache.ttlSeconds', 900);
    await cacheService.set(cacheKey, finalArticles, { ttl: cacheTtl });

    return finalArticles;
  },

  /**
   * Search Hacker News
   */
  searchHackerNews: async (
    query?: string,
    topics?: string[],
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiTimeout = configService.get('news.api.timeoutMs', 5000);
    const hnFetchLimit = configService.get('news.hackernews.fetchLimit', 50);
    
    try {
      // Get top stories
      const topStoriesResponse = await axios.get(
        `${NEWS_SOURCES.hackernews.baseUrl}/topstories.json`,
        { timeout: apiTimeout }
      );
      
      const storyIds = topStoriesResponse.data.slice(0, hnFetchLimit);
      
      // Fetch story details in parallel
      const storyPromises = storyIds.map((id: number) =>
        axios.get(`${NEWS_SOURCES.hackernews.baseUrl}/item/${id}.json`, { timeout: apiTimeout })
          .catch(() => null)
      );
      
      const stories = await Promise.all(storyPromises);
      
      const articles: NewsArticle[] = [];
      
      for (const response of stories) {
        if (!response?.data || !response.data.url) continue;
        
        const story = response.data;
        
        // Filter by query if provided
        if (query && !story.title?.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        
        articles.push({
          id: `hn-${story.id}`,
          url: story.url,
          title: story.title,
          description: `${story.score} points | ${story.descendants || 0} comments`,
          source: 'hackernews',
          sourceName: 'Hacker News',
          publishedAt: new Date(story.time * 1000),
          topics: ['tech', 'programming', 'startups'],
          readingTime: 5
        });
        
        if (articles.length >= maxResults) break;
      }
      
      return articles;
    } catch (error: any) {
      console.error('HackerNews search failed:', error.message);
      return [];
    }
  },

  /**
   * Search Reddit for news
   */
  searchReddit: async (
    query?: string,
    topics?: string[],
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiTimeout = configService.get('news.api.timeoutMs', 5000);
    
    try {
      const subreddits = topics?.length 
        ? topics.flatMap(t => TOPIC_MAPPINGS[t] || [t])
        : NEWS_SOURCES.reddit.subreddits;
      
      const articles: NewsArticle[] = [];
      
      for (const subreddit of subreddits.slice(0, 3)) {
        try {
          const url = query
            ? `${NEWS_SOURCES.reddit.baseUrl}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=hot&t=day&limit=10`
            : `${NEWS_SOURCES.reddit.baseUrl}/r/${subreddit}/hot.json?limit=10`;
          
          const response = await axios.get(url, {
            timeout: apiTimeout,
            headers: { 'User-Agent': 'Pocketknife/1.0' }
          });
          
          const posts = response.data?.data?.children || [];
          
          for (const post of posts) {
            const data = post.data;
            if (data.is_self || !data.url) continue;
            
            articles.push({
              id: `reddit-${data.id}`,
              url: data.url,
              title: data.title,
              description: `r/${subreddit} | ${data.score} upvotes | ${data.num_comments} comments`,
              source: 'reddit',
              sourceName: `Reddit r/${subreddit}`,
              publishedAt: new Date(data.created_utc * 1000),
              topics: [subreddit],
              imageUrl: data.thumbnail?.startsWith('http') ? data.thumbnail : undefined,
              readingTime: 5
            });
          }
        } catch (error) {
          // Skip failed subreddit
        }
        
        if (articles.length >= maxResults) break;
      }
      
      return articles.slice(0, maxResults);
    } catch (error: any) {
      console.error('Reddit search failed:', error.message);
      return [];
    }
  },

  /**
   * Search NewsAPI
   */
  searchNewsAPI: async (
    query?: string,
    topics?: string[],
    countryCode?: string,
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) return [];

    try {
      const params: Record<string, string> = {
        apiKey,
        pageSize: String(maxResults),
        language: 'en'
      };

      let endpoint = '/top-headlines';
      
      if (query) {
        endpoint = '/everything';
        params.q = query;
        params.sortBy = 'publishedAt';
      } else if (topics?.length) {
        params.category = topics[0];
      }
      
      if (countryCode && !query) {
        params.country = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_SOURCES.newsapi.baseUrl}${endpoint}`, {
        params,
        timeout: longTimeout
      });

      const articles: NewsArticle[] = (response.data.articles || []).map((article: any) => ({
        id: `newsapi-${Buffer.from(article.url).toString('base64').slice(0, 20)}`,
        url: article.url,
        title: article.title,
        description: article.description || '',
        content: article.content,
        author: article.author,
        source: 'newsapi',
        sourceName: article.source?.name || 'NewsAPI',
        imageUrl: article.urlToImage,
        publishedAt: new Date(article.publishedAt),
        topics: topics || ['general'],
        readingTime: Math.ceil((article.content?.length || 1000) / 200)
      }));

      return articles;
    } catch (error: any) {
      console.error('NewsAPI search failed:', error.message);
      return [];
    }
  },

  /**
   * Search GNews
   */
  searchGNews: async (
    query?: string,
    topics?: string[],
    countryCode?: string,
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];

    try {
      const params: Record<string, string> = {
        token: apiKey,
        max: String(Math.min(maxResults, 10)), // GNews free tier limits
        lang: 'en'
      };

      let endpoint = '/top-headlines';
      
      if (query) {
        endpoint = '/search';
        params.q = query;
      } else if (topics?.length) {
        params.topic = topics[0];
      }
      
      if (countryCode) {
        params.country = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_SOURCES.gnews.baseUrl}${endpoint}`, {
        params,
        timeout: longTimeout
      });

      const articles: NewsArticle[] = (response.data.articles || []).map((article: any) => ({
        id: `gnews-${Buffer.from(article.url).toString('base64').slice(0, 20)}`,
        url: article.url,
        title: article.title,
        description: article.description || '',
        content: article.content,
        source: 'gnews',
        sourceName: article.source?.name || 'GNews',
        imageUrl: article.image,
        publishedAt: new Date(article.publishedAt),
        topics: topics || ['general'],
        readingTime: Math.ceil((article.content?.length || 1000) / 200)
      }));

      return articles;
    } catch (error: any) {
      console.error('GNews search failed:', error.message);
      return [];
    }
  },

  /**
   * Search MediaStack
   */
  searchMediaStack: async (
    query?: string,
    topics?: string[],
    countryCode?: string,
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiKey = process.env.MEDIASTACK_API_KEY;
    if (!apiKey) return [];

    try {
      const params: Record<string, string> = {
        access_key: apiKey,
        limit: String(Math.min(maxResults, 25)),
        languages: 'en',
        sort: 'published_desc'
      };

      if (query) {
        params.keywords = query;
      }
      
      if (topics?.length) {
        params.categories = topics.join(',');
      }
      
      if (countryCode) {
        params.countries = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_SOURCES.mediastack.baseUrl}/news`, {
        params,
        timeout: longTimeout
      });

      const articles: NewsArticle[] = (response.data.data || []).map((article: any) => ({
        id: `mediastack-${Buffer.from(article.url).toString('base64').slice(0, 20)}`,
        url: article.url,
        title: article.title,
        description: article.description || '',
        source: 'mediastack',
        sourceName: article.source || 'MediaStack',
        imageUrl: article.image,
        publishedAt: new Date(article.published_at),
        topics: article.category ? [article.category] : ['general'],
        readingTime: 5
      }));

      return articles;
    } catch (error: any) {
      console.error('MediaStack search failed:', error.message);
      return [];
    }
  },

  /**
   * Apply relevance scoring based on user preferences (learning algorithm)
   */
  applyRelevanceScoring: (
    articles: NewsArticle[],
    preferences: UserNewsPreferences
  ): NewsArticle[] => {
    return articles.map(article => {
      let score = 50; // Base score

      // Topic weight scoring
      for (const topic of article.topics) {
        const weight = preferences.topicWeights[topic.toLowerCase()];
        if (weight !== undefined) {
          score += weight * 30; // Max +30 from topic weights
        }
      }

      // Source preference scoring
      if (preferences.preferredSources.includes(article.source)) {
        score += 15;
      }

      // Recency scoring (newer = higher)
      const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
      if (hoursAgo < 1) score += 10;
      else if (hoursAgo < 6) score += 7;
      else if (hoursAgo < 24) score += 4;

      return { ...article, relevanceScore: Math.min(100, Math.max(0, score)) };
    });
  },

  /**
   * Deduplicate articles by title similarity
   */
  deduplicateArticles: (articles: NewsArticle[]): NewsArticle[] => {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        unique.push(article);
      }
    }

    return unique;
  },

  /**
   * Get user's news preferences (with learned weights)
   */
  getUserPreferences: async (userId: string): Promise<UserNewsPreferences | null> => {
    const prisma = getPrisma();
    if (!prisma) return null;

    try {
      const prefs = await prisma.newsPreference.findUnique({
        where: { userId }
      });

      if (!prefs) return null;

      return {
        topicWeights: (prefs.topicWeights as Record<string, number>) || {},
        preferredSources: prefs.preferredSources,
        geoLocation: prefs.geoLocation || undefined,
        countryCode: prefs.countryCode || undefined
      };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  },

  /**
   * Update user preferences
   */
  updateUserPreferences: async (
    userId: string,
    updates: Partial<{
      topicWeights: Record<string, number>;
      preferredSources: string[];
      blockedSources: string[];
      geoLocation: string;
      countryCode: string;
      digestFrequency: string;
      digestTime: string;
      notifyVia: string[];
    }>
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    await prisma.newsPreference.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates
    });
  },

  /**
   * Record user interaction (for learning)
   */
  recordInteraction: async (
    userId: string,
    articleId: string,
    articleUrl: string,
    articleTitle: string,
    source: string,
    interactionType: 'view' | 'read' | 'like' | 'save' | 'share' | 'dismiss',
    metadata?: {
      readDuration?: number;
      scrollDepth?: number;
      topics?: string[];
      isPositive?: boolean;
    }
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    try {
      await prisma.newsInteraction.create({
        data: {
          userId,
          articleId,
          articleUrl,
          articleTitle,
          source,
          interactionType,
          readDuration: metadata?.readDuration,
          scrollDepth: metadata?.scrollDepth,
          topics: metadata?.topics || [],
          isPositive: metadata?.isPositive
        }
      });

      // Update topic weights based on interaction
      if (metadata?.topics?.length && interactionType !== 'dismiss') {
        await newsService.updateTopicWeights(userId, metadata.topics, interactionType, metadata.isPositive);
      }
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  },

  /**
   * Update topic weights based on user interactions (learning algorithm)
   */
  updateTopicWeights: async (
    userId: string,
    topics: string[],
    interactionType: string,
    isPositive?: boolean
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    const learningRate = configService.get('news.learning.rate', 0.1);
    
    // Determine weight adjustment
    let adjustment = 0;
    switch (interactionType) {
      case 'like':
      case 'save':
        adjustment = learningRate * 2;
        break;
      case 'read':
        adjustment = learningRate;
        break;
      case 'share':
        adjustment = learningRate * 1.5;
        break;
      case 'view':
        adjustment = learningRate * 0.5;
        break;
      case 'dismiss':
        adjustment = -learningRate;
        break;
    }

    if (isPositive === false) {
      adjustment = -Math.abs(adjustment);
    }

    try {
      const prefs = await prisma.newsPreference.findUnique({
        where: { userId }
      });

      const currentWeights = (prefs?.topicWeights as Record<string, number>) || {};
      
      for (const topic of topics) {
        const normalizedTopic = topic.toLowerCase();
        const currentWeight = currentWeights[normalizedTopic] || 0.5;
        currentWeights[normalizedTopic] = Math.min(1, Math.max(0, currentWeight + adjustment));
      }

      await prisma.newsPreference.upsert({
        where: { userId },
        create: { userId, topicWeights: currentWeights },
        update: { topicWeights: currentWeights }
      });
    } catch (error) {
      console.error('Failed to update topic weights:', error);
    }
  },

  /**
   * Save article to user's collection
   */
  saveArticle: async (userId: string, article: NewsArticle): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    await prisma.savedNewsArticle.upsert({
      where: {
        userId_externalId: { userId, externalId: article.id }
      },
      create: {
        userId,
        externalId: article.id,
        url: article.url,
        title: article.title,
        description: article.description,
        content: article.content,
        author: article.author,
        source: article.source,
        sourceName: article.sourceName,
        imageUrl: article.imageUrl,
        publishedAt: article.publishedAt,
        topics: article.topics,
        sentiment: article.sentiment,
        readingTime: article.readingTime
      },
      update: {
        // Just update timestamps
        updatedAt: new Date()
      }
    });
  },

  /**
   * Get saved articles for a user
   */
  getSavedArticles: async (
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<any[]> => {
    const prisma = getPrisma();
    if (!prisma) return [];

    return prisma.savedNewsArticle.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { isRead: false } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50
    });
  },

  /**
   * Generate AI summary of an article
   */
  generateSummary: async (articleUrl: string, articleContent?: string): Promise<string> => {
    const maxChars = configService.get('news.ai.summaryMaxChars', 3000);
    const maxTokens = configService.get('news.ai.maxTokens', 500);
    
    const prompt = `Summarize this news article in 2-3 bullet points. Focus on the key facts and takeaways.
    
${articleContent ? `Content: ${articleContent.slice(0, maxChars)}` : `URL: ${articleUrl}`}

Format your response as bullet points.`;

    const result = await claudeService.generateText(prompt, maxTokens);

    return result;
  },

  /**
   * Get trending topics
   */
  getTrendingTopics: async (
    geoScope: 'global' | 'domestic' | 'local' = 'global',
    countryCode?: string
  ): Promise<NewsTrend[]> => {
    const prisma = getPrisma();
    if (!prisma) return [];

    try {
      const trends = await prisma.newsTrend.findMany({
        where: {
          isActive: true,
          geoScope,
          ...(countryCode ? { countryCode } : {})
        },
        orderBy: { trendScore: 'desc' },
        take: 10
      });

      return trends.map(t => ({
        topic: t.topic,
        relatedTopics: t.relatedTopics,
        trendScore: t.trendScore,
        articleCount: t.articleCount,
        geoScope: t.geoScope as 'global' | 'domestic' | 'local'
      }));
    } catch (error) {
      console.error('Failed to get trending topics:', error);
      return [];
    }
  },

  /**
   * Generate personalized news digest
   */
  generateDigest: async (userId: string): Promise<{
    articles: NewsArticle[];
    summary: string;
  }> => {
    const preferences = await newsService.getUserPreferences(userId);
    
    const articles = await newsService.searchNews({
      topics: Object.entries(preferences?.topicWeights || {})
        .filter(([, weight]) => weight > 0.5)
        .map(([topic]) => topic),
      sources: preferences?.preferredSources,
      countryCode: preferences?.countryCode,
      timeRange: 'today',
      maxResults: 10
    }, preferences || undefined);

    // Generate summary
    const articleTitles = articles.slice(0, 5).map(a => `- ${a.title}`).join('\n');
    const summary = await claudeService.generateText(
      `Write a brief 2-sentence summary of today's top news based on these headlines:\n${articleTitles}`,
      200
    );

    return {
      articles,
      summary
    };
  },

  /**
   * Send news digest via notification channels
   */
  sendDigestNotification: async (
    userId: string,
    digest: { articles: NewsArticle[]; summary: string }
  ): Promise<void> => {
    const prisma = getPrisma();
    if (!prisma) return;

    const prefs = await prisma.newsPreference.findUnique({
      where: { userId }
    });

    const channels = prefs?.notifyVia || ['app'];

    if (channels.includes('telegram')) {
      const message = `📰 <b>Your Daily News Digest</b>\n\n${digest.summary}\n\n<b>Top Stories:</b>\n${
        digest.articles.slice(0, 5).map((a, i) => `${i + 1}. <a href="${a.url}">${a.title}</a>`).join('\n')
      }`;
      await telegramNotificationService.sendMessage(message);
    }

    if (channels.includes('discord')) {
      const embed = {
        title: '📰 Your Daily News Digest',
        description: digest.summary,
        fields: digest.articles.slice(0, 5).map((a, i) => ({
          name: `${i + 1}. ${a.sourceName}`,
          value: `[${a.title}](${a.url})`
        }))
      };
      await discordNotificationService.sendEmbed(embed);
    }
  }
};

export default newsService;

