import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, RefreshCw } from 'lucide-react';
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

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      setInvoices(data.invoices || []);
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
