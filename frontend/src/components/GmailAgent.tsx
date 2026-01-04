import React, { useState, useEffect, useRef } from 'react';
import { Mail, FileText, MessageSquare, Trash2, Play, CheckCircle, AlertCircle, Square, Building2, LogIn, Loader2 } from 'lucide-react';
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
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check Google auth status on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/status');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        setAuthUrl(data.authUrl);
        setUserEmail(data.email || null);
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuthStatus();
  }, []);

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
      console.log('📧 Testing notification...');
      const result = await testNotification();
      console.log(`✅ Test notification sent via ${result.method}`);
    } catch (error: any) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  };

  // Handle Google login
  const handleGoogleLogin = () => {
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      window.location.href = 'http://localhost:5000/api/auth/google';
    }
  };

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
        <div className="max-w-xl mx-auto mt-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center shadow-2xl">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Mail className="w-12 h-12 text-blue-400" />
            </div>
            
            <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Connect Your Gmail
            </h1>
            
            <p className="text-slate-300 mb-6 leading-relaxed">
              To use the AI Email Agent, you need to connect your Google account. 
              This allows the agent to read, classify, and organize your emails automatically.
            </p>

            <div className="space-y-3 text-left bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Read and classify your emails with AI</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Auto-detect invoices and job offers</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Save invoices to Google Drive</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Filter spam automatically</span>
              </div>
            </div>
            
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-3 mx-auto bg-white hover:bg-gray-100 text-gray-800 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            
            <p className="text-xs text-slate-400 mt-6">
              We only request access to read and organize your emails. 
              Your data is processed locally and never shared.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show the main email agent UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🤖 AI Gmail Processing Agent
          </h1>
          <p className="text-slate-300">Intelligent email classification and automation with Hebrew support</p>
          {userEmail && (
            <div className="mt-3 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Connected as {userEmail}</span>
            </div>
          )}
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
