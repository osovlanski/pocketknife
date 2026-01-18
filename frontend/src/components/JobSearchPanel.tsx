import React, { useState } from 'react';
import { Upload, Search, Briefcase, CheckCircle, AlertCircle, Sliders, StopCircle } from 'lucide-react';
import VoiceInputButton from './common/VoiceInputButton';
import { extractTextFromFile } from '../utils/fileParser';
import { JobSearchFilters, IndustryType, CompanySizeType } from '../types';
import { API_BASE_URL } from '../config';
import logger from '../services/logger';

// Available company sizes for selection
const AVAILABLE_COMPANY_SIZES: { value: CompanySizeType; label: string; emoji: string }[] = [
  { value: 'startup', label: 'Startup (1-50)', emoji: '🚀' },
  { value: 'midsize', label: 'Mid-size (51-500)', emoji: '🏢' },
  { value: 'enterprise', label: 'Enterprise (500+)', emoji: '🏛️' },
];

// Available industries for selection
const AVAILABLE_INDUSTRIES: { value: IndustryType; label: string; emoji: string }[] = [
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

interface JobSearchPanelProps {
  onCVUploaded: (cvData: any) => void;
  onSearch: (location?: string, remoteOnly?: boolean, filters?: JobSearchFilters) => void;
  onStop?: () => void;
  isSearching?: boolean;
  isStopping?: boolean;
}

const JobSearchPanel: React.FC<JobSearchPanelProps> = ({ onCVUploaded, onSearch, onStop, isSearching: externalSearching, isStopping = false }) => {
  const [cvText, setCVText] = useState('');
  const [cvData, setCVData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState<boolean | undefined>(false); // Default: Office Only
  const [useGPS, setUseGPS] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Use external searching state if provided
  const isCurrentlySearching = externalSearching !== undefined ? externalSearching : searching;
  
  // Advanced filters
  const [filters, setFilters] = useState<JobSearchFilters>({
    companySize: 'any',
    companySizes: [],  // NEW: Multiple company sizes
    industry: 'any',
    industries: [],    // Multiple industries
    salaryMin: undefined,
    salaryMax: undefined,
    experienceLevel: 'any',
    jobType: 'any'
  });
  
  // Toggle company size selection
  const handleCompanySizeToggle = (size: CompanySizeType) => {
    const currentSizes = filters.companySizes || [];
    const isSelected = currentSizes.includes(size);
    
    if (isSelected) {
      setFilters({ 
        ...filters, 
        companySizes: currentSizes.filter(s => s !== size) 
      });
    } else {
      setFilters({ 
        ...filters, 
        companySizes: [...currentSizes, size] 
      });
    }
  };
  
  // Clear all company sizes
  const handleClearCompanySizes = () => {
    setFilters({ ...filters, companySizes: [] });
  };
  
  // Toggle industry selection
  const handleIndustryToggle = (industry: IndustryType) => {
    const currentIndustries = filters.industries || [];
    const isSelected = currentIndustries.includes(industry);
    
    if (isSelected) {
      setFilters({ 
        ...filters, 
        industries: currentIndustries.filter(i => i !== industry) 
      });
    } else {
      setFilters({ 
        ...filters, 
        industries: [...currentIndustries, industry] 
      });
    }
  };
  
  // Clear all industries
  const handleClearIndustries = () => {
    setFilters({ ...filters, industries: [] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const text = await extractTextFromFile(file);
      
      if (!text || text.trim().length < 50) {
        throw new Error('Extracted text is too short. Please check your CV file or paste the text manually.');
      }
      
      setCVText(text);
      setError('');
    } catch (err: any) {
      logger.error('Error reading file', { error: err.message });
      setError(err.message || 'Failed to read file. Please try pasting your CV text instead.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeCV = async () => {
    if (!cvText) return;

    setUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/cv/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText })
      });

      const data = await response.json();
      setCVData(data.cvData);
      onCVUploaded(data);
    } catch (error: any) {
      logger.error('Error uploading CV', { error: error.message });
      alert('Error analyzing CV: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      await onSearch(location, remoteOnly, filters);
    } finally {
      setSearching(false);
    }
  };

  const [gpsError, setGpsError] = useState<string | null>(null);

  const getLocationFromGPS = () => {
    setUseGPS(true);
    setGpsError(null);
    
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser. Please enter location manually.');
      setUseGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use reverse geocoding to get city name
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'Pocketknife/1.0' } }
          );
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
          const country = data.address.country || '';
          setLocation(city && country ? `${city}, ${country}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setGpsError(null);
        } catch (error) {
          logger.error('Error getting location name', { error });
          // Fallback to coordinates
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setUseGPS(false);
      },
      (error) => {
        logger.error('Geolocation error', { code: error.code, message: error.message });
        
        // Provide specific error messages based on error code
        let errorMessage = 'Could not get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please enable location permissions in your browser settings or enter location manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please enter location manually.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or enter location manually.';
            break;
          default:
            errorMessage += 'Please enter location manually.';
        }
        
        setGpsError(errorMessage);
        setUseGPS(false);
      },
      {
        enableHighAccuracy: false, // Don't require GPS, accept network location
        timeout: 10000, // 10 second timeout
        maximumAge: 300000 // Accept cached location up to 5 minutes old
      }
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Briefcase className="w-6 h-6" />
        AI Job Search Agent
      </h2>

      {/* Step 1: Upload CV */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
          Upload Your CV
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="cv-upload"
              />
              <div className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5" />
                <span>{cvText ? '✅ CV loaded' : 'Choose CV file (txt, pdf, doc)'}</span>
              </div>
            </label>
          </div>

          <div className="text-center text-sm text-slate-400">OR</div>

          <div className="relative">
            <textarea
              value={cvText}
              onChange={(e) => setCVText(e.target.value)}
              placeholder="Paste your CV text here...&#10;&#10;Include:&#10;- Name and contact info&#10;- Skills (Node.js, React, Python, etc.)&#10;- Work experience&#10;- Education"
              className="w-full h-48 bg-white/5 border border-white/20 rounded-lg px-4 py-3 pr-14 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 resize-none"
            />
            <div className="absolute top-3 right-3">
              <VoiceInputButton
                onTranscript={(text) => setCVText(prev => prev ? `${prev} ${text}` : text)}
                size="sm"
                title="Speak to add CV content"
                ariaLabel="Voice input for CV"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-semibold mb-2">Error reading file</p>
                <p className="text-red-200 whitespace-pre-line">{error}</p>
                <div className="mt-3 bg-white/5 rounded-lg p-3">
                  <p className="text-slate-300 text-xs font-medium mb-2">💡 Quick fix options:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>Recommended:</strong> Paste your CV text directly in the box above</li>
                    <li>• Upload as .txt or .docx file instead</li>
                    <li>• Open the PDF in a reader, select all (Ctrl+A), copy (Ctrl+C), and paste above</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyzeCV}
            disabled={!cvText || uploading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing CV with AI...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Analyze CV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step 2: CV Analysis Results */}
      {cvData && (
        <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-300">
            <CheckCircle className="w-5 h-5" />
            CV Analyzed Successfully!
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Name:</span>
              <span className="text-white font-semibold">{cvData.name || 'Not found'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Skills Found:</span>
              <span className="text-white font-semibold">{cvData.skills.length} skills</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {cvData.skills.slice(0, 10).map((skill: string, idx: number) => (
                <span key={idx} className="bg-blue-500/30 px-2 py-1 rounded text-xs">
                  {skill}
                </span>
              ))}
              {cvData.skills.length > 10 && (
                <span className="text-slate-400 text-xs">+{cvData.skills.length - 10} more</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400">Suggested Roles:</span>
              <span className="text-white">{cvData.desiredRoles.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Search Jobs */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">
            {cvData ? '2' : '2'}
          </span>
          Search for Jobs
        </h3>
        
        {/* Location Filter */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g., Tel Aviv, Israel)"
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
            />
            <VoiceInputButton
              onTranscript={(text) => setLocation(text)}
              size="sm"
              title="Speak location"
              ariaLabel="Voice input for location"
            />
            <button
              onClick={getLocationFromGPS}
              disabled={useGPS}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {useGPS ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>📍 GPS</>
              )}
            </button>
          </div>
          
          {/* GPS Error Message */}
          {gpsError && (
            <div className="mt-2 p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-sm text-amber-200 flex items-start gap-2">
              <span className="text-amber-400">⚠️</span>
              <div>
                <p>{gpsError}</p>
                <button 
                  onClick={() => setGpsError(null)}
                  className="text-amber-400 hover:text-amber-300 text-xs mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* Work Location Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Work Location</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="workLocation"
                  checked={remoteOnly === undefined}
                  onChange={() => setRemoteOnly(undefined)}
                  className="w-4 h-4"
                />
                <span>All Jobs</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="workLocation"
                  checked={remoteOnly === true}
                  onChange={() => setRemoteOnly(true)}
                  className="w-4 h-4"
                />
                <span>Remote Only</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="workLocation"
                  checked={remoteOnly === false}
                  onChange={() => setRemoteOnly(false)}
                  className="w-4 h-4"
                />
                <span>Office Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-all mb-3 text-sm border border-white/10"
        >
          <Sliders className="w-4 h-4" />
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </button>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Company Size - Multi-select */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300">Company Size (select multiple)</label>
                  {(filters.companySizes?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCompanySizes}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Clear all ({filters.companySizes?.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COMPANY_SIZES.map((size) => {
                    const isSelected = filters.companySizes?.includes(size.value);
                    return (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => handleCompanySizeToggle(size.value)}
                        className={`
                          flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${isSelected 
                            ? 'bg-purple-500 text-white border-purple-400' 
                            : 'bg-white/5 text-slate-300 border-white/20 hover:bg-white/10'
                          }
                          border
                        `}
                        aria-pressed={isSelected}
                        tabIndex={0}
                      >
                        <span>{size.emoji}</span>
                        <span>{size.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(filters.companySizes?.length || 0) === 0 
                    ? '💡 Select company sizes to filter results' 
                    : `Filtering by ${filters.companySizes?.length} company size(s)`
                  }
                </p>
              </div>

              {/* Industry - Multi-select */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300">Industries (select multiple)</label>
                  {(filters.industries?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleClearIndustries}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Clear all ({filters.industries?.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_INDUSTRIES.map((ind) => {
                    const isSelected = filters.industries?.includes(ind.value);
                    return (
                      <button
                        key={ind.value}
                        type="button"
                        onClick={() => handleIndustryToggle(ind.value)}
                        className={`
                          flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${isSelected 
                            ? 'bg-blue-500 text-white border-blue-400' 
                            : 'bg-white/5 text-slate-300 border-white/20 hover:bg-white/10'
                          }
                          border
                        `}
                        aria-pressed={isSelected}
                        tabIndex={0}
                      >
                        <span>{ind.emoji}</span>
                        <span>{ind.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(filters.industries?.length || 0) === 0 
                    ? '💡 Select industries to search with multiple targeted queries' 
                    : `Searching ${filters.industries?.length} industries`
                  }
                </p>
              </div>

              {/* Experience Level */}
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Experience Level</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="any">Any Level</option>
                  <option value="junior">Junior (0-2 years)</option>
                  <option value="mid">Mid-level (3-5 years)</option>
                  <option value="senior">Senior (5+ years)</option>
                </select>
              </div>

              {/* Job Type */}
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Job Type</label>
                <select
                  value={filters.jobType}
                  onChange={(e) => setFilters({ ...filters, jobType: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="any">Any Type</option>
                  <option value="fulltime">Full-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Salary Range (USD/year)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min (e.g., 80000)"
                  value={filters.salaryMin || ''}
                  onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400"
                />
                <input
                  type="number"
                  placeholder="Max (e.g., 150000)"
                  value={filters.salaryMax || ''}
                  onChange={(e) => setFilters({ ...filters, salaryMax: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={!cvData || isCurrentlySearching}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isCurrentlySearching ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching job boards...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Jobs with Filters
              </>
            )}
          </button>
          
          {isCurrentlySearching && onStop && (
            <button
              onClick={onStop}
              disabled={isStopping}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 px-6 py-3 rounded-lg transition-all font-semibold disabled:opacity-50"
              title="Stop Search"
            >
              <StopCircle className="w-5 h-5" />
              Stop
            </button>
          )}
        </div>

        {!cvData && (
          <p className="text-sm text-slate-400 mt-2 text-center">
            Upload and analyze your CV first
          </p>
        )}
      </div>
    </div>
  );
};

export default JobSearchPanel;
