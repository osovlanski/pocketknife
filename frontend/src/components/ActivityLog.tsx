import React from 'react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ActivityLogProps {
  logs: LogEntry[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="material-icons">history</span>
        Activity Log
      </h2>
      <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            No activity yet. Start the agent to begin processing emails.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              key={idx}
              className={`text-sm font-mono ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-slate-300'
              }`}
            >
              <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLog;