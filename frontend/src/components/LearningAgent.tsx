import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, ExternalLink, FileText, Sparkles, RefreshCw, Filter, Tag, Globe, Linkedin, Brain, ChevronDown, ChevronUp, Copy, Check, Newspaper, Crown, Info, Upload, X, Save, History } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import AISummaryModal from './AISummaryModal';

interface LearningResource {
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

interface SearchFilters {
  topics: string[];
  sources: string[];
  timeRange: 'day' | 'week' | 'month' | 'year' | 'custom' | 'all';
  customDateFrom?: string;
  customDateTo?: string;
}

interface LinkedInInfo {
  configured: boolean;
  isPremium: boolean;
  instructions: string;
  features: string[];
}

const LearningAgent = () => {
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

  // Source categories with icons
  const sourceCategories = {
    social: {
      label: 'Social',
      sources: [
        { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-blue-500" />, premium: true },
        { id: 'reddit', name: 'Reddit', icon: <Globe className="w-4 h-4 text-orange-500" /> }
      ]
    },
    blogs: {
      label: 'Blogs & Forums',
      sources: [
        { id: 'devto', name: 'Dev.to', icon: <Globe className="w-4 h-4 text-gray-300" /> },
        { id: 'medium', name: 'Medium', icon: <FileText className="w-4 h-4 text-green-400" /> },
        { id: 'hackernews', name: 'Hacker News', icon: <Globe className="w-4 h-4 text-orange-400" /> }
      ]
    },
    newsletters: {
      label: '📰 Newsletters',
      sources: [
        { id: 'newsletters', name: 'All Newsletters', icon: <Newspaper className="w-4 h-4 text-purple-400" /> },
        { id: 'systemdesign', name: 'System Design', icon: <Newspaper className="w-4 h-4 text-blue-400" /> },
        { id: 'bytebytego', name: 'ByteByteGo', icon: <Newspaper className="w-4 h-4 text-green-400" /> },
        { id: 'tldr', name: 'TLDR', icon: <Newspaper className="w-4 h-4 text-yellow-400" /> }
      ]
    }
  };

  const sourceIcons: Record<string, JSX.Element> = {
    linkedin: <Linkedin className="w-4 h-4 text-blue-500" />,
    devto: <Globe className="w-4 h-4 text-gray-300" />,
    medium: <FileText className="w-4 h-4 text-green-400" />,
    hackernews: <Globe className="w-4 h-4 text-orange-400" />,
    reddit: <Globe className="w-4 h-4 text-orange-500" />,
    newsletters: <Newspaper className="w-4 h-4 text-purple-400" />,
    systemdesign: <Newspaper className="w-4 h-4 text-blue-400" />,
    bytebytego: <Newspaper className="w-4 h-4 text-green-400" />,
    tldr: <Newspaper className="w-4 h-4 text-yellow-400" />,
    gemini: <Brain className="w-4 h-4 text-purple-400" />,
    claude: <Sparkles className="w-4 h-4 text-amber-400" />
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('learning-resource', (resource: LearningResource) => {
      setResources(prev => {
        const exists = prev.some(r => r.id === resource.id);
        if (exists) return prev;
        return [...prev, resource];
      });
    });

    // Fetch LinkedIn integration info and search history
    fetchLinkedInInfo();
    loadSearchHistory();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchLinkedInInfo = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/learning/linkedin-info');
      if (response.ok) {
        const data = await response.json();
        setLinkedInInfo(data);
      }
    } catch (error) {
      console.warn('Could not fetch LinkedIn info');
    }
  };

  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('learning-search-history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.warn('Could not load search history');
    }
  };

