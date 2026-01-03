import React, { useState, useEffect, useRef } from 'react';
import { Mail, FileText, MessageSquare, Trash2, Play, CheckCircle, AlertCircle, Square, Building2 } from 'lucide-react';
import { processAllEmails, testNotification } from '../services/api';
import InvoiceList from './InvoiceList';
import { io, Socket } from 'socket.io-client';
import useSearchController from '../hooks/useSearchController';

const GmailAgent = () => {
  const searchController = useSearchController('email');
  const [stats, setStats] = useState({ invoices: 0, jobOffers: 0, official: 0, spam: 0, processed: 0 });
  const [config, setConfig] = useState({
    notificationMethod: 'email',
    checkInterval: 60
  });
  const socketRef = useRef<Socket | null>(null);

  // Connect to Socket.io for real-time stats updates
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.on('log', (data: { message: string; type: string; details?: any }) => {
      // Update stats if details included (logs go to global ActivityLog now)
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

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleProcessAll = async () => {
    searchController.start();
    
    try {
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
      if (error.name === 'AbortError') {
        console.log('Processing stopped by user');
      } else {
        console.error('Processing error:', error.message);
      }
    } finally {
      searchController.reset();
    }
  };

  const handleStop = () => {
    searchController.stop();
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
              {searchController.state.isSearching ? (
                <button
                  onClick={handleStop}
                  disabled={searchController.state.isStopping}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg transition-all disabled:opacity-50 font-semibold"
                >
                  <Square className="w-5 h-5" />
                  Stop
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

        {/* Invoice List - Full Width */}
        <div className="mb-6">
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
