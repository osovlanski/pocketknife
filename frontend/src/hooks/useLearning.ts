/**
 * useLearning Hook
 * 
 * Custom hook for managing Learning agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  source: string;
  description: string;
  summary?: string;
  tags: string[];
  publishedAt: string;
  author?: string;
  readTime?: string;
  isSummarizing?: boolean;
}

export interface SearchFilters {
  topics: string[];
  sources: string[];
  timeRange: 'day' | 'week' | 'month' | 'year' | 'custom' | 'all';
  customDateFrom?: string;
  customDateTo?: string;
}

export interface LinkedInInfo {
  configured: boolean;
  isPremium: boolean;
  instructions: string;
  features: string[];
}

export interface UseLearningReturn {
  // State
  searchQuery: string;
  resources: LearningResource[];
  isSearching: boolean;
  expandedResources: Set<string>;
  copiedId: string | null;
  showLinkedInInfo: boolean;
  linkedInInfo: LinkedInInfo | null;
  topicSummary: string | null;
  isGeneratingSummary: boolean;
  showSummary: boolean;
  filters: SearchFilters;
  uploadedFile: File | null;
  searchHistory: string[];
  showAutocomplete: boolean;
  savedArticles: LearningResource[];
  showSavedArticles: boolean;
  showCustomDatePicker: boolean;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  // Setters
  setSearchQuery: (query: string) => void;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  setShowLinkedInInfo: (show: boolean) => void;
  setShowSummary: (show: boolean) => void;
  setShowAutocomplete: (show: boolean) => void;
  setShowSavedArticles: (show: boolean) => void;
  setShowCustomDatePicker: (show: boolean) => void;
  
  // Actions
  handleSearch: () => Promise<void>;
  toggleResource: (id: string) => void;
  handleCopyUrl: (id: string, url: string) => void;
  handleSummarize: (resourceId: string) => Promise<void>;
  handleGenerateTopicSummary: () => Promise<void>;
  toggleSource: (sourceId: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearUploadedFile: () => void;
  handleSaveArticle: (article: LearningResource) => void;
  handleRemoveSavedArticle: (id: string) => void;
  handleSelectHistory: (query: string) => void;
  
  // Constants
  suggestedTopics: string[];
  sourceCategories: Record<string, {
    label: string;
    sources: Array<{ id: string; name: string; icon: React.ReactNode; premium?: boolean }>;
  }>;
}

const API_BASE = 'http://localhost:5000/api';

export const useLearning = (): UseLearningReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLinkedInInfo, setShowLinkedInInfo] = useState(false);
  const [linkedInInfo, setLinkedInInfo] = useState<LinkedInInfo | null>(null);
  const [topicSummary, setTopicSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    topics: [],
    sources: ['linkedin', 'devto', 'newsletters', 'hackernews', 'reddit'],
    timeRange: 'week'
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [savedArticles, setSavedArticles] = useState<LearningResource[]>([]);
  const [showSavedArticles, setShowSavedArticles] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedTopics = [
    'TypeScript best practices',
    'System design patterns',
    'Microservices architecture',
    'React performance optimization',
    'DevOps and CI/CD',
    'Cloud architecture AWS',
    'Security best practices',
    'AI and Machine Learning',
    'Career growth tips',
    'Code review techniques'
  ];

  // Placeholder for source categories - icons should be passed from component
  const sourceCategories = {};

  // Load saved articles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('learningAgent_savedArticles');
    if (saved) {
      setSavedArticles(JSON.parse(saved));
    }
    const history = localStorage.getItem('learningAgent_searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Save articles to localStorage
  useEffect(() => {
    localStorage.setItem('learningAgent_savedArticles', JSON.stringify(savedArticles));
  }, [savedArticles]);

  // Socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setResources([]);
    setTopicSummary(null);
    
    // Update search history
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('learningAgent_searchHistory', JSON.stringify(newHistory));
    
    try {
      const response = await fetch(`${API_BASE}/learning/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          sources: filters.sources,
          timeRange: filters.timeRange,
          ...(filters.timeRange === 'custom' && {
            customDateFrom: filters.customDateFrom,
            customDateTo: filters.customDateTo
          })
        })
      });
      
      const data = await response.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, searchHistory]);

  const toggleResource = useCallback((id: string) => {
    setExpandedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleCopyUrl = useCallback((id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSummarize = useCallback(async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    setResources(prev => prev.map(r => 
      r.id === resourceId ? { ...r, isSummarizing: true } : r
    ));
    
    try {
      const response = await fetch(`${API_BASE}/learning/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resource.url, title: resource.title })
      });
      
      const data = await response.json();
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, summary: data.summary, isSummarizing: false } : r
      ));
    } catch (error) {
      console.error('Summarize failed:', error);
      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, isSummarizing: false } : r
      ));
    }
  }, [resources]);

  const handleGenerateTopicSummary = useCallback(async () => {
    if (resources.length === 0) return;
    
    setIsGeneratingSummary(true);
    
    try {
      const response = await fetch(`${API_BASE}/learning/topic-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: searchQuery,
          resources: resources.slice(0, 10)
        })
      });
      
      const data = await response.json();
      setTopicSummary(data.summary);
      setShowSummary(true);
    } catch (error) {
      console.error('Topic summary failed:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [resources, searchQuery]);

  const toggleSource = useCallback((sourceId: string) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.includes(sourceId)
        ? prev.sources.filter(s => s !== sourceId)
        : [...prev.sources, sourceId]
    }));
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  }, []);

  const clearUploadedFile = useCallback(() => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSaveArticle = useCallback((article: LearningResource) => {
    if (!savedArticles.find(a => a.id === article.id)) {
      setSavedArticles(prev => [...prev, article]);
    }
  }, [savedArticles]);

  const handleRemoveSavedArticle = useCallback((id: string) => {
    setSavedArticles(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleSelectHistory = useCallback((query: string) => {
    setSearchQuery(query);
    setShowAutocomplete(false);
  }, []);

  return {
    searchQuery,
    resources,
    isSearching,
    expandedResources,
    copiedId,
    showLinkedInInfo,
    linkedInInfo,
    topicSummary,
    isGeneratingSummary,
    showSummary,
    filters,
    uploadedFile,
    searchHistory,
    showAutocomplete,
    savedArticles,
    showSavedArticles,
    showCustomDatePicker,
    fileInputRef,
    setSearchQuery,
    setFilters,
    setShowLinkedInInfo,
    setShowSummary,
    setShowAutocomplete,
    setShowSavedArticles,
    setShowCustomDatePicker,
    handleSearch,
    toggleResource,
    handleCopyUrl,
    handleSummarize,
    handleGenerateTopicSummary,
    toggleSource,
    handleFileUpload,
    clearUploadedFile,
    handleSaveArticle,
    handleRemoveSavedArticle,
    handleSelectHistory,
    suggestedTopics,
    sourceCategories
  };
};

export default useLearning;

