/**
 * News Agent Component
 * 
 * Personalized news aggregation with learning algorithm.
 * Features topic preferences, trending news, saved articles, and AI summaries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Newspaper, Search, TrendingUp, Bookmark, Settings, 
  RefreshCw, ExternalLink, Clock, ThumbsUp, ThumbsDown,
  Loader2, MapPin, Globe, Sparkles
} from 'lucide-react';
import useNews from '../hooks/useNews';
import { NEWS_TOPICS, NEWS_SOURCES, NewsArticle } from '../services/newsApi';
import MarkdownRenderer from './MarkdownRenderer';
import styles from '../styles/news.module.css';

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ArticleCardProps {
  article: NewsArticle;
  onSave: (article: NewsArticle) => void;
  onLike: (article: NewsArticle, isPositive: boolean) => void;
  onSummarize: (article: NewsArticle) => void;
  onRead: (article: NewsArticle) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, onSave, onLike, onSummarize, onRead 
}) => {
  const handleClick = () => {
    onRead(article);
    window.open(article.url, '_blank');
  };

  return (
    <article 
      className={styles.articleCard}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      tabIndex={0}
      role="article"
      aria-label={article.title}
    >
      {article.imageUrl && (
        <div className={styles.articleImage}>
          <img src={article.imageUrl} alt={article.title} loading="lazy" />
        </div>
      )}
      <div className={styles.articleContent}>
        <div className={styles.articleMeta}>
          <span className={styles.source}>{article.sourceName}</span>
          <span className={styles.dot}>•</span>
          <span className={styles.time}>
            <Clock className="w-3 h-3" />
            {formatTimeAgo(new Date(article.publishedAt))}
          </span>
          {article.readingTime && (
            <>
              <span className={styles.dot}>•</span>
              <span>{article.readingTime} min read</span>
            </>
          )}
        </div>
        <h3 className={styles.articleTitle}>{article.title}</h3>
        <p className={styles.articleDescription}>{article.description}</p>
        <div className={styles.articleTopics}>
          {article.topics.slice(0, 3).map(topic => (
            <span key={topic} className={styles.topicTag}>{topic}</span>
          ))}
        </div>
        <div className={styles.articleActions} onClick={e => e.stopPropagation()}>
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(article); }}
            className={styles.actionButton}
            aria-label="Save article"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onLike(article, true); }}
            className={styles.actionButton}
            aria-label="Like article"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onLike(article, false); }}
            className={styles.actionButton}
            aria-label="Dislike article"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSummarize(article); }}
            className={`${styles.actionButton} ${styles.summarizeButton}`}
            aria-label="AI Summary"
          >
            <Sparkles className="w-4 h-4" />
            Summary
          </button>
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.actionButton}
            aria-label="Open in new tab"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
      {article.relevanceScore && (
        <div 
          className={styles.relevanceScore}
          style={{ 
            background: `linear-gradient(135deg, ${getScoreColor(article.relevanceScore)}, transparent)`
          }}
        >
          {Math.round(article.relevanceScore)}%
        </div>
      )}
    </article>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NewsAgent: React.FC = () => {
  // Hooks
  const news = useNews();

  // Local state
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'saved' | 'trends' | 'settings'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [summaryModal, setSummaryModal] = useState<{ article: NewsArticle; summary: string } | null>(null);

  // Load feed on mount
  useEffect(() => {
    news.handleGetFeed();
  }, []);

  // Handlers
  const handleSearch = useCallback(async () => {
    await news.handleSearch({
      query: searchQuery || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined
    });
  }, [news, searchQuery, selectedTopics]);

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(t => t !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSaveArticle = useCallback(async (article: NewsArticle) => {
    await news.handleSaveArticle(article);
  }, [news]);

  const handleLikeArticle = useCallback(async (article: NewsArticle, isPositive: boolean) => {
    await news.handleRecordInteraction(isPositive ? 'like' : 'dismiss', article, { isPositive });
  }, [news]);

  const handleSummarize = useCallback(async (article: NewsArticle) => {
    const summary = await news.handleSummarize(article);
    if (summary) {
      setSummaryModal({ article, summary });
    }
  }, [news]);

  const handleReadArticle = useCallback(async (article: NewsArticle) => {
    await news.handleRecordInteraction('read', article);
  }, [news]);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'feed') {
      await news.handleGetFeed();
    } else if (activeTab === 'trends') {
      await news.handleGetTrends();
    } else if (activeTab === 'saved') {
      await news.handleGetSavedArticles();
    }
  }, [activeTab, news]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <div className={styles.feedContainer}>
            <div className={styles.topicsBar}>
              {NEWS_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`${styles.topicChip} ${selectedTopics.includes(topic.id) ? styles.active : ''}`}
                >
                  <span>{topic.icon}</span>
                  <span>{topic.label}</span>
                </button>
              ))}
            </div>
            
            {news.loading ? (
              <div className={styles.loadingState}>
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading your personalized feed...</p>
              </div>
            ) : news.articles.length === 0 ? (
              <div className={styles.emptyState}>
                <Newspaper className="w-12 h-12" />
                <h3>No articles found</h3>
                <p>Try adjusting your topic preferences or check back later.</p>
              </div>
            ) : (
              <div className={styles.articlesGrid}>
                {news.articles.map(article => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onSave={handleSaveArticle}
                    onLike={handleLikeArticle}
                    onSummarize={handleSummarize}
                    onRead={handleReadArticle}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'search':
        return (
          <div className={styles.searchContainer}>
            <div className={styles.searchBox}>
              <Search className="w-5 h-5" />
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.searchInput}
              />
              <button onClick={handleSearch} className={styles.searchButton}>
                Search
              </button>
            </div>
            
            <div className={styles.topicsBar}>
              {NEWS_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`${styles.topicChip} ${selectedTopics.includes(topic.id) ? styles.active : ''}`}
                >
                  <span>{topic.icon}</span>
                  <span>{topic.label}</span>
                </button>
              ))}
            </div>

            {news.loading ? (
              <div className={styles.loadingState}>
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Searching...</p>
              </div>
            ) : (
              <div className={styles.articlesGrid}>
                {news.articles.map(article => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onSave={handleSaveArticle}
                    onLike={handleLikeArticle}
                    onSummarize={handleSummarize}
                    onRead={handleReadArticle}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'saved':
        return (
          <div className={styles.savedContainer}>
            <h3>Saved Articles</h3>
            {news.savedArticles.length === 0 ? (
              <div className={styles.emptyState}>
                <Bookmark className="w-12 h-12" />
                <h3>No saved articles</h3>
                <p>Save articles from your feed to read later.</p>
              </div>
            ) : (
              <div className={styles.articlesGrid}>
                {news.savedArticles.map(article => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onSave={handleSaveArticle}
                    onLike={handleLikeArticle}
                    onSummarize={handleSummarize}
                    onRead={handleReadArticle}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'trends':
        return (
          <div className={styles.trendsContainer}>
            <div className={styles.trendsScopeButtons}>
              <button 
                onClick={() => news.handleGetTrends('global')}
                className={styles.scopeButton}
              >
                <Globe className="w-4 h-4" />
                Global
              </button>
              <button 
                onClick={() => news.handleGetTrends('domestic', 'US')}
                className={styles.scopeButton}
              >
                <MapPin className="w-4 h-4" />
                Local
              </button>
            </div>
            
            {news.trends.length === 0 ? (
              <div className={styles.emptyState}>
                <TrendingUp className="w-12 h-12" />
                <h3>No trends available</h3>
                <p>Check back later for trending topics.</p>
              </div>
            ) : (
              <div className={styles.trendsList}>
                {news.trends.map((trend, index) => (
                  <div 
                    key={trend.topic} 
                    className={styles.trendCard}
                    onClick={() => {
                      setSearchQuery(trend.topic);
                      setActiveTab('search');
                      handleSearch();
                    }}
                  >
                    <span className={styles.trendRank}>#{index + 1}</span>
                    <div className={styles.trendInfo}>
                      <h4>{trend.topic}</h4>
                      <p>{trend.articleCount} articles</p>
                    </div>
                    <div 
                      className={styles.trendScore}
                      style={{ width: `${trend.trendScore}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className={styles.settingsContainer}>
            <h3>News Preferences</h3>
            
            <div className={styles.settingsSection}>
              <h4>Preferred Topics</h4>
              <p>Topics you're interested in will appear more often.</p>
              <div className={styles.topicsGrid}>
                {NEWS_TOPICS.map(topic => (
                  <label key={topic.id} className={styles.topicCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={(news.preferences?.topicWeights?.[topic.id] || 0) > 0.5}
                      onChange={() => {
                        const currentWeight = news.preferences?.topicWeights?.[topic.id] || 0.5;
                        news.handleUpdatePreferences({
                          topicWeights: {
                            ...news.preferences?.topicWeights,
                            [topic.id]: currentWeight > 0.5 ? 0.3 : 0.8
                          }
                        });
                      }}
                    />
                    <span>{topic.icon} {topic.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.settingsSection}>
              <h4>News Sources</h4>
              <div className={styles.sourcesGrid}>
                {NEWS_SOURCES.map(source => (
                  <label key={source.id} className={styles.sourceCheckbox}>
                    <input 
                      type="checkbox"
                      checked={news.preferences?.preferredSources?.includes(source.id) ?? true}
                      onChange={() => {
                        const current = news.preferences?.preferredSources || NEWS_SOURCES.map(s => s.id);
                        const updated = current.includes(source.id)
                          ? current.filter(s => s !== source.id)
                          : [...current, source.id];
                        news.handleUpdatePreferences({ preferredSources: updated });
                      }}
                    />
                    <span>{source.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>📰 News Agent</h1>
          <p>Your personalized news feed with AI-powered recommendations</p>
        </div>
        <button onClick={handleRefresh} className={styles.refreshButton} disabled={news.loading}>
          <RefreshCw className={`w-5 h-5 ${news.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className={styles.tabs}>
        {[
          { id: 'feed', label: 'For You', icon: Newspaper },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'saved', label: 'Saved', icon: Bookmark },
          { id: 'trends', label: 'Trending', icon: TrendingUp },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'saved') news.handleGetSavedArticles();
              if (tab.id === 'trends') news.handleGetTrends();
            }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Error Display */}
      {news.error && (
        <div className={styles.errorBanner}>
          <p>{news.error}</p>
          <button onClick={news.clearError}>Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.mainContent}>
        {renderTabContent()}
      </main>

      {/* Summary Modal */}
      {summaryModal && (
        <div className={styles.modalOverlay} onClick={() => setSummaryModal(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>AI Summary</h3>
            <h4>{summaryModal.article.title}</h4>
            <div className={styles.summaryText}>
              <MarkdownRenderer content={summaryModal.summary} />
            </div>
            <button onClick={() => setSummaryModal(null)} className={styles.closeButton}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#6B7280';
};

export default NewsAgent;

