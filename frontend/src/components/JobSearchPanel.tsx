import React, { useState } from 'react';
import { Upload, Search, Briefcase, CheckCircle, AlertCircle, Sliders, StopCircle } from 'lucide-react';
import { extractTextFromFile } from '../utils/fileParser';
import { JobSearchFilters } from '../types';

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
    industry: 'any',
    salaryMin: undefined,
    salaryMax: undefined,
    experienceLevel: 'any',
    jobType: 'any'
  });

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
      console.error('Error reading file:', err);
      setError(err.message || 'Failed to read file. Please try pasting your CV text instead.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeCV = async () => {
    if (!cvText) return;

    setUploading(true);
    try {
      const response = await fetch('http://localhost:5000/api/jobs/cv/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText })
      });

      const data = await response.json();
      setCVData(data.cvData);
      onCVUploaded(data);
    } catch (error: any) {
      console.error('Error uploading CV:', error);
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

  const getLocationFromGPS = () => {
    setUseGPS(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Use reverse geocoding to get city name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || '';
            const country = data.address.country || '';
            setLocation(`${city}, ${country}`);
            setUseGPS(false);
          } catch (error) {
            console.error('Error getting location name:', error);
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
            setUseGPS(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enter it manually.');
          setUseGPS(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setUseGPS(false);
    }
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

          <textarea
            value={cvText}
            onChange={(e) => setCVText(e.target.value)}
            placeholder="Paste your CV text here...&#10;&#10;Include:&#10;- Name and contact info&#10;- Skills (Node.js, React, Python, etc.)&#10;- Work experience&#10;- Education"
            className="w-full h-48 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 resize-none"
          />

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
              {/* Company Size */}
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Company Size</label>
                <select
                  value={filters.companySize}
                  onChange={(e) => setFilters({ ...filters, companySize: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="any">Any Size</option>
                  <option value="startup">Startup (1-50)</option>
                  <option value="midsize">Mid-size (51-500)</option>
                  <option value="enterprise">Enterprise (500+)</option>
                </select>
              </div>

              {/* Industry */}
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Industry</label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters({ ...filters, industry: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="any">Any Industry</option>
                  <option value="fintech">FinTech</option>
                  <option value="cybersecurity">Cyber Security</option>
                  <option value="healthtech">HealthTech</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="saas">SaaS</option>
                  <option value="ai">AI/ML</option>
                  <option value="gaming">Gaming</option>
                </select>
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
