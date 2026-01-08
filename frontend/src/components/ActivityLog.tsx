import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, X, Minimize2, Maximize2, Trash2, Filter, Clock } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  agent?: string;
}

interface ActivityLogProps {
  logs: LogEntry[];
  onClear?: () => void;
}

// Agent detection from message patterns
const detectAgent = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('email') || lowerMessage.includes('gmail') || 
      lowerMessage.includes('invoice') || lowerMessage.includes('spam')) {
    return 'email';
  }
  if (lowerMessage.includes('job') || lowerMessage.includes('cv') || 
      lowerMessage.includes('career') || lowerMessage.includes('match')) {
    return 'jobs';
  }
  if (lowerMessage.includes('flight') || lowerMessage.includes('hotel') || 
      lowerMessage.includes('trip') || lowerMessage.includes('travel')) {
    return 'travel';
  }
  if (lowerMessage.includes('learn') || lowerMessage.includes('newsletter') || 
      lowerMessage.includes('article')) {
    return 'learning';
  }
  if (lowerMessage.includes('problem') || lowerMessage.includes('leetcode') || 
      lowerMessage.includes('code') || lowerMessage.includes('solution')) {
    return 'problems';
  }
  return 'system';
};

const AGENT_COLORS: Record<string, string> = {
  email: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  jobs: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  travel: 'bg-green-500/20 text-green-400 border-green-500/30',
  learning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  problems: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  system: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const AGENT_LABELS: Record<string, string> = {
  email: '📧 Email',
  jobs: '💼 Jobs',
  travel: '✈️ Travel',
  learning: '📚 Learning',
  problems: '🧩 Problems',
  system: '⚙️ System',
};

const TIMESPAN_OPTIONS = [
  { label: 'All', value: 0 },
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '15 min', value: 900 },
  { label: '1 hour', value: 3600 },
];

const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [timespanSeconds, setTimespanSeconds] = useState(0);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  // Process logs to include detected agent
  const processedLogs = useMemo(() => {
    return logs.map(log => ({
      ...log,
      agent: log.agent || detectAgent(log.message)
    }));
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    const now = new Date();
    
    return processedLogs.filter(log => {
      // Agent filter
      if (selectedAgents.size > 0 && !selectedAgents.has(log.agent || 'system')) {
        return false;
      }
      
      // Type/severity filter
      if (selectedTypes.size > 0 && !selectedTypes.has(log.type)) {
        return false;
      }
      
      // Timespan filter
      if (timespanSeconds > 0) {
        const logAge = (now.getTime() - log.timestamp.getTime()) / 1000;
        if (logAge > timespanSeconds) {
          return false;
        }
      }
      
      return true;
    });
  }, [processedLogs, selectedAgents, selectedTypes, timespanSeconds]);

  // Get unique agents from logs
  const availableAgents = useMemo(() => {
    const agents = new Set<string>();
    processedLogs.forEach(log => agents.add(log.agent || 'system'));
    return Array.from(agents);
  }, [processedLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logEndRef.current && !isMinimized) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isMinimized]);

  const toggleAgent = (agent: string) => {
    const newSet = new Set(selectedAgents);
    if (newSet.has(agent)) {
      newSet.delete(agent);
    } else {
      newSet.add(agent);
    }
    setSelectedAgents(newSet);
  };

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const clearFilters = () => {
    setSelectedAgents(new Set());
    setSelectedTypes(new Set());
    setTimespanSeconds(0);
  };

  const hasActiveFilters = selectedAgents.size > 0 || selectedTypes.size > 0 || timespanSeconds > 0;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📋';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg z-50"
      >
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm">Show Activity Log</span>
        {logs.length > 0 && (
          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl z-50 transition-all ${
      isMinimized ? 'w-80' : 'w-[550px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-white">Activity Log</span>
          <span className="text-xs text-slate-400">
            ({filteredLogs.length}{hasActiveFilters ? ` / ${logs.length}` : ''})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded transition-colors ${
              showFilters || hasActiveFilters 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'hover:bg-slate-700 text-slate-400'
            }`}
            title="Toggle filters"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          {onClear && logs.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Hide"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && !isMinimized && (
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/30 space-y-3">
          {/* Agent Filter */}
          <div>
            <div className="text-xs text-slate-400 mb-2">Filter by Agent</div>
            <div className="flex flex-wrap gap-1.5">
              {['email', 'jobs', 'travel', 'learning', 'problems', 'system'].map(agent => (
                <button
                  key={agent}
                  onClick={() => toggleAgent(agent)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    selectedAgents.size === 0 || selectedAgents.has(agent)
                      ? AGENT_COLORS[agent]
                      : 'bg-slate-700/30 text-slate-500 border-slate-600/30'
                  }`}
                >
                  {AGENT_LABELS[agent]}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <div className="text-xs text-slate-400 mb-2">Filter by Severity</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: 'info', label: '📋 Info', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
                { type: 'success', label: '✅ Success', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { type: 'warning', label: '⚠️ Warning', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                { type: 'error', label: '❌ Error', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              ].map(({ type, label, color }) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    selectedTypes.size === 0 || selectedTypes.has(type)
                      ? color
                      : 'bg-slate-700/30 text-slate-500 border-slate-600/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timespan Filter */}
          <div>
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Time Range
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TIMESPAN_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTimespanSeconds(value)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    timespanSeconds === value
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-600/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Log Content */}
      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">
              {hasActiveFilters 
                ? 'No logs match the current filters.'
                : 'No activity yet. Start a search to see logs.'
              }
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 group">
                <span className="text-slate-500 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] border flex-shrink-0 ${AGENT_COLORS[log.agent || 'system']}`}>
                  {(log.agent || 'system').charAt(0).toUpperCase()}
                </span>
                <span className="flex-shrink-0">{getTypeIcon(log.type)}</span>
                <span className={getTypeStyles(log.type)}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Minimized indicator */}
      {isMinimized && logs.length > 0 && (
        <div className="px-4 py-2 text-xs text-slate-400">
          Latest: {filteredLogs[filteredLogs.length - 1]?.message.substring(0, 40)}...
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
