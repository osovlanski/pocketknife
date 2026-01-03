import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, Cloud } from 'lucide-react';
import { getInvoices } from '../services/api';

interface Invoice {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  createdTime: string;
  size: string;
  mimeType: string;
}

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveFolder, setDriveFolder] = useState<string>('');
  const [authRequired, setAuthRequired] = useState(false);
  const [authMessage, setAuthMessage] = useState<string>('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const data = await getInvoices();
      
      // Check if authentication is required
      if (data.authRequired) {
        setAuthRequired(true);
        setAuthMessage(data.message || 'Google Drive not connected');
        setInvoices([]);
      } else {
        setInvoices(data.invoices || []);
      }
      setDriveFolder(data.driveFolder || '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Saved Invoices ({invoices.length})
        </h2>
        <button
          onClick={fetchInvoices}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-200">
          {error}
        </div>
      )}

      {/* Google Auth Required Banner */}
      {authRequired && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500/20 p-3 rounded-full">
              <Cloud className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                Connect Google Drive
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                {authMessage || 'To save and view invoices, connect your Google account.'}
              </p>
              
              <button
                onClick={() => {
                  // Open Google OAuth in a new window/tab
                  window.location.href = 'http://localhost:5000/api/auth/google';
                }}
                className="flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect with Google
              </button>
              
              <p className="text-xs text-slate-400 mt-4">
                This will open Google's sign-in page to authorize Gmail and Drive access.
              </p>
            </div>
          </div>
        </div>
      )}

      {driveFolder && (
        <div className="mb-4 text-sm text-slate-300">
          <a
            href={`https://drive.google.com/drive/folders/${driveFolder}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-4 h-4" />
            Open full Drive folder
          </a>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading && invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading invoices...
          </div>
        ) : authRequired ? (
          <div className="text-center py-4 text-slate-500">
            <Cloud className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Connect Google Drive to view invoices
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No invoices saved yet
          </div>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors border border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <h3 className="font-medium truncate">{invoice.name}</h3>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Saved: {formatDate(invoice.createdTime)}</div>
                    <div>Size: {formatSize(invoice.size)}</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={invoice.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500/20 hover:bg-blue-500/30 p-2 rounded-lg transition-colors"
                    title="View in Google Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a
                    href={invoice.webContentLink}
                    download
                    className="bg-green-500/20 hover:bg-green-500/30 p-2 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