  const saveToSearchHistory = (query: string) => {
    const updatedHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('learning-search-history', JSON.stringify(updatedHistory));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    
    // Read file content and use as query
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Extract key topics from file content (first 500 chars for query)
      const preview = content.substring(0, 500).replace(/\n/g, ' ').trim();
      setSearchQuery(preview);
    };
    reader.readAsText(file);
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveArticle = async (resource: LearningResource) => {
    try {
      const response = await fetch('http://localhost:5000/api/agents/learning/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-article',
          articleData: {
            id: resource.id,
            title: resource.title,
            url: resource.url,
            source: resource.source,
            description: resource.description,
            summary: resource.summary,
            tags: resource.tags
          }
        })
      });
      
      if (response.ok) {
        setSavedArticles(prev => [...prev, resource]);
      }
    } catch (error) {
      console.error('Failed to save article:', error);
    }
  };

  const filteredSuggestions = searchQuery.length > 0 
    ? [...searchHistory, ...suggestedTopics].filter(
        (topic, index, self) => 
          topic.toLowerCase().includes(searchQuery.toLowerCase()) && 
          self.indexOf(topic) === index
      ).slice(0, 8)
    : [];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setResources([]);
      setTopicSummary(null);
      setShowSummary(false);
      setShowAutocomplete(false);
      
      // Save to search history
      saveToSearchHistory(searchQuery);

      const response = await fetch('http://localhost:5000/api/learning/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          sources: filters.sources,
          timeRange: filters.timeRange
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('Search error:', data.error);
        return;
      }

      setResources(data.resources || []);
    } catch (error: any) {
      console.error('Search failed:', error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateTopicSummary = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsGeneratingSummary(true);

      const response = await fetch('http://localhost:5000/api/learning/topic-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: searchQuery })
      });

      const data = await response.json();

      if (data.error) {
        console.error('Topic summary error:', data.error);
        return;
      }

      setTopicSummary(data.summary);
      setShowSummary(true);
    } catch (error: any) {
      console.error('Failed to generate summary:', error.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSummarize = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    setResources(prev => prev.map(r =>
      r.id === resourceId ? { ...r, isSummarizing: true } : r
    ));

    try {
      const response = await fetch('http://localhost:5000/api/learning/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resource.url, title: resource.title })
      });

      const data = await response.json();

      if (data.summary) {
        setResources(prev => prev.map(r =>
          r.id === resourceId ? { ...r, summary: data.summary, isSummarizing: false } : r
        ));
        setExpandedResources(prev => new Set([...prev, resourceId]));
      }
    } catch (error: any) {
      console.error('Failed to summarize:', error.message);
      setResources(prev => prev.map(r =>
        r.id === resourceId ? { ...r, isSummarizing: false } : r
      ));
    }
  };

  const toggleExpanded = (resourceId: string) => {
    setExpandedResources(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, resourceId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(resourceId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleSource = (source: string) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          📚 AI Learning Agent
        </h1>
        <p className="text-slate-300">Discover and summarize educational content from across the web</p>
      </div>

      {/* Search Panel */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowAutocomplete(e.target.value.length > 0);
              }}
              onFocus={() => setShowAutocomplete(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for topics (e.g., 'TypeScript best practices', 'system design')"
              className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
            
            {/* Autocomplete dropdown */}
            {showAutocomplete && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-xl overflow-hidden">
                {filteredSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowAutocomplete(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2"
                  >
                    {searchHistory.includes(suggestion) ? (
                      <History className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Search className="w-4 h-4 text-slate-400" />
                    )}
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* File Upload Button */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 rounded-xl transition-all"
              title="Upload a file to analyze"
            >
              <Upload className="w-5 h-5" />
              {uploadedFile ? (
                <span className="text-sm truncate max-w-[120px]">{uploadedFile.name}</span>
              ) : (
                <span className="hidden md:inline">Upload</span>
              )}
            </button>
            {uploadedFile && (
              <button
                onClick={clearUploadedFile}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-8 py-3 rounded-xl transition-all disabled:opacity-50 font-semibold"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Suggested Topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-slate-400 text-sm">Suggestions:</span>
          {suggestedTopics.slice(0, 5).map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setSearchQuery(topic);
              }}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-1 rounded-full transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Source Filters - Organized by Category */}
        <div className="space-y-3">
          {/* Social & Blogs */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm w-16">Sources:</span>
            {['linkedin', 'devto', 'medium', 'hackernews', 'reddit'].map((source) => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-colors ${
                  filters.sources.includes(source)
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border border-white/20 text-slate-400 hover:text-white'
                }`}
              >
                {sourceIcons[source]}
                {source.charAt(0).toUpperCase() + source.slice(1)}
                {source === 'linkedin' && linkedInInfo?.isPremium && (
                  <Crown className="w-3 h-3 text-yellow-400 ml-1" />
                )}
              </button>
            ))}
            {/* LinkedIn Premium Info Button */}
            <button
              onClick={() => setShowLinkedInInfo(!showLinkedInInfo)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
              title="LinkedIn Premium Integration"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>

          {/* Newsletters */}
          <div className="flex flex-wrap items-center gap-2">
            <Newspaper className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-sm w-16">Newsletters:</span>
            {['newsletters', 'systemdesign', 'bytebytego', 'tldr'].map((source) => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-colors ${
                  filters.sources.includes(source)
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border border-white/20 text-slate-400 hover:text-white'
                }`}
              >
                {sourceIcons[source]}
                {source === 'newsletters' ? 'All Newsletters' : 
                 source === 'systemdesign' ? 'System Design' :
                 source === 'bytebytego' ? 'ByteByteGo' : 'TLDR'}
              </button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-sm w-16 ml-5">Time:</span>
            {['day', 'week', 'month', 'year', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setFilters(prev => ({ ...prev, timeRange: range as any }));
                  setShowCustomDatePicker(false);
                }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filters.timeRange === range
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border border-white/20 text-slate-400 hover:text-white'
                }`}
              >
                {range === 'day' ? 'Today' : 
                 range === 'week' ? 'This Week' : 
                 range === 'month' ? 'This Month' : 
                 range === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
            {/* Custom Date Button */}
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, timeRange: 'custom' }));
                setShowCustomDatePicker(true);
              }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filters.timeRange === 'custom'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                  : 'bg-white/5 border border-white/20 text-slate-400 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>
          
          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="flex items-center gap-3 ml-5 mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">From:</span>
                <input
                  type="date"
                  value={filters.customDateFrom || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, customDateFrom: e.target.value }))}
                  className="text-xs bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">To:</span>
                <input
                  type="date"
                  value={filters.customDateTo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, customDateTo: e.target.value }))}
                  className="text-xs bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                onClick={() => setShowCustomDatePicker(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* LinkedIn Premium Info Panel */}
          {showLinkedInInfo && linkedInInfo && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Premium Integration
                  {linkedInInfo.isPremium && <Crown className="w-4 h-4 text-yellow-400" />}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  linkedInInfo.configured 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {linkedInInfo.configured ? '✓ Connected' : '⚠ Not Configured'}
                </span>
              </div>
              
              <div className="text-xs text-slate-300 space-y-2">
                <p className="font-semibold">Premium Features:</p>
                <ul className="space-y-1 ml-2">
                  {linkedInInfo.features.map((feature, idx) => (
                    <li key={idx} className="text-slate-400">{feature}</li>
                  ))}
                </ul>
                
                {!linkedInInfo.configured && (
                  <div className="mt-3 p-2 bg-white/5 rounded text-slate-400">
                    <p className="font-semibold text-slate-300 mb-1">Setup Instructions:</p>
                    <pre className="text-xs whitespace-pre-wrap">{linkedInInfo.instructions}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary Modal */}
      <AISummaryModal
        isOpen={showSummary && !!topicSummary}
        onClose={() => setShowSummary(false)}
        topic={searchQuery}
        summary={topicSummary || ''}
        onCopy={(text) => copyToClipboard(text, 'summary')}
        isCopied={copiedId === 'summary'}
      />

      {/* AI Summary Preview Card (shows when summary exists but modal is closed) */}
      {topicSummary && !showSummary && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-lg rounded-xl p-4 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all"
          onClick={() => setShowSummary(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Summary Available</h3>
                <p className="text-sm text-slate-400">Click to view the full interactive summary for "{searchQuery}"</p>
              </div>
            </div>
            <button className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-4 py-2 rounded-lg transition-colors">
              Open Summary
            </button>
          </div>
        </div>
      )}

      {/* Generate Summary Button */}
      {resources.length > 0 && !topicSummary && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerateTopicSummary}
            disabled={isGeneratingSummary}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6 py-3 rounded-xl transition-all disabled:opacity-50 font-semibold"
          >
            {isGeneratingSummary ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate AI Topic Summary
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Grid */}
      {resources.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Found {resources.length} Learning Resources
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-amber-400/50 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {sourceIcons[resource.source.toLowerCase()] || <Globe className="w-4 h-4" />}
                      <span className="text-xs text-slate-400">{resource.source}</span>
                      {resource.readTime && (
                        <span className="text-xs text-slate-500">• {resource.readTime}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight hover:text-amber-400 transition-colors">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        {resource.title}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </h3>
                    {resource.author && (
                      <p className="text-sm text-slate-400 mt-1">by {resource.author}</p>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-3 line-clamp-2">{resource.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-400">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Summary Section - Expert Level with Formatting */}
                {resource.summary && (
                  <div className={`bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4 mb-3 ${
                    expandedResources.has(resource.id) ? '' : 'hidden'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Expert AI Summary
                      </span>
                      <button
                        onClick={() => copyToClipboard(resource.summary!, resource.id)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                      >
                        {copiedId === resource.id ? (
                          <><Check className="w-3 h-3" /> Copied!</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    {/* Render formatted summary */}
                    <div className="text-sm text-slate-200 space-y-2 summary-content">
                      {resource.summary.split('\n').map((line, idx) => {
                        // Style different sections
                        if (line.startsWith('📋') || line.startsWith('🔑') || line.startsWith('📊') || 
                            line.startsWith('⚠️') || line.startsWith('💡')) {
                          return (
                            <h4 key={idx} className="font-bold text-amber-300 mt-3 first:mt-0">
                              {line}
                            </h4>
                          );
                        }
                        if (line.startsWith('•') || line.startsWith('-')) {
                          return (
                            <p key={idx} className="ml-4 text-slate-300">
                              {line}
                            </p>
                          );
                        }
                        if (line.startsWith('```')) {
                          return null; // Skip code block markers
                        }
                        if (line.trim() === '---') {
                          return <hr key={idx} className="border-amber-500/30 my-2" />;
                        }
                        if (line.trim()) {
                          return <p key={idx}>{line}</p>;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleSummarize(resource.id)}
                    disabled={resource.isSummarizing || !!resource.summary}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      resource.summary
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                    }`}
                  >
                    {resource.isSummarizing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Summarizing...
                      </>
                    ) : resource.summary ? (
                      <>
                        <Check className="w-3 h-3" />
                        Summarized
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        AI Summarize
                      </>
                    )}
                  </button>

                  {resource.summary && (
                    <button
                      onClick={() => toggleExpanded(resource.id)}
                      className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {expandedResources.has(resource.id) ? (
                        <><ChevronUp className="w-3 h-3" /> Hide Summary</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> Show Summary</>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleSaveArticle(resource)}
                    disabled={savedArticles.some(a => a.id === resource.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      savedArticles.some(a => a.id === resource.id)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                    }`}
                  >
                    {savedArticles.some(a => a.id === resource.id) ? (
                      <><Check className="w-3 h-3" /> Saved</>
                    ) : (
                      <><Save className="w-3 h-3" /> Save</>
                    )}
                  </button>

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Read Article
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Empty State */}
      {resources.length === 0 && !isSearching && (
        <div className="bg-white/5 rounded-xl p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">Start Your Learning Journey</h3>
          <p className="text-slate-500 mb-6">Search for topics you want to learn about and get AI-powered summaries</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSearchQuery(topic);
                  handleSearch();
                }}
                className="text-sm bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-500/50 px-4 py-2 rounded-lg transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningAgent;

