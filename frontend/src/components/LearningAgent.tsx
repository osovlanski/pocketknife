import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, ExternalLink, FileText, Sparkles, RefreshCw, Filter, Tag, Globe, Linkedin, Brain, ChevronDown, ChevronUp, Copy, Check, Newspaper, Crown, Info, Settings } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
  timeRange: 'day' | 'week' | 'month' | 'all';
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
  const [logs, setLogs] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLinkedInInfo, setShowLinkedInInfo] = useState(false);
  const [linkedInInfo, setLinkedInInfo] = useState<LinkedInInfo | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    topics: [],
    sources: ['linkedin', 'devto', 'newsletters', 'hackernews', 'reddit'],
    timeRange: 'week'
  });
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

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

    socketRef.current.on('learning-log', (data: { message: string; type: string }) => {
      addLog(data.message, data.type);
    });

    socketRef.current.on('learning-resource', (resource: LearningResource) => {
      setResources(prev => {
        const exists = prev.some(r => r.id === resource.id);
        if (exists) return prev;
        return [...prev, resource];
      });
    });

    // Fetch LinkedIn integration info
    fetchLinkedInInfo();

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

  const addLog = (message: string, type = 'info') => {
    setLogs(prev => [...prev, {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }].slice(-50));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addLog('Please enter a search topic', 'warning');
      return;
    }

    try {
      setIsSearching(true);
      setResources([]);
      addLog(`🔍 Searching for "${searchQuery}"...`, 'info');

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
        addLog(`❌ Error: ${data.error}`, 'error');
        return;
      }

      setResources(data.resources || []);
      addLog(`✅ Found ${data.resources?.length || 0} learning resources`, 'success');
    } catch (error: any) {
      addLog(`❌ Search failed: ${error.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSummarize = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    setResources(prev => prev.map(r =>
      r.id === resourceId ? { ...r, isSummarizing: true } : r
    ));

    try {
      addLog(`📝 Summarizing "${resource.title}"...`, 'info');

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
        addLog(`✅ Summary generated for "${resource.title}"`, 'success');
      }
    } catch (error: any) {
      addLog(`❌ Failed to summarize: ${error.message}`, 'error');
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
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for topics (e.g., 'TypeScript best practices', 'system design')"
              className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
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
            {['day', 'week', 'month', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setFilters(prev => ({ ...prev, timeRange: range as any }))}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filters.timeRange === range
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border border-white/20 text-slate-400 hover:text-white'
                }`}
              >
                {range === 'day' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

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
                <div className="flex items-center gap-2">
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

      {/* Activity Log */}
      {logs.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded-lg ${
                  log.type === 'success' ? 'bg-green-500/20 text-green-200' :
                  log.type === 'error' ? 'bg-red-500/20 text-red-200' :
                  log.type === 'warning' ? 'bg-yellow-500/20 text-yellow-200' :
                  'bg-blue-500/20 text-blue-200'
                }`}
              >
                <span className="text-slate-400 text-xs mr-2">[{log.timestamp}]</span>
                {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
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

