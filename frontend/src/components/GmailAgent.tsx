import React, { useState, useEffect, useRef } from 'react';
import { Mail, FileText, MessageSquare, Trash2, Play, CheckCircle, AlertCircle, XCircle, Square, Building2 } from 'lucide-react';
import { processAllEmails, testNotification } from '../services/api';
import InvoiceList from './InvoiceList';
import { io, Socket } from 'socket.io-client';

const GmailAgent = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logs, setLogs] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [stats, setStats] = useState({ invoices: 0, jobOffers: 0, official: 0, spam: 0, processed: 0 });
  const [config, setConfig] = useState({
    notificationMethod: 'email',
    checkInterval: 60
  });
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Connect to Socket.io for real-time logs
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to backend');
      addLog('🔌 Connected to backend server', 'success');
    });

    socketRef.current.on('log', (data: { message: string; type: string; details?: any }) => {
      addLog(data.message, data.type);
      
      // Update stats if details included
      if (data.details) {
        if (data.details.invoices !== undefined) {
          setStats(prev => ({ ...prev, invoices: data.details.invoices }));
        }
        if (data.details.jobOffers !== undefined) {
          setStats(prev => ({ ...prev, jobOffers: data.details.jobOffers }));
        }
        if (data.details.official !== undefined) {
          setStats(prev => ({ ...prev, official: data.details.official }));
        }
        if (data.details.spam !== undefined) {
          setStats(prev => ({ ...prev, spam: data.details.spam }));
        }
        if (data.details.processed !== undefined) {
          setStats(prev => ({ ...prev, processed: data.details.processed }));
        }
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from backend');
      addLog('🔌 Disconnected from backend server', 'warning');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const addLog = (message: string, type = 'info') => {
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }].slice(-100)); // Keep last 100 logs
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Activity log cleared', 'info');
  };

  const handleProcessAll = async () => {
    try {
      setIsRunning(true);
      setIsStopping(false);
      abortControllerRef.current = new AbortController();
      
      const result = await processAllEmails();
      
      // Final update from API response
      if (result.results) {
        setStats({
          processed: result.results.processed,
          invoices: result.results.invoices,
          jobOffers: result.results.jobOffers,
          official: result.results.official || 0,
          spam: result.results.spam
        });
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError' || isStopping) {
        addLog('⏹️ Processing stopped by user', 'warning');
      } else {
        const errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('APIConnectionError') || errorMsg.includes('Connection error')) {
          addLog(`❌ API Connection Error: Unable to connect to Claude API. Please check your internet connection.`, 'error');
        } else if (errorMsg.includes('authentication')) {
          addLog(`❌ Authentication Error: ${errorMsg}`, 'error');
        } else {
          addLog(`❌ Error: ${errorMsg}`, 'error');
        }
      }
    } finally {
      setIsRunning(false);
      setIsStopping(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      setIsStopping(true);
      abortControllerRef.current.abort();
      addLog('⏳ Stopping processing...', 'warning');
    }
  };

  const handleTestNotification = async () => {
    try {
      addLog('📧 Testing notification...', 'info');
      const result = await testNotification();
      addLog(`✅ Test notification sent via ${result.method}`, 'success');
    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🤖 AI Gmail Processing Agent
          </h1>
          <p className="text-slate-300">Intelligent email classification and automation with Hebrew support</p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Notification Method</label>
              <select
                value={config.notificationMethod}
                onChange={(e) => setConfig(prev => ({ ...prev, notificationMethod: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
              >
                <option value="email">Email (FREE)</option>
                <option value="discord">Discord (FREE)</option>
                <option value="telegram">Telegram (FREE)</option>
                <option value="all">All Methods</option>
                <option value="whatsapp" disabled>WhatsApp (Coming Soon)</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Configure in backend .env file</p>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Check Interval (seconds)</label>
              <input
                type="number"
                min="30"
                value={config.checkInterval}
                onChange={(e) => setConfig(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Stats Display */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Processed</span>
            </div>
            <div className="text-3xl font-bold">{stats.processed}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Invoices</span>
            </div>
            <div className="text-3xl font-bold">{stats.invoices}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Mail className="w-5 h-5" />
              <span className="text-sm">Job Offers</span>
            </div>
            <div className="text-3xl font-bold">{stats.jobOffers}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Building2 className="w-5 h-5" />
              <span className="text-sm">Official</span>
            </div>
            <div className="text-3xl font-bold">{stats.official}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Trash2 className="w-5 h-5" />
              <span className="text-sm">Spam</span>
            </div>
            <div className="text-3xl font-bold">{stats.spam}</div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Control Panel</h2>
            <div className="flex gap-3">
              <button
                onClick={handleTestNotification}
                className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 px-4 py-2 rounded-lg transition-colors"
              >
                <AlertCircle className="w-5 h-5" />
                Test Notification
              </button>
              {isRunning ? (
                <button
                  onClick={handleStop}
                  disabled={isStopping}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg transition-all disabled:opacity-50 font-semibold"
                >
                  {isStopping ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      Stop
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleProcessAll}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-2 rounded-lg transition-all font-semibold"
                >
                  <Play className="w-5 h-5" />
                  Process All Emails
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Log */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Activity Log</h2>
              <button
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear activity log"
              >
                <XCircle className="w-4 h-4" />
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No activity yet. Click "Process All Emails" to start.</p>
              ) : (
                <>
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm animate-fadeIn ${
                        log.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' :
                        log.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/30' :
                        log.type === 'warning' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' :
                        'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 text-xs flex-shrink-0">[{log.timestamp}]</span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Invoice List */}
          <InvoiceList />
        </div>

        {/* Info Panel */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">ℹ️ Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
            <div>
              <h4 className="font-semibold text-white mb-2">📄 Invoice Processing</h4>
              <ul className="space-y-1 text-xs">
                <li>• Hebrew & English support</li>
                <li>• Keywords: ארנונה, חשמל, מים</li>
                <li>• Auto-save to Google Drive</li>
                <li>• View & download anytime</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">💼 Job Offers</h4>
              <ul className="space-y-1 text-xs">
                <li>• Instant notifications</li>
                <li>• Email, Discord, Telegram</li>
                <li>• WhatsApp coming soon</li>
                <li>• Never miss opportunities</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">🗑️ Spam Filtering</h4>
              <ul className="space-y-1 text-xs">
                <li>• AI-powered detection</li>
                <li>• Auto-move to folder</li>
                <li>• Keep inbox clean</li>
                <li>• Learns patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GmailAgent;
