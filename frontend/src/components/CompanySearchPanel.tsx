import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Building2, 
  MapPin, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Globe, 
  Star,
  ExternalLink,
  Briefcase,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown
} from 'lucide-react';
import VoiceInputButton from './common/VoiceInputButton';
import { API_BASE_URL } from '../config';
import { useTranslation } from '../i18n';
import logger from '../services/logger';

// Filter options
type CompanySizeFilter = 'any' | 'startup' | 'midsize' | 'enterprise';
type SortOption = 'name' | 'score' | 'employees' | 'founded';
type SortDirection = 'asc' | 'desc';

interface CompanyFilters {
  companySizes: CompanySizeFilter[];
  industries: string[];
  foundedAfter?: number;
  foundedBefore?: number;
  minScore?: number;
  maxScore?: number;
}

const COMPANY_SIZE_OPTIONS: { value: CompanySizeFilter; label: string; emoji: string; range: string }[] = [
  { value: 'startup', label: 'Startup', emoji: '🚀', range: '1-50' },
  { value: 'midsize', label: 'Mid-size', emoji: '🏢', range: '51-500' },
  { value: 'enterprise', label: 'Enterprise', emoji: '🏛️', range: '500+' },
];

const INDUSTRY_OPTIONS = [
  { value: 'fintech', label: 'FinTech', emoji: '💰' },
  { value: 'cybersecurity', label: 'Cyber Security', emoji: '🔒' },
  { value: 'healthtech', label: 'HealthTech', emoji: '🏥' },
  { value: 'ecommerce', label: 'E-Commerce', emoji: '🛒' },
  { value: 'saas', label: 'SaaS', emoji: '☁️' },
  { value: 'ai', label: 'AI/ML', emoji: '🤖' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'devtools', label: 'DevTools', emoji: '🛠️' },
  { value: 'edtech', label: 'EdTech', emoji: '📚' },
  { value: 'proptech', label: 'PropTech', emoji: '🏠' },
  { value: 'insurtech', label: 'InsurTech', emoji: '📋' },
  { value: 'cleantech', label: 'CleanTech', emoji: '🌱' },
  { value: 'automotive', label: 'Automotive', emoji: '🚗' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Company Score' },
  { value: 'name', label: 'Company Name' },
  { value: 'employees', label: 'Employee Count' },
  { value: 'founded', label: 'Year Founded' },
];

interface CompanyInfo {
  name: string;
  description?: string;
  industry?: string;
  size?: string;
  founded?: string;
  isPublic?: boolean;
  stockSymbol?: string;
  fundingStage?: string;
  totalFunding?: string;
  employeeCount?: string;
  employeeCountMin?: number;
  employeeCountMax?: number;
  headquarters?: string;
  website?: string;
  growthScore?: number;
  heatScore?: number;
  companyScore?: number;
  glassdoorRating?: number;
  crunchbaseUrl?: string;
  linkedinUrl?: string;
}

interface Job {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  applyUrl: string;
  salary?: string;
  postedAt: string;
  matchScore?: number;
}

interface CompanySuggestion {
  name: string;
  industry?: string;
  size?: string;
}

interface CompanySearchPanelProps {
  onJobsFound?: (jobs: Job[]) => void;
}

// Trending period type
type TrendingPeriod = 'day' | 'week' | 'month' | 'year';

interface TrendingCompany {
  name: string;
  industry?: string;
  size?: string;
  score?: number;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

const CompanySearchPanel: React.FC<CompanySearchPanelProps> = ({ onJobsFound }) => {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [searching, setSearching] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Trending companies state
  const [trendingCompanies, setTrendingCompanies] = useState<TrendingCompany[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [activeTrendingPeriod, setActiveTrendingPeriod] = useState<TrendingPeriod | null>(null);
  
  // Filter and sort state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CompanyFilters>({
    companySizes: [],
    industries: [],
    foundedAfter: undefined,
    foundedBefore: undefined,
    minScore: undefined,
    maxScore: undefined,
  });
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch trending companies
  const fetchTrendingCompanies = async (period: TrendingPeriod) => {
    setLoadingTrending(true);
    setActiveTrendingPeriod(period);
    setTrendingCompanies([]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/companies/trending?period=${period}`);
      const data = await response.json();
      
      if (data.success && data.companies) {
        setTrendingCompanies(data.companies);
      } else {
        logger.warn('No trending companies found', { period });
      }
    } catch (err: any) {
      logger.error('Failed to fetch trending companies', { error: err.message });
    } finally {
      setLoadingTrending(false);
    }
  };

  // Handle clicking on a trending company
  const handleTrendingCompanyClick = (company: TrendingCompany) => {
    setCompanyName(company.name);
    setTrendingCompanies([]);
    setActiveTrendingPeriod(null);
    // Auto-search
    setTimeout(() => {
      const searchBtn = document.querySelector('[aria-label="Search company"]') as HTMLButtonElement;
      if (searchBtn) searchBtn.click();
    }, 100);
  };

  // Toggle company size filter
  const handleSizeToggle = (size: CompanySizeFilter) => {
    const currentSizes = filters.companySizes || [];
    if (currentSizes.includes(size)) {
      setFilters({ ...filters, companySizes: currentSizes.filter(s => s !== size) });
    } else {
      setFilters({ ...filters, companySizes: [...currentSizes, size] });
    }
  };

  // Toggle industry filter
  const handleIndustryToggle = (industry: string) => {
    const currentIndustries = filters.industries || [];
    if (currentIndustries.includes(industry)) {
      setFilters({ ...filters, industries: currentIndustries.filter(i => i !== industry) });
    } else {
      setFilters({ ...filters, industries: [...currentIndustries, industry] });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      companySizes: [],
      industries: [],
      foundedAfter: undefined,
      foundedBefore: undefined,
      minScore: undefined,
      maxScore: undefined,
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.companySizes.length > 0) count += filters.companySizes.length;
    if (filters.industries.length > 0) count += filters.industries.length;
    if (filters.foundedAfter) count++;
    if (filters.foundedBefore) count++;
    if (filters.minScore) count++;
    if (filters.maxScore) count++;
    return count;
  }, [filters]);

  // Filter and sort suggestions
  const filteredSuggestions = useMemo(() => {
    let result = [...suggestions];
    
    // Filter by company size
    if (filters.companySizes.length > 0) {
      result = result.filter(s => {
        if (!s.size) return true; // Include if no size info
        const sizeMap: Record<string, CompanySizeFilter[]> = {
          'startup': ['startup'],
          'midsize': ['midsize'],
          'enterprise': ['enterprise'],
          'small': ['startup'],
          'medium': ['midsize'],
          'large': ['enterprise'],
        };
        const normalizedSize = s.size.toLowerCase();
        const matchingSizes = sizeMap[normalizedSize] || [];
        return filters.companySizes.some(f => matchingSizes.includes(f));
      });
    }
    
    // Filter by industry
    if (filters.industries.length > 0) {
      result = result.filter(s => {
        if (!s.industry) return true; // Include if no industry info
        const industryLower = s.industry.toLowerCase();
        return filters.industries.some(f => industryLower.includes(f.toLowerCase()));
      });
    }
    
    return result;
  }, [suggestions, filters]);

  // Fetch company suggestions for autocomplete
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (companyName.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        // Build query params with filters
        const params = new URLSearchParams();
        params.set('prefix', companyName);
        if (filters.companySizes.length > 0) {
          params.set('sizes', filters.companySizes.join(','));
        }
        if (filters.industries.length > 0) {
          params.set('industries', filters.industries.join(','));
        }
        
        const response = await fetch(`${API_BASE_URL}/jobs/companies/list?${params.toString()}`);
        const data = await response.json();
        if (data.success && data.companies) {
          setSuggestions(data.companies);
        }
      } catch (err) {
        // Silently fail for autocomplete
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [companyName, filters.companySizes, filters.industries]);

  const handleSearch = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setError('');
    setSearching(true);
    setCompanyInfo(null);
    setJobs([]);
    setShowSuggestions(false);

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/company/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, includeJobs: true })
      });

      const data = await response.json();

      if (data.success) {
        setCompanyInfo(data.company);
        setJobs(data.jobs || []);
        
        if (onJobsFound && data.jobs?.length > 0) {
          onJobsFound(data.jobs);
        }
      } else {
        setError(data.error || 'Failed to search company');
      }
    } catch (err: any) {
      logger.error('Company search error', { error: err.message });
      setError(err.message || 'Failed to search company');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (suggestion: CompanySuggestion) => {
    setCompanyName(suggestion.name);
    setShowSuggestions(false);
    // Auto-search when selecting from suggestions
    setTimeout(() => handleSearch(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const renderScoreBars = (score?: number, max = 10) => {
    const bars = [];
    const value = score || 0;
    for (let i = 1; i <= max; i++) {
      bars.push(
        <div
          key={i}
          className={`w-2 h-3 rounded-sm ${
            i <= value ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-slate-700'
          }`}
        />
      );
    }
    return <div className="flex gap-0.5">{bars}</div>;
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Building2 className="w-6 h-6" />
        Company Search
      </h2>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Enter company name (e.g., Wix, Monday.com, Stripe)"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
                aria-label="Company name input"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  onTranscript={(text) => setCompanyName(text)}
                  size="sm"
                  title="Speak company name"
                  ariaLabel="Voice input for company name"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !companyName.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              aria-label="Search company"
            >
              {searching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all font-medium ${
                showFilters || activeFilterCount > 0
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/20'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Filter Companies</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear all
                  </button>
                )}
              </div>

              {/* Company Size Filter */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Company Size</label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSizeToggle(option.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        filters.companySizes.includes(option.value)
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-400'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                      <span className="text-xs text-slate-500">({option.range})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry Filter */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Industries</label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleIndustryToggle(option.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        filters.industries.includes(option.value)
                          ? 'bg-blue-500/30 text-blue-300 border border-blue-400'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Score and Year Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Min Score (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={filters.minScore || ''}
                    onChange={(e) => setFilters({ ...filters, minScore: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Min"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Max Score (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={filters.maxScore || ''}
                    onChange={(e) => setFilters({ ...filters, maxScore: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Max"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Founded After</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={filters.foundedAfter || ''}
                    onChange={(e) => setFilters({ ...filters, foundedAfter: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Year"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Founded Before</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={filters.foundedBefore || ''}
                    onChange={(e) => setFilters({ ...filters, foundedBefore: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Year"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-sm text-slate-400 mb-2">Sort Results By</label>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (sortBy === option.value) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(option.value);
                          setSortDirection('desc');
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        sortBy === option.value
                          ? 'bg-green-500/30 text-green-300 border border-green-400'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <ArrowUpDown className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Autocomplete Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between"
                  tabIndex={0}
                >
                  <div>
                    <span className="text-white font-medium">{suggestion.name}</span>
                    {suggestion.industry && (
                      <span className="text-slate-400 text-sm ml-2">• {suggestion.industry}</span>
                    )}
                  </div>
                  {suggestion.size && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      suggestion.size === 'startup' ? 'bg-green-500/20 text-green-300' :
                      suggestion.size === 'midsize' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {suggestion.size}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Trending Companies Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Trending Companies
          </h3>
          <div className="flex gap-2">
            {(['day', 'week', 'month', 'year'] as TrendingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => fetchTrendingCompanies(period)}
                disabled={loadingTrending}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTrendingPeriod === period
                    ? 'bg-green-500/30 text-green-300 border border-green-400'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 border border-white/10'
                }`}
              >
                {loadingTrending && activeTrendingPeriod === period ? (
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  period === 'day' ? 'Today' :
                  period === 'week' ? 'This Week' :
                  period === 'month' ? 'This Month' : 'This Year'
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Companies List */}
        {trendingCompanies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingCompanies.map((company, idx) => (
              <button
                key={idx}
                onClick={() => handleTrendingCompanyClick(company)}
                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-400/50 rounded-lg transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">{company.name}</span>
                    {company.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    {company.industry && <span>{company.industry}</span>}
                    {company.size && (
                      <span className={`px-1.5 py-0.5 rounded ${
                        company.size === 'startup' ? 'bg-green-500/20 text-green-300' :
                        company.size === 'midsize' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {company.size}
                      </span>
                    )}
                  </div>
                </div>
                {company.score && (
                  <div className="text-right ml-2">
                    <div className={`text-lg font-bold ${
                      company.score >= 80 ? 'text-green-400' :
                      company.score >= 60 ? 'text-yellow-400' :
                      'text-slate-400'
                    }`}>
                      {company.score}
                    </div>
                    {company.changePercent !== undefined && (
                      <div className={`text-xs ${company.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {company.changePercent >= 0 ? '+' : ''}{company.changePercent}%
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Company Info Card */}
      {companyInfo && (
        <div className="mb-6 bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-6 border border-slate-600/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                {companyInfo.name}
                {companyInfo.isPublic && companyInfo.stockSymbol && (
                  <span className="text-sm bg-green-500/20 text-green-300 px-2 py-1 rounded">
                    📈 {companyInfo.stockSymbol}
                  </span>
                )}
              </h3>
              {companyInfo.description && (
                <p className="text-slate-300 mt-2 text-sm">{companyInfo.description}</p>
              )}
            </div>
            {companyInfo.companyScore && (
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(companyInfo.companyScore)}`}>
                  {companyInfo.companyScore}
                </div>
                <div className="text-xs text-slate-400">Company Score</div>
              </div>
            )}
          </div>

          {/* Company Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {companyInfo.industry && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Industry
                </div>
                <div className="text-sm text-white font-medium mt-1">{companyInfo.industry}</div>
              </div>
            )}
            
            {companyInfo.employeeCount && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Employees
                </div>
                <div className="text-sm text-white font-medium mt-1">{companyInfo.employeeCount}</div>
              </div>
            )}
            
            {companyInfo.headquarters && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Headquarters
                </div>
                <div className="text-sm text-white font-medium mt-1">{companyInfo.headquarters}</div>
              </div>
            )}
            
            {companyInfo.founded && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Founded
                </div>
                <div className="text-sm text-white font-medium mt-1">{companyInfo.founded}</div>
              </div>
            )}
          </div>

          {/* Funding & Rating Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            {companyInfo.fundingStage && (
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-sm">
                📊 {companyInfo.fundingStage}
              </span>
            )}
            {companyInfo.totalFunding && (
              <span className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {companyInfo.totalFunding}
              </span>
            )}
            {companyInfo.glassdoorRating && (
              <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                <Star className="w-3 h-3" />
                {companyInfo.glassdoorRating}/5 Glassdoor
              </span>
            )}
            {companyInfo.size && (
              <span className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                companyInfo.size === 'startup' ? 'bg-green-500/20 text-green-300' :
                companyInfo.size === 'midsize' ? 'bg-blue-500/20 text-blue-300' :
                'bg-purple-500/20 text-purple-300'
              }`}>
                {companyInfo.size}
              </span>
            )}
          </div>

          {/* Growth & Heat Scores */}
          {(companyInfo.growthScore || companyInfo.heatScore) && (
            <div className="flex gap-6 pt-4 border-t border-slate-600/50">
              {companyInfo.growthScore && (
                <div className="flex items-center gap-3">
                  <TrendingUp className={`w-5 h-5 ${getScoreColor(companyInfo.growthScore * 10)}`} />
                  <div>
                    <span className="text-xs text-slate-400">Growth Potential:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {renderScoreBars(companyInfo.growthScore)}
                      <span className={`text-sm font-bold ${getScoreColor(companyInfo.growthScore * 10)}`}>
                        {companyInfo.growthScore}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {companyInfo.heatScore && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div>
                    <span className="text-xs text-slate-400">Heat Score:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {renderScoreBars(companyInfo.heatScore)}
                      <span className={`text-sm font-bold ${getScoreColor(companyInfo.heatScore * 10)}`}>
                        {companyInfo.heatScore}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* External Links */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-600/50">
            {companyInfo.website && (
              <a
                href={companyInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {companyInfo.crunchbaseUrl && (
              <a
                href={companyInfo.crunchbaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Crunchbase
              </a>
            )}
            {companyInfo.linkedinUrl && (
              <a
                href={companyInfo.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                LinkedIn
              </a>
            )}
          </div>
        </div>
      )}

      {/* Job Openings */}
      {jobs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Open Positions ({jobs.length})
          </h3>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{job.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                        {job.remote && ' • Remote'}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {job.description?.substring(0, 150)}...
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                    {job.source}
                  </span>
                  <span className="text-xs text-slate-500">
                    Posted {new Date(job.postedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {companyInfo && jobs.length === 0 && !searching && (
        <div className="text-center py-8 bg-white/5 rounded-lg">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-slate-400">No job openings found for {companyInfo.name}</p>
          <p className="text-sm text-slate-500 mt-1">Check their careers page directly for more opportunities</p>
        </div>
      )}
    </div>
  );
};

export default CompanySearchPanel;
