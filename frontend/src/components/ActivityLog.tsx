import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ActivityLogProps {
  logs: LogEntry[];
  onClear?: () => void;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logEndRef.current && !isMinimized) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized]);

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
      isMinimized ? 'w-80' : 'w-[500px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-white">Activity Log</span>
          <span className="text-xs text-slate-400">({logs.length} entries)</span>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Log Content */}
      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">
              No activity yet. Start a search to see logs.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-500 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
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
          Latest: {logs[logs.length - 1]?.message.substring(0, 40)}...
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
