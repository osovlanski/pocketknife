import React, { useState, useEffect } from 'react';
import { X, Copy, Check, RefreshCw, Briefcase, FileText, Mail, Lightbulb, CheckSquare } from 'lucide-react';
import { API_BASE_URL } from '../config';

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

interface ApplicationPackage {
  coverLetter: string;
  emailTemplate: string;
  applicationTips: string[];
  skillGapAdvice: string;
  keyStrengths: string[];
}

interface ApplyAIModalProps {
  job: Job;
  onClose: () => void;
  onMarkedApplied?: (jobId: string) => void;
}

type Tone = 'professional' | 'enthusiastic' | 'concise';
type ActiveTab = 'cover-letter' | 'email' | 'tips';

const ApplyAIModal: React.FC<ApplyAIModalProps> = ({ job, onClose, onMarkedApplied }) => {
  const [tone, setTone] = useState<Tone>('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [applicationPackage, setApplicationPackage] = useState<ApplicationPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cover-letter');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isMarkingApplied, setIsMarkingApplied] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/apply-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobData: job, tone, additionalContext })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setApplicationPackage(data);
      setEditedCoverLetter(data.coverLetter);
      setEditedEmail(data.emailTemplate);
      setActiveTab('cover-letter');
    } catch (err: any) {
      setError(err.message || 'Failed to generate application package');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const markAsApplied = async () => {
    setIsMarkingApplied(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/application/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobData: job,
          status: 'applied',
          appliedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to track application');
      }

      setIsApplied(true);
      onMarkedApplied?.(job.id);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to track application');
    } finally {
      setIsMarkingApplied(false);
    }
  };

  const getMatchColor = (score?: number) => {
    if (!score) return 'bg-gray-500/20 text-gray-300';
    if (score >= 80) return 'bg-green-500/20 text-green-300';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };

  const toneOptions: { value: Tone; label: string; description: string }[] = [
    { value: 'professional', label: 'Professional', description: 'Formal and polished' },
    { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and passionate' },
    { value: 'concise', label: 'Concise', description: 'Brief and to the point' }
  ];

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cover-letter', label: 'Cover Letter', icon: <FileText className="w-4 h-4" /> },
    { id: 'email', label: 'Email Template', icon: <Mail className="w-4 h-4" /> },
    { id: 'tips', label: 'Tips & Insights', icon: <Lightbulb className="w-4 h-4" /> }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/20 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <h2 className="text-lg font-bold text-white truncate">{job.title}</h2>
              {job.matchScore && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${getMatchColor(job.matchScore)}`}>
                  {job.matchScore}% Match
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{job.company} · {job.location}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="space-y-4">
            {/* Tone selector */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Tone</label>
              <div className="flex gap-2">
                {toneOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      tone === option.value
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    <div>{option.label}</div>
                    <div className="text-xs font-normal opacity-70">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional context */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Additional Context <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="e.g. I worked on a similar distributed system at my previous role, specifically handling 10k RPS..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating application package...
                </>
              ) : applicationPackage ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
                  Generate Application Package
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {applicationPackage && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Cover Letter Tab */}
              {activeTab === 'cover-letter' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {editedCoverLetter.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                      onClick={() => copyToClipboard(editedCoverLetter, 'cover-letter')}
                      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedField === 'cover-letter' ? (
                        <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy Cover Letter</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={editedCoverLetter}
                    onChange={e => setEditedCoverLetter(e.target.value)}
                    rows={16}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 resize-none font-sans leading-relaxed"
                  />
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {editedEmail.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                      onClick={() => copyToClipboard(editedEmail, 'email')}
                      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedField === 'email' ? (
                        <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy Email</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={editedEmail}
                    onChange={e => setEditedEmail(e.target.value)}
                    rows={10}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 resize-none font-sans leading-relaxed"
                  />
                </div>
              )}

              {/* Tips Tab */}
              {activeTab === 'tips' && (
                <div className="space-y-4">
                  {/* Key Strengths */}
                  {applicationPackage.keyStrengths.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4" /> Key Strengths for This Role
                      </h4>
                      <ul className="space-y-2">
                        {applicationPackage.keyStrengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex gap-2">
                            <span className="text-green-500 flex-shrink-0">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Application Tips */}
                  {applicationPackage.applicationTips.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Application Tips
                      </h4>
                      <ul className="space-y-2">
                        {applicationPackage.applicationTips.map((tip, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex gap-2">
                            <span className="text-blue-500 flex-shrink-0">{idx + 1}.</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skill Gap Advice */}
                  {applicationPackage.skillGapAdvice && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Addressing Skill Gaps
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {applicationPackage.skillGapAdvice}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          {applicationPackage && (
            <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
              >
                View job listing
              </a>
              <button
                onClick={markAsApplied}
                disabled={isMarkingApplied || isApplied}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  isApplied
                    ? 'bg-green-600/30 text-green-300 border border-green-500/30 cursor-default'
                    : 'bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {isApplied ? (
                  <><Check className="w-4 h-4" /> Marked as Applied!</>
                ) : isMarkingApplied ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><CheckSquare className="w-4 h-4" /> Mark as Applied</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyAIModal;
