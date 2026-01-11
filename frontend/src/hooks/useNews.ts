/**
 * useNews Hook
 * 
 * State management for News Agent functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import * as newsApi from '../services/newsApi';
import type { 
  NewsArticle, 
  SavedNewsArticle, 
  NewsTrend, 
  NewsPreferences,
  NewsDigest,
  NewsSearchParams 
} from '../services/newsApi';

export interface UseNewsReturn {
  // State
  articles: NewsArticle[];
  savedArticles: SavedNewsArticle[];
  trends: NewsTrend[];
  preferences: NewsPreferences | null;
  digest: NewsDigest | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  handleSearch: (params: NewsSearchParams) => Promise<void>;
  handleGetFeed: (maxResults?: number) => Promise<void>;
  handleGetDigest: () => Promise<void>;
  handleSaveArticle: (article: NewsArticle) => Promise<void>;
  handleGetSavedArticles: (maxResults?: number) => Promise<void>;
  handleRecordInteraction: (
    type: 'view' | 'read' | 'like' | 'save' | 'share' | 'dismiss',
    article: NewsArticle,
    metadata?: { readDuration?: number; scrollDepth?: number; isPositive?: boolean }
  ) => Promise<void>;
  handleGetTrends: (geoScope?: 'global' | 'domestic' | 'local', countryCode?: string) => Promise<void>;
  handleUpdatePreferences: (prefs: NewsPreferences) => Promise<void>;
  handleSummarize: (article: NewsArticle) => Promise<string | null>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useNews = (): UseNewsReturn => {
  // State
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedNewsArticle[]>([]);
  const [trends, setTrends] = useState<NewsTrend[]>([]);
  const [preferences, setPreferences] = useState<NewsPreferences | null>(null);
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const result = await newsApi.getPreferences();
        setPreferences(result.preferences);
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    };
    loadPreferences();
  }, []);

  // Search news
  const handleSearch = useCallback(async (params: NewsSearchParams) => {
    try {
      setLoading(true);
      setError(null);
      const result = await newsApi.searchNews(params);
      setArticles(result.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search news');
      console.error('News search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get personalized feed
  const handleGetFeed = useCallback(async (maxResults?: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await newsApi.getFeed(maxResults);
      setArticles(result.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to get feed');
      console.error('Get feed failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get digest
  const handleGetDigest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await newsApi.getDigest();
      setDigest(result);
    } catch (err: any) {
      setError(err.message || 'Failed to get digest');
      console.error('Get digest failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save article
  const handleSaveArticle = useCallback(async (article: NewsArticle) => {
    try {
      await newsApi.saveArticle(article);
      // Refresh saved articles
      const result = await newsApi.getSavedArticles();
      setSavedArticles(result.savedArticles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to save article');
      console.error('Save article failed:', err);
    }
  }, []);

  // Get saved articles
  const handleGetSavedArticles = useCallback(async (maxResults?: number) => {
    try {
      setLoading(true);
      const result = await newsApi.getSavedArticles(maxResults);
      setSavedArticles(result.savedArticles || []);
    } catch (err: any) {
      console.error('Get saved articles failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Record interaction
  const handleRecordInteraction = useCallback(async (
    type: 'view' | 'read' | 'like' | 'save' | 'share' | 'dismiss',
    article: NewsArticle,
    metadata?: { readDuration?: number; scrollDepth?: number; isPositive?: boolean }
  ) => {
    try {
      await newsApi.recordInteraction(type, article, metadata);
    } catch (err) {
      console.error('Record interaction failed:', err);
    }
  }, []);

  // Get trends
  const handleGetTrends = useCallback(async (
    geoScope?: 'global' | 'domestic' | 'local',
    countryCode?: string
  ) => {
    try {
      setLoading(true);
      const result = await newsApi.getTrends(geoScope, countryCode);
      setTrends(result.trends || []);
    } catch (err: any) {
      console.error('Get trends failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update preferences
  const handleUpdatePreferences = useCallback(async (prefs: NewsPreferences) => {
    try {
      await newsApi.updatePreferences(prefs);
      setPreferences(prev => ({ ...prev, ...prefs }));
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
      console.error('Update preferences failed:', err);
    }
  }, []);

  // Summarize article
  const handleSummarize = useCallback(async (article: NewsArticle): Promise<string | null> => {
    try {
      const result = await newsApi.summarizeArticle(article.url, article);
      return result.summary;
    } catch (err) {
      console.error('Summarize failed:', err);
      return null;
    }
  }, []);

  // Refresh feed
  const refresh = useCallback(async () => {
    await handleGetFeed();
  }, [handleGetFeed]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    articles,
    savedArticles,
    trends,
    preferences,
    digest,
    loading,
    error,
    handleSearch,
    handleGetFeed,
    handleGetDigest,
    handleSaveArticle,
    handleGetSavedArticles,
    handleRecordInteraction,
    handleGetTrends,
    handleUpdatePreferences,
    handleSummarize,
    refresh,
    clearError
  };
};

export default useNews;


