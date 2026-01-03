import React, { useState, useEffect } from 'react';
import { ExternalLink, MapPin, Building2, DollarSign, Calendar, ChevronDown, ChevronUp, TrendingUp, Users, Globe, Briefcase } from 'lucide-react';

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
  headquarters?: string;
  growthScore?: number;
  heatScore?: number;
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
  matchedSkills?: string[];
  missingSkills?: string[];
  reasoning?: string;
}

interface JobListingsProps {
  jobs: Job[];
}

const JobListings: React.FC<JobListingsProps> = ({ jobs }) => {
  const [companyInfo, setCompanyInfo] = useState<Record<string, CompanyInfo>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [loadingCompanies, setLoadingCompanies] = useState<Set<string>>(new Set());

  // Fetch company info when jobs change
  useEffect(() => {
    const uniqueCompanies = [...new Set(jobs.map(j => j.company))];
    const newCompanies = uniqueCompanies.filter(c => !companyInfo[c] && !loadingCompanies.has(c));
    
    if (newCompanies.length > 0) {
      // Batch fetch company info
      fetchCompanyInfo(newCompanies.slice(0, 10)); // Limit to 10 at a time
    }
  }, [jobs]);

  const fetchCompanyInfo = async (companies: string[]) => {
    setLoadingCompanies(prev => new Set([...prev, ...companies]));
    
    try {
      const response = await fetch('http://localhost:5000/api/jobs/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.companies) {
          setCompanyInfo(prev => ({ ...prev, ...data.companies }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    } finally {
      setLoadingCompanies(prev => {
        const newSet = new Set(prev);
        companies.forEach(c => newSet.delete(c));
        return newSet;
      });
    }
  };

  const toggleCompanyDetails = (companyName: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyName)) {
        newSet.delete(companyName);
      } else {
        newSet.add(companyName);
      }
      return newSet;
    });
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const renderHeatBars = (score?: number) => {
    const bars = [];
    for (let i = 1; i <= 10; i++) {
      bars.push(
        <div
          key={i}
          className={`w-2 h-3 rounded-sm ${
            score && i <= score ? 'bg-gradient-to-t from-orange-500 to-yellow-400' : 'bg-slate-700'
          }`}
        />
      );
    }
    return <div className="flex gap-0.5">{bars}</div>;
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
        <div className="animate-pulse mb-4">
          <div className="text-6xl mb-4">🔍</div>
        </div>
        <p className="text-slate-400 text-lg">Waiting for job matches...</p>
        <p className="text-slate-500 text-sm mt-2">Jobs with 75%+ match will appear here in real-time!</p>
      </div>
    );
  }

  const getMatchColor = (score?: number) => {
    if (!score) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const getMatchEmoji = (score?: number) => {
    if (!score) return '❓';
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">🎯 Live Job Matches ({jobs.length})</h2>
          <p className="text-sm text-slate-400 mt-1">
            ✨ Jobs appear instantly as they're analyzed • 75%+ match threshold
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1">
            🟢 Excellent (80%+): {jobs.filter(j => (j.matchScore || 0) >= 80).length}
          </span>
          <span className="flex items-center gap-1">
            🟡 Good (60-80%): {jobs.filter(j => (j.matchScore || 0) >= 60 && (j.matchScore || 0) < 80).length}
          </span>
          <span className="flex items-center gap-1">
            🔴 Fair (&lt;60%): {jobs.filter(j => (j.matchScore || 0) < 60).length}
          </span>
        </div>
      </div>

      {jobs.map((job, index) => {
        const company = companyInfo[job.company];
        const isExpanded = expandedCompanies.has(job.company);
        const isLoading = loadingCompanies.has(job.company);

        return (
          <div
            key={job.id}
            className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all hover:scale-[1.01] animate-fadeIn ${
              (job.matchScore || 0) >= 80
                ? 'border-green-500/30 hover:border-green-500/50'
                : (job.matchScore || 0) >= 60
                ? 'border-yellow-500/30 hover:border-yellow-500/50'
                : 'border-white/20 hover:border-white/30'
            }`}
            style={{
              animationDelay: `${index * 0.05}s`
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{job.title}</h3>
                  {job.matchScore && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold border ${getMatchColor(
                        job.matchScore
                      )}`}
                    >
                      {getMatchEmoji(job.matchScore)} {job.matchScore}% Match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <button
                    onClick={() => toggleCompanyDetails(job.company)}
                    className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    {job.company}
                    {company && (
                      isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                    {job.remote && ' • Remote OK'}
                  </span>
                  {job.salary && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {job.salary}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-blue-500/20 px-3 py-1 rounded-full text-xs text-blue-300">
                  {job.source}
                </span>
                {company?.heatScore && company.heatScore >= 7 && (
                  <span className="bg-orange-500/20 px-2 py-0.5 rounded-full text-xs text-orange-300 flex items-center gap-1">
                    🔥 Hot
                  </span>
                )}
              </div>
            </div>

            {/* Company Details Panel */}
            {isExpanded && (
              <div className="mb-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Loading company info...
                  </div>
                ) : company ? (
                  <div className="space-y-3">
                    {/* Company Description */}
                    {company.description && (
                      <p className="text-sm text-slate-300">{company.description}</p>
                    )}
                    
                    {/* Company Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {company.industry && (
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Industry
                          </div>
                          <div className="text-sm text-white font-medium">{company.industry}</div>
                        </div>
                      )}
                      
                      {company.employeeCount && (
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Employees
                          </div>
                          <div className="text-sm text-white font-medium">{company.employeeCount}</div>
                        </div>
                      )}
                      
                      {company.headquarters && (
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            HQ
                          </div>
                          <div className="text-sm text-white font-medium">{company.headquarters}</div>
                        </div>
                      )}
                      
                      {company.founded && (
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xs text-slate-400">Founded</div>
                          <div className="text-sm text-white font-medium">{company.founded}</div>
                        </div>
                      )}
                    </div>

                    {/* Funding & Stock Info */}
                    <div className="flex flex-wrap gap-2">
                      {company.isPublic && company.stockSymbol && (
                        <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                          📈 {company.stockSymbol}
                        </span>
                      )}
                      {company.fundingStage && (
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                          {company.fundingStage}
                        </span>
                      )}
                      {company.totalFunding && (
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                          💰 {company.totalFunding}
                        </span>
                      )}
                      {company.size && (
                        <span className="bg-slate-500/30 text-slate-300 px-2 py-1 rounded text-xs capitalize">
                          {company.size}
                        </span>
                      )}
                    </div>

                    {/* Growth & Heat Scores */}
                    {(company.growthScore || company.heatScore) && (
                      <div className="flex gap-6 pt-2 border-t border-slate-600/50">
                        {company.growthScore && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${getScoreColor(company.growthScore)}`} />
                            <span className="text-xs text-slate-400">Growth:</span>
                            <span className={`text-sm font-bold ${getScoreColor(company.growthScore)}`}>
                              {company.growthScore}/10
                            </span>
                          </div>
                        )}
                        {company.heatScore && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">🔥 Heat:</span>
                            {renderHeatBars(company.heatScore)}
                            <span className={`text-sm font-bold ${getScoreColor(company.heatScore)}`}>
                              {company.heatScore}/10
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No company information available</p>
                )}
              </div>
            )}

            {/* Match Analysis */}
            {job.reasoning && (
              <div className="mb-4 bg-white/5 rounded-lg p-3">
                <p className="text-sm text-slate-300 italic">"{job.reasoning}"</p>
              </div>
            )}

            {/* Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {job.matchedSkills && job.matchedSkills.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">✅ Matched Skills ({job.matchedSkills.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {job.matchedSkills.map((skill, idx) => (
                      <span key={idx} className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.missingSkills && job.missingSkills.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">❌ Missing Skills ({job.missingSkills.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {job.missingSkills.map((skill, idx) => (
                      <span key={idx} className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description Preview */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-3">
              {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                View & Apply
              </a>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Posted {new Date(job.postedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobListings;
