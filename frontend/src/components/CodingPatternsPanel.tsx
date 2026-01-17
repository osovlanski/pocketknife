/**
 * Coding Patterns Panel Component
 * 
 * Displays coding patterns, cheat sheets, and algorithm concepts
 * for interview preparation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Search, 
  Code2, 
  Clock, 
  Database, 
  ChevronRight, 
  ChevronDown,
  Lightbulb,
  AlertTriangle,
  Copy,
  Check,
  Filter,
  Sparkles,
  Target,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { 
  getCodingPatterns, 
  getSuggestedProblems,
  CodingPattern, 
  SuggestionsResponse 
} from '../services/problemSolvingApi';

interface CodingPatternsPanelProps {
  onSelectProblem?: (problem: { title: string; hint: string }) => void;
}

const CodingPatternsPanel: React.FC<CodingPatternsPanelProps> = ({ onSelectProblem }) => {
  const [patterns, setPatterns] = useState<CodingPattern[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<CodingPattern | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [codeLanguage, setCodeLanguage] = useState<'javascript' | 'python'>('javascript');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['whenToUse', 'template']));
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Category icons
  const categoryIcons: Record<string, string> = {
    array: '📊',
    string: '📝',
    tree: '🌳',
    graph: '🔗',
    dp: '🧮',
    math: '🔢',
    design: '🏗️',
    binary: '🔍',
    linkedlist: '⛓️',
    stack: '📚'
  };

  // Difficulty colors
  const difficultyColors: Record<string, string> = {
    Easy: 'text-green-400 bg-green-500/20 border-green-500/50',
    Medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    Hard: 'text-red-400 bg-red-500/20 border-red-500/50'
  };

  // Load patterns
  const loadPatterns = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { category?: string; difficulty?: string; search?: string } = {};
      
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty;
      if (searchQuery.trim()) params.search = searchQuery;

      const data = await getCodingPatterns(params);
      setPatterns(data.patterns);
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true);
      const data = await getSuggestedProblems();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  // Copy template to clipboard
  const handleCopyTemplate = async () => {
    if (!selectedPattern) return;
    const template = selectedPattern.template[codeLanguage];
    await navigator.clipboard.writeText(template);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Section header component
  const SectionHeader: React.FC<{ 
    id: string; 
    title: string; 
    icon: React.ReactNode;
    count?: number;
  }> = ({ id, title, icon, count }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-2 px-1 hover:bg-white/5 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        {count !== undefined && (
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {expandedSections.has(id) ? (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold">Coding Patterns & Cheat Sheet</h2>
              <p className="text-sm text-slate-400">Master common algorithmic patterns for interviews</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowSuggestions(!showSuggestions);
              if (!suggestions) loadSuggestions();
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showSuggestions 
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' 
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            <Target className="w-4 h-4" />
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPatterns()}
              placeholder="Search patterns..."
              className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {categoryIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
          >
            <option value="all">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Suggestions Panel */}
      {showSuggestions && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Personalized Suggestions
            </h3>
            <button
              onClick={loadSuggestions}
              disabled={isLoadingSuggestions}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingSuggestions ? (
            <div className="flex items-center gap-2 text-slate-400 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading your learning progress...
            </div>
          ) : suggestions ? (
            <div className="space-y-4">
              {/* Recommendation */}
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-sm text-slate-200">
                  <Sparkles className="w-4 h-4 inline mr-1 text-amber-400" />
                  {suggestions.recommendation}
                </p>
              </div>

              {/* Statistics */}
              {suggestions.statistics.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {suggestions.statistics.map(stat => (
                    <div key={stat.difficulty} className="bg-white/5 rounded-lg p-2 text-center">
                      <div className={`text-sm font-bold ${
                        stat.difficulty === 'Easy' ? 'text-green-400' :
                        stat.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {stat._avg.score?.toFixed(0) || '--'}%
                      </div>
                      <div className="text-xs text-slate-400">
                        {stat.difficulty} ({stat._count})
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Weak problems */}
              {suggestions.weakProblems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Problems to Practice:</h4>
                  <div className="space-y-1">
                    {suggestions.weakProblems.slice(0, 5).map(problem => (
                      <div 
                        key={problem.problemId}
                        className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm"
                      >
                        <span>{problem.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${
                            (problem.score || 0) < 50 ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {problem.score || 0}%
                          </span>
                          <span className="text-xs text-slate-500">
                            {problem.attempts} attempts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested patterns */}
              {suggestions.suggestedPatterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Patterns to Study:</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.suggestedPatterns.map(pattern => (
                      <button
                        key={pattern.id}
                        onClick={() => setSelectedPattern(pattern)}
                        className="text-xs bg-purple-500/20 border border-purple-500/50 px-2 py-1 rounded-full hover:bg-purple-500/30 transition-colors"
                      >
                        {categoryIcons[pattern.category]} {pattern.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Solve some problems first to get personalized suggestions!
            </p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100vh-380px)] min-h-[500px]">
        {/* Pattern List */}
        <div className="w-80 flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {isLoading ? 'Loading...' : `${patterns.length} Patterns`}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : patterns.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No patterns found</p>
              </div>
            ) : (
              patterns.map(pattern => (
                <button
                  key={pattern.id}
                  onClick={() => setSelectedPattern(pattern)}
                  className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedPattern?.id === pattern.id ? 'bg-purple-500/20 border-l-2 border-l-purple-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{categoryIcons[pattern.category]}</span>
                    <span className="font-medium text-sm truncate">{pattern.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${difficultyColors[pattern.difficulty]}`}>
                      {pattern.difficulty}
                    </span>
                    <span className="text-[10px] text-slate-500">{pattern.category}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Pattern Details */}
        {selectedPattern ? (
          <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white/5 px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryIcons[selectedPattern.category]}</span>
                  <div>
                    <h3 className="text-xl font-bold">{selectedPattern.name}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-0.5 rounded border ${difficultyColors[selectedPattern.difficulty]}`}>
                        {selectedPattern.difficulty}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Clock className="w-3 h-3" />
                        {selectedPattern.timeComplexity}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <Database className="w-3 h-3" />
                        {selectedPattern.spaceComplexity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Description */}
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-sm text-slate-200 leading-relaxed">{selectedPattern.description}</p>
              </div>

              {/* When to Use */}
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <SectionHeader 
                  id="whenToUse" 
                  title="When to Use" 
                  icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
                  count={selectedPattern.whenToUse.length}
                />
                {expandedSections.has('whenToUse') && (
                  <div className="px-4 pb-3">
                    <ul className="space-y-1">
                      {selectedPattern.whenToUse.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-amber-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Key Indicators */}
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <SectionHeader 
                  id="keyIndicators" 
                  title="Key Indicators" 
                  icon={<Search className="w-4 h-4 text-blue-400" />}
                  count={selectedPattern.keyIndicators.length}
                />
                {expandedSections.has('keyIndicators') && (
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedPattern.keyIndicators.map((indicator, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs bg-blue-500/20 border border-blue-500/50 px-2 py-1 rounded-full text-blue-300"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Template */}
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                  <SectionHeader 
                    id="template" 
                    title="Code Template" 
                    icon={<Code2 className="w-4 h-4 text-green-400" />}
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value as 'javascript' | 'python')}
                      className="bg-white/5 border border-white/20 rounded px-2 py-1 text-xs"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                    </select>
                    <button
                      onClick={handleCopyTemplate}
                      className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-xs transition-colors"
                    >
                      {copiedTemplate ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {expandedSections.has('template') && (
                  <div className="h-64">
                    <Editor
                      height="100%"
                      language={codeLanguage}
                      value={selectedPattern.template[codeLanguage]}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false
                      }}
                      theme="vs-dark"
                    />
                  </div>
                )}
              </div>

              {/* Example Problems */}
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <SectionHeader 
                  id="examples" 
                  title="Example Problems" 
                  icon={<Target className="w-4 h-4 text-purple-400" />}
                  count={selectedPattern.examples.length}
                />
                {expandedSections.has('examples') && (
                  <div className="px-4 pb-3 space-y-2">
                    {selectedPattern.examples.map((example, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => onSelectProblem?.({ title: example.problem, hint: example.hint })}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{example.problem}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-400">{example.hint}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common Mistakes */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg overflow-hidden">
                <SectionHeader 
                  id="mistakes" 
                  title="Common Mistakes" 
                  icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                  count={selectedPattern.commonMistakes.length}
                />
                {expandedSections.has('mistakes') && (
                  <div className="px-4 pb-3">
                    <ul className="space-y-1">
                      {selectedPattern.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-300">
                          <span>⚠️</span>
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg overflow-hidden">
                <SectionHeader 
                  id="tips" 
                  title="Pro Tips" 
                  icon={<Sparkles className="w-4 h-4 text-green-400" />}
                  count={selectedPattern.tips.length}
                />
                {expandedSections.has('tips') && (
                  <div className="px-4 pb-3">
                    <ul className="space-y-1">
                      {selectedPattern.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-green-300">
                          <span>💡</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Related Patterns */}
              {selectedPattern.relatedPatterns.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Related Patterns:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPattern.relatedPatterns.map(patternId => {
                      const related = patterns.find(p => p.id === patternId);
                      if (!related) return null;
                      return (
                        <button
                          key={patternId}
                          onClick={() => setSelectedPattern(related)}
                          className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded-full transition-colors"
                        >
                          {categoryIcons[related.category]} {related.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white/5 rounded-xl border border-white/20">
            <div className="text-center text-slate-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a pattern to view details</p>
              <p className="text-sm">Master common algorithms and data structures</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingPatternsPanel;



