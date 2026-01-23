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
import logger from '../../utils/logger';
import { discordNotificationService } from '../notifications';
import { NEWS_SOURCES, NEWS_TOPICS, NewsSourceId, NewsTopicId } from '../../types/constants';

// =============================================================================
// TYPES
// =============================================================================

/** Sentiment analysis result */
export const SENTIMENT_VALUES = ['positive', 'negative', 'neutral'] as const;
export type SentimentValue = typeof SENTIMENT_VALUES[number];

/** Time range for news search */
export const TIME_RANGES = ['today', 'week', 'month'] as const;
export type TimeRange = typeof TIME_RANGES[number];

export interface NewsArticle {
  id: string;
  url: string;
  title: string;
  description: string;
  content?: string;
  author?: string;
  source: NewsSourceId | string;
  sourceName: string;
  imageUrl?: string;
  publishedAt: Date;
  topics: (NewsTopicId | string)[];
  sentiment?: SentimentValue;
  readingTime?: number;
  relevanceScore?: number;
}

export interface NewsSearchParams {
  query?: string;
  topics?: (NewsTopicId | string)[];
  sources?: (NewsSourceId | string)[];
  timeRange?: TimeRange;
  geoLocation?: string;
  countryCode?: string;
  includeGlobal?: boolean;
  maxResults?: number;
}

export interface UserNewsPreferences {
  topicWeights: Record<NewsTopicId | string, number>;
  preferredSources: (NewsSourceId | string)[];
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

// Base URLs are registered in externalApiService.ts for centralized management
// These are used as fallback defaults when DB config is not available
const NEWS_SOURCE_DEFAULTS = {
  newsapi: {
    name: 'NewsAPI',
    categories: ['technology', 'business', 'science', 'sports', 'entertainment', 'health', 'general']
  },
  gnews: {
    name: 'GNews',
    categories: ['technology', 'business', 'science', 'sports', 'entertainment', 'health', 'world', 'nation']
  },
  hackernews: {
    name: 'Hacker News',
    categories: ['tech', 'startups', 'programming']
  },
  reddit: {
    name: 'Reddit',
    subreddits: configService.get('news.reddit.subreddits', ['technology', 'worldnews', 'science', 'programming', 'business', 'sports'])
  },
  mediastack: {
    name: 'MediaStack',
    categories: ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology']
  },
  lobsters: {
    name: 'Lobste.rs',
    categories: ['tech', 'programming', 'security', 'devops']
  },
  devto: {
    name: 'DEV.to',
    categories: ['tech', 'programming', 'webdev', 'javascript', 'python']
  },
  currentsapi: {
    name: 'CurrentsAPI',
    categories: ['technology', 'business', 'science', 'world', 'politics', 'sports']
  }
};

// Fallback base URLs (used when externalApiService is not available)
const NEWS_BASE_URLS = {
  newsapi: configService.get('news.api.newsapi.baseUrl', 'https://newsapi.org/v2'),
  gnews: configService.get('news.api.gnews.baseUrl', 'https://gnews.io/api/v4'),
  hackernews: configService.get('news.api.hackernews.baseUrl', 'https://hacker-news.firebaseio.com/v0'),
  reddit: configService.get('news.api.reddit.baseUrl', 'https://www.reddit.com'),
  mediastack: configService.get('news.api.mediastack.baseUrl', 'http://api.mediastack.com/v1'),
  lobsters: configService.get('news.api.lobsters.baseUrl', 'https://lobste.rs'),
  devto: configService.get('news.api.devto.baseUrl', 'https://dev.to/api'),
  currentsapi: configService.get('news.api.currentsapi.baseUrl', 'https://api.currentsapi.services/v1')
};

// Topic to category mapping (general keywords)
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
// UNIFIED API CATEGORY MAPPINGS
// Maps internal topic IDs to external API category names
// Centralized here for DRY principle - each API function uses these
// =============================================================================

/** Reddit subreddits for each topic */
const REDDIT_SUBREDDITS: Record<string, string[]> = {
  tech: ['technology', 'programming', 'gadgets', 'webdev'],
  business: ['business', 'entrepreneur', 'smallbusiness', 'economics'],
  politics: ['politics', 'worldnews', 'news', 'geopolitics'],
  sports: ['sports', 'nfl', 'nba', 'soccer', 'baseball', 'hockey'],
  science: ['science', 'space', 'physics', 'biology', 'chemistry'],
  health: ['health', 'fitness', 'nutrition', 'medicine'],
  entertainment: ['entertainment', 'movies', 'music', 'television', 'gaming'],
  money: ['personalfinance', 'investing', 'stocks', 'cryptocurrency', 'wallstreetbets']
};

/** NewsAPI category mapping (valid: business, entertainment, general, health, science, sports, technology) */
const NEWSAPI_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'general',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

/** GNews topic mapping (valid: breaking-news, world, nation, business, technology, entertainment, sports, science, health) */
const GNEWS_TOPICS: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'world',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

/** MediaStack category mapping (valid: general, business, entertainment, health, science, sports, technology) */
const MEDIASTACK_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'general',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

/** CurrentsAPI category mapping (valid: technology, business, politics, sports, science, health, entertainment, finance, etc.) */
const CURRENTSAPI_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'politics',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'finance'
};

