/**
 * News Agent API Service
 */

import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

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
  publishedAt: string;
  topics: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  readingTime?: number;
  relevanceScore?: number;
}

export interface SavedNewsArticle extends NewsArticle {
  isRead: boolean;
  readAt?: string;
  notes?: string;
  summary?: string;
  keyPoints?: string[];
  createdAt: string;
}

export interface NewsTrend {
  topic: string;
  relatedTopics: string[];
  trendScore: number;
  articleCount: number;
  geoScope: 'global' | 'domestic' | 'local';
}

export interface NewsPreferences {
  topicWeights?: Record<string, number>;
  preferredSources?: string[];
  blockedSources?: string[];
  geoLocation?: string;
  countryCode?: string;
  digestFrequency?: string;
  digestTime?: string;
  notifyVia?: string[];
  preferredLanguage?: string;
  includeLocalNews?: boolean;
  includeGlobalNews?: boolean;
}

export interface NewsDigest {
  articles: NewsArticle[];
  summary: string;
}

export interface NewsSearchParams {
  query?: string;
  topics?: string[];
  sources?: string[];
  timeRange?: 'today' | 'week' | 'month';
  countryCode?: string;
  maxResults?: number;
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * Search news articles
 */
export const searchNews = async (params: NewsSearchParams): Promise<{ articles: NewsArticle[] }> => {
  const response = await api.post('/news/search', params);
  return response.data;
};

/**
 * Get personalized news feed
 */
export const getFeed = async (maxResults?: number): Promise<{ articles: NewsArticle[] }> => {
  const response = await api.get('/news/feed', { params: { maxResults } });
  return response.data;
};

/**
 * Get news digest
 */
export const getDigest = async (): Promise<NewsDigest> => {
  const response = await api.get('/news/digest');
  return response.data;
};

/**
 * Save an article
 */
export const saveArticle = async (article: NewsArticle): Promise<{ success: boolean }> => {
  const response = await api.post('/news/articles/save', { article });
  return response.data;
};

/**
 * Get saved articles
 */
export const getSavedArticles = async (maxResults?: number): Promise<{ savedArticles: SavedNewsArticle[] }> => {
  const response = await api.get('/news/articles/saved', { params: { maxResults } });
  return response.data;
};

/**
 * Generate article summary
 */
export const summarizeArticle = async (
  articleUrl: string, 
  article?: NewsArticle
): Promise<{ summary: string }> => {
  const response = await api.post('/news/articles/summarize', { articleUrl, article });
  return response.data;
};

/**
 * Record user interaction
 */
export const recordInteraction = async (
  interactionType: 'view' | 'read' | 'like' | 'save' | 'share' | 'dismiss',
  article: NewsArticle,
  metadata?: {
    readDuration?: number;
    scrollDepth?: number;
    isPositive?: boolean;
  }
): Promise<void> => {
  await api.post('/news/interactions', {
    interactionType,
    articleId: article.id,
    articleUrl: article.url,
    articleTitle: article.title,
    article,
    ...metadata
  });
};

/**
 * Get trending topics
 */
export const getTrends = async (
  geoScope?: 'global' | 'domestic' | 'local',
  countryCode?: string
): Promise<{ trends: NewsTrend[] }> => {
  const response = await api.get('/news/trends', { params: { geoScope, countryCode } });
  return response.data;
};

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<{ preferences: NewsPreferences | null }> => {
  const response = await api.get('/news/preferences');
  return response.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (preferences: NewsPreferences): Promise<{ success: boolean }> => {
  const response = await api.put('/news/preferences', { preferences });
  return response.data;
};

// =============================================================================
// AVAILABLE TOPICS & SOURCES
// =============================================================================

export const NEWS_TOPICS = [
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'politics', label: 'Politics', icon: '🏛️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'money', label: 'Money & Finance', icon: '💰' }
];

export const NEWS_SOURCES = [
  { id: 'hackernews', label: 'Hacker News', category: 'tech' },
  { id: 'reddit', label: 'Reddit', category: 'general' },
  { id: 'newsapi', label: 'NewsAPI', category: 'general' },
  { id: 'gnews', label: 'GNews', category: 'general' },
  { id: 'mediastack', label: 'MediaStack', category: 'general' }
];






