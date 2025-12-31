import React from 'react';
import { ExternalLink, MapPin, Building2, DollarSign, Calendar } from 'lucide-react';

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

      {jobs.map((job, index) => (
        <div
          key={job.id}
          className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all hover:scale-[1.02] animate-fadeIn ${
            (job.matchScore || 0) >= 80
              ? 'border-green-500/30 hover:border-green-500/50'
              : (job.matchScore || 0) >= 60
              ? 'border-yellow-500/30 hover:border-yellow-500/50'
              : 'border-white/20 hover:border-white/30'
          }`}
          style={{
            animationDelay: `${index * 0.1}s`
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
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {job.company}
                </span>
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
            <span className="bg-blue-500/20 px-3 py-1 rounded-full text-xs text-blue-300">
              {job.source}
            </span>
          </div>

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
      ))}
    </div>
  );
};

export default JobListings;