// =============================================================================
// TOPIC-SOURCE MAPPING
// =============================================================================

// Topic to source mapping - which sources support which topics
// Tech-only sources should NOT be used for non-tech topics
const TOPIC_SOURCE_MAPPING: Record<string, string[]> = {
  tech: ['hackernews', 'reddit', 'lobsters', 'devto', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  business: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  politics: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  sports: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  science: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  health: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  entertainment: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  money: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi']
};

// Sources that ONLY return tech content (should be excluded for non-tech topics)
const TECH_ONLY_SOURCES = ['hackernews', 'lobsters', 'devto'];

/**
 * Get appropriate sources for the given topics
 * Filters out tech-only sources when non-tech topics are selected
 */
const getSourcesForTopics = (topics: string[] | undefined, requestedSources?: string[]): string[] => {
  // Default sources if none specified
  const defaultSources = ['reddit', 'newsapi', 'gnews', 'mediastack'];
  
  if (!topics || topics.length === 0) {
    // No topics specified - use all sources
    return requestedSources || [...defaultSources, 'hackernews', 'lobsters', 'devto'];
  }
  
  // Check if any topic is tech-related
  const hasTechTopic = topics.some(t => 
    t.toLowerCase() === 'tech' || 
    t.toLowerCase() === 'technology' || 
    t.toLowerCase() === 'programming'
  );
  
  // If ONLY non-tech topics, exclude tech-only sources
  if (!hasTechTopic) {
    const validSources = new Set<string>();
    
    for (const topic of topics) {
      const sourcesForTopic = TOPIC_SOURCE_MAPPING[topic.toLowerCase()] || defaultSources;
      sourcesForTopic.forEach(s => validSources.add(s));
    }
    
    // If requested sources specified, filter them
    if (requestedSources) {
      return requestedSources.filter(s => !TECH_ONLY_SOURCES.includes(s));
    }
    
    return Array.from(validSources);
  }
  
  // Tech topics - use all sources including tech-only ones
  return requestedSources || [...defaultSources, 'hackernews', 'lobsters', 'devto'];
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
      sources: requestedSources,
      timeRange = 'today',
      geoLocation,
      countryCode,
      includeGlobal = true,
      maxResults = configService.get('news.search.maxResults', 30)
    } = params;

    // Get appropriate sources based on topics
    // This filters out tech-only sources when non-tech topics are selected
    const sources = getSourcesForTopics(topics, requestedSources);
    
    logger.info(`📰 News search - Topics: [${topics.join(', ')}] → Sources: [${sources.join(', ')}]`);

    const cacheKey = `news:search:${JSON.stringify({ ...params, sources })}`;
    const cached = await cacheService.get<NewsArticle[]>(cacheKey);
    if (cached) return cached;

    const allArticles: NewsArticle[] = [];
    const searchPromises: Promise<NewsArticle[]>[] = [];

    // Search each enabled source (now filtered by topic compatibility)
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
    // Free sources - no API key required (but only for tech topics)
    if (sources.includes('lobsters')) {
      searchPromises.push(newsService.searchLobsters(query, topics, maxResults));
    }
    if (sources.includes('devto')) {
      searchPromises.push(newsService.searchDevTo(query, topics, maxResults));
    }
    if (sources.includes('currentsapi') && process.env.CURRENTSAPI_KEY) {
      searchPromises.push(newsService.searchCurrentsAPI(query, topics, countryCode, maxResults));
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
        `${NEWS_BASE_URLS.hackernews}/topstories.json`,
        { timeout: apiTimeout }
      );
      
      const storyIds = topStoriesResponse.data.slice(0, hnFetchLimit);
      
      // Fetch story details in parallel
      const storyPromises = storyIds.map((id: number) =>
        axios.get(`${NEWS_BASE_URLS.hackernews}/item/${id}.json`, { timeout: apiTimeout })
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
      logger.fail('HackerNews search failed', { error: error.message });
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
      // Map topics to relevant subreddits using consolidated mapping
      let subreddits: string[];
      if (topics?.length) {
        const mappedSubreddits = new Set<string>();
        for (const topic of topics) {
          const subs = REDDIT_SUBREDDITS[topic.toLowerCase()] || [topic];
          subs.forEach(s => mappedSubreddits.add(s));
        }
        subreddits = Array.from(mappedSubreddits);
      } else {
        subreddits = NEWS_SOURCE_DEFAULTS.reddit.subreddits;
      }
      
      logger.info(`📰 Reddit search - Topics: [${topics?.join(', ')}] → Subreddits: [${subreddits.slice(0, 5).join(', ')}]`);
      
      const articles: NewsArticle[] = [];
      
      for (const subreddit of subreddits.slice(0, 3)) {
        try {
          const url = query
            ? `${NEWS_BASE_URLS.reddit}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=hot&t=day&limit=10`
            : `${NEWS_BASE_URLS.reddit}/r/${subreddit}/hot.json?limit=10`;
          
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
      logger.fail('Reddit search failed', { error: error.message });
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
        // Map topic to NewsAPI category using consolidated mapping
        const apiCategory = NEWSAPI_CATEGORIES[topics[0].toLowerCase()] || 'general';
        params.category = apiCategory;
        logger.info(`📰 NewsAPI - Topic "${topics[0]}" → Category "${apiCategory}"`);
      }
      
      if (countryCode && !query) {
        params.country = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_BASE_URLS.newsapi}${endpoint}`, {
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
      logger.fail('NewsAPI search failed', { error: error.message });
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
        // Map topic to GNews topic using consolidated mapping
        const apiTopic = GNEWS_TOPICS[topics[0].toLowerCase()] || 'breaking-news';
        params.topic = apiTopic;
        logger.info(`📰 GNews - Topic "${topics[0]}" → API Topic "${apiTopic}"`);
      }
      
      if (countryCode) {
        params.country = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_BASE_URLS.gnews}${endpoint}`, {
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
      logger.fail('GNews search failed', { error: error.message });
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
        // Map topics to MediaStack categories using consolidated mapping
        const apiCategories = topics
          .map(t => MEDIASTACK_CATEGORIES[t.toLowerCase()] || 'general')
          .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
        params.categories = apiCategories.join(',');
        logger.info(`📰 MediaStack - Topics [${topics.join(', ')}] → Categories [${apiCategories.join(', ')}]`);
      }
      
      if (countryCode) {
        params.countries = countryCode.toLowerCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_BASE_URLS.mediastack}/news`, {
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
      logger.fail('MediaStack search failed', { error: error.message });
      return [];
    }
  },

  /**
   * Search Lobste.rs (free, no API key required)
   * Tech-focused community similar to HackerNews
   */
  searchLobsters: async (
    query?: string,
    topics?: string[],
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiTimeout = configService.get('news.api.timeoutMs', 5000);
    
    try {
      // Lobste.rs has a simple JSON feed
      const response = await axios.get(`${NEWS_BASE_URLS.lobsters}/hottest.json`, {
        timeout: apiTimeout
      });
      
      const stories = response.data || [];
      const articles: NewsArticle[] = [];
      
      for (const story of stories) {
        if (!story.url) continue;
        
        // Filter by query if provided
        if (query && !story.title?.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        
        // Filter by topics if provided
        const storyTags = story.tags || [];
        if (topics?.length) {
          const hasMatchingTopic = topics.some(topic => 
            storyTags.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase()))
          );
          if (!hasMatchingTopic && !storyTags.some((t: string) => ['programming', 'tech', 'security', 'devops'].includes(t))) {
            continue;
          }
        }
        
        articles.push({
          id: `lobsters-${story.short_id}`,
          url: story.url,
          title: story.title,
          description: `${story.score} points | ${story.comment_count || 0} comments | Tags: ${storyTags.join(', ')}`,
          source: 'lobsters',
          sourceName: 'Lobste.rs',
          publishedAt: new Date(story.created_at),
          topics: storyTags.length ? storyTags : ['tech', 'programming'],
          readingTime: 5
        });
        
        if (articles.length >= maxResults) break;
      }
      
      return articles;
    } catch (error: any) {
      logger.fail('Lobste.rs search failed', { error: error.message });
      return [];
    }
  },

  /**
   * Search DEV.to (free, no API key required)
   * Developer community with tech articles and tutorials
   */
  searchDevTo: async (
    query?: string,
    topics?: string[],
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiTimeout = configService.get('news.api.timeoutMs', 5000);
    
    try {
      const params: Record<string, string | number> = {
        per_page: Math.min(maxResults, 30),
        top: 1 // Get top articles from past day
      };
      
      if (query) {
        // DEV.to doesn't have search in the same endpoint, but we can use tag
        params.tag = query.toLowerCase().replace(/\s+/g, '');
      } else if (topics?.length) {
        params.tag = topics[0].toLowerCase();
      }
      
      const response = await axios.get(`${NEWS_BASE_URLS.devto}/articles`, {
        params,
        timeout: apiTimeout
      });
      
      const posts = response.data || [];
      const articles: NewsArticle[] = [];
      
      for (const post of posts) {
        // Filter by query in title/description if provided
        if (query && !post.title?.toLowerCase().includes(query.toLowerCase()) && 
            !post.description?.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        
        articles.push({
          id: `devto-${post.id}`,
          url: post.url,
          title: post.title,
          description: post.description || `${post.positive_reactions_count || 0} reactions | ${post.comments_count || 0} comments`,
          content: post.body_markdown,
          author: post.user?.name || post.user?.username,
          source: 'devto',
          sourceName: 'DEV.to',
          imageUrl: post.cover_image || post.social_image,
          publishedAt: new Date(post.published_at),
          topics: post.tag_list || ['programming', 'webdev'],
          readingTime: post.reading_time_minutes || 5
        });
        
        if (articles.length >= maxResults) break;
      }
      
      return articles;
    } catch (error: any) {
      logger.fail('DEV.to search failed', { error: error.message });
      return [];
    }
  },

  /**
   * Search CurrentsAPI (free tier: 600 requests/day)
   * General news from worldwide sources
   */
  searchCurrentsAPI: async (
    query?: string,
    topics?: string[],
    countryCode?: string,
    maxResults: number = 20
  ): Promise<NewsArticle[]> => {
    const apiKey = process.env.CURRENTSAPI_KEY;
    if (!apiKey) return [];

    try {
      const params: Record<string, string> = {
        apiKey,
        language: 'en',
        page_size: String(Math.min(maxResults, 200))
      };

      let endpoint = '/latest-news';
      
      if (query) {
        endpoint = '/search';
        params.keywords = query;
      }
      
      if (topics?.length) {
        // Map topic to CurrentsAPI category using consolidated mapping
        const apiCategory = CURRENTSAPI_CATEGORIES[topics[0].toLowerCase()] || 'general';
        params.category = apiCategory;
        logger.info(`📰 CurrentsAPI - Topic "${topics[0]}" → Category "${apiCategory}"`);
      }
      
      if (countryCode) {
        params.country = countryCode.toUpperCase();
      }

      const longTimeout = configService.get('news.api.longTimeoutMs', 10000);
      const response = await axios.get(`${NEWS_BASE_URLS.currentsapi}${endpoint}`, {
        params,
        timeout: longTimeout
      });

      const articles: NewsArticle[] = (response.data.news || []).map((article: any) => ({
        id: `currentsapi-${Buffer.from(article.url || article.id).toString('base64').slice(0, 20)}`,
        url: article.url,
        title: article.title,
        description: article.description || '',
        author: article.author,
        source: 'currentsapi',
        sourceName: 'CurrentsAPI',
        imageUrl: article.image !== 'None' ? article.image : undefined,
        publishedAt: new Date(article.published),
        topics: article.category ? [article.category] : ['general'],
        readingTime: 5
      }));

      return articles;
    } catch (error: any) {
      logger.fail('CurrentsAPI search failed', { error: error.message });
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
      logger.fail('Failed to get user preferences', { error: (error as Error).message });
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
      logger.fail('Failed to record interaction', { error: (error as Error).message });
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
      logger.fail('Failed to update topic weights', { error: (error as Error).message });
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
   * Falls back to generating trends from recent articles if database is empty
   */
  getTrendingTopics: async (
    geoScope: 'global' | 'domestic' | 'local' = 'global',
    countryCode?: string
  ): Promise<NewsTrend[]> => {
    const prisma = getPrisma();
    
    try {
      // Try to get from database first
      if (prisma) {
        const trends = await prisma.newsTrend.findMany({
          where: {
            isActive: true,
            geoScope,
            ...(countryCode ? { countryCode } : {})
          },
          orderBy: { trendScore: 'desc' },
          take: 10
        });

        if (trends.length > 0) {
          return trends.map((t) => ({
            topic: t.topic,
            relatedTopics: t.relatedTopics,
            trendScore: t.trendScore,
            articleCount: t.articleCount,
            geoScope: t.geoScope as 'global' | 'domestic' | 'local'
          }));
        }
      }

      // Fallback: Generate trends from current news
      const articles = await newsService.searchNews({
        sources: ['hackernews', 'reddit', 'lobsters', 'devto'],
        maxResults: 50
      });

      // Count topic frequencies
      const topicCounts: Record<string, { count: number; articles: string[] }> = {};
      for (const article of articles) {
        for (const topic of article.topics) {
          const normalizedTopic = topic.toLowerCase();
          if (!topicCounts[normalizedTopic]) {
            topicCounts[normalizedTopic] = { count: 0, articles: [] };
          }
          topicCounts[normalizedTopic].count++;
          if (topicCounts[normalizedTopic].articles.length < 5) {
            topicCounts[normalizedTopic].articles.push(article.title);
          }
        }
      }

      // Convert to trends, sorted by count
      const generatedTrends: NewsTrend[] = Object.entries(topicCounts)
        .filter(([topic]) => topic.length > 2) // Filter out very short topics
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([topic, data], index) => ({
          topic: topic.charAt(0).toUpperCase() + topic.slice(1),
          relatedTopics: [],
          trendScore: Math.max(10, 100 - index * 10),
          articleCount: data.count,
          geoScope
        }));

      return generatedTrends;
    } catch (error) {
      logger.fail('Failed to get trending topics', { error: (error as Error).message });
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

