/**
 * GmailAgent Component
 * 
 * Gmail agent UI with separated concerns:
 * - Uses useGmail hook for business logic
 * - Uses CSS modules for styling
 */

import React from 'react';
import { 
  Mail, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Square, 
  Building2, 
  Loader2 
} from 'lucide-react';
import useGmail from '../hooks/useGmail';
import InvoiceList from './InvoiceList';
import styles from '../styles/gmail.module.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, colorClass }) => (
  <div className={`${styles.statCard} ${colorClass}`}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
);

// =============================================================================
// AUTH COMPONENTS
// =============================================================================

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => (
  <div className={styles.container}>
    <div className={styles.authCard}>
      <div style={{ 
        background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
        padding: '1.5rem',
        borderRadius: '9999px',
        width: '6rem',
        height: '6rem',
        margin: '0 auto 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Mail style={{ width: '3rem', height: '3rem', color: 'rgb(96, 165, 250)' }} />
      </div>
      
      <h1 className={styles.authTitle} style={{ 
        background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(167, 139, 250))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Connect Your Gmail
      </h1>
      
      <p className={styles.authSubtitle}>
        To use the AI Email Agent, you need to connect your Google account. 
        This allows the agent to read, classify, and organize your emails automatically.
      </p>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        textAlign: 'left'
      }}>
        {[
          'Read and classify your emails with AI',
          'Auto-detect invoices and job offers',
          'Save invoices to Google Drive',
          'Filter spam automatically'
        ].map((feature, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: 'rgb(203, 213, 225)',
            marginBottom: i < 3 ? '0.75rem' : 0
          }}>
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: 'rgb(74, 222, 128)', flexShrink: 0 }} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      
      <button onClick={onLogin} className={styles.googleButton}>
        <GoogleIcon className={styles.iconLarge} />
        Sign in with Google
      </button>
      
      <p style={{ fontSize: '0.75rem', color: 'rgb(148, 163, 184)', marginTop: '1.5rem' }}>
        We only request access to read and organize your emails. 
        Your data is processed locally and never shared.
      </p>
    </div>
  </div>
);

const LoadingScreen: React.FC = () => (
  <div className={styles.container}>
    <div className={styles.loadingContainer}>
      <Loader2 className={`${styles.iconLarge} ${styles.spinner}`} style={{ color: 'rgb(167, 139, 250)' }} />
      <p style={{ color: 'rgb(203, 213, 225)', marginTop: '1rem' }}>Checking authentication...</p>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GmailAgent: React.FC = () => {
  const gmail = useGmail();

  // Show loading state while checking auth
  if (gmail.isAuthenticated === null) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!gmail.isAuthenticated) {
    return <LoginScreen onLogin={gmail.handleGoogleLogin} />;
  }

  // Authenticated - show the main email agent UI
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🤖 AI Gmail Processing Agent</h1>
        <p className={styles.subtitle}>Intelligent email classification and automation with Hebrew support</p>
        {gmail.userEmail && (
          <div className={styles.userInfo}>
            <CheckCircle className={styles.iconSmall} />
            <span>Connected as {gmail.userEmail}</span>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <div className={styles.configPanel}>
        <h2 className={styles.configTitle}>
          <MessageSquare className={styles.icon} style={{ marginRight: '0.5rem', display: 'inline' }} />
          Configuration
        </h2>
        <div className={styles.configGrid}>
          <div className={styles.configGroup}>
            <label className={styles.configLabel}>Notification Method</label>
            <select
              value={gmail.config.notificationMethod}
              onChange={(e) => gmail.setConfig(prev => ({ ...prev, notificationMethod: e.target.value }))}
              className={styles.configSelect}
            >
              <option value="email">Email (FREE)</option>
              <option value="discord">Discord (FREE)</option>
              <option value="telegram">Telegram (FREE)</option>
              <option value="all">All Methods</option>
              <option value="whatsapp" disabled>WhatsApp (Coming Soon)</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'rgb(148, 163, 184)', marginTop: '0.25rem' }}>
              Configure in backend .env file
            </p>
          </div>
          <div className={styles.configGroup}>
            <label className={styles.configLabel}>Check Interval (seconds)</label>
            <input
              type="number"
              min="30"
              value={gmail.config.checkInterval}
              onChange={(e) => gmail.setConfig(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
              className={styles.configInput}
            />
          </div>
        </div>
      </div>

      {/* Stats Display */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={<CheckCircle className={styles.icon} style={{ color: 'rgb(96, 165, 250)' }} />}
          label="Processed"
          value={gmail.stats.processed}
          colorClass={styles.statProcessed}
        />
        <StatCard
          icon={<FileText className={styles.icon} style={{ color: 'rgb(74, 222, 128)' }} />}
          label="Invoices"
          value={gmail.stats.invoices}
          colorClass={styles.statInvoice}
        />
        <StatCard
          icon={<Mail className={styles.icon} style={{ color: 'rgb(167, 139, 250)' }} />}
          label="Job Offers"
          value={gmail.stats.jobOffers}
          colorClass={styles.statJob}
        />
        <StatCard
          icon={<Building2 className={styles.icon} style={{ color: 'rgb(251, 191, 36)' }} />}
          label="Official"
          value={gmail.stats.official}
          colorClass={styles.statOfficial}
        />
        <StatCard
          icon={<Trash2 className={styles.icon} style={{ color: 'rgb(248, 113, 113)' }} />}
          label="Spam"
          value={gmail.stats.spam}
          colorClass={styles.statSpam}
        />
      </div>

      {/* Control Panel */}
      <div className={styles.configPanel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className={styles.configTitle}>Control Panel</h2>
          <div className={styles.actions}>
            <button
              onClick={gmail.handleTestNotification}
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              style={{ background: 'rgba(234, 179, 8, 0.2)' }}
            >
              <AlertCircle className={styles.icon} />
              Test Notification
            </button>
            {gmail.searchController.state.isSearching ? (
              <button
                onClick={gmail.handleStop}
                disabled={gmail.searchController.state.isStopping}
                className={`${styles.actionButton} ${styles.actionButtonStop}`}
              >
                <Square className={styles.icon} />
                Stop
              </button>
            ) : (
              <button
                onClick={gmail.handleProcessAll}
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              >
                <Play className={styles.icon} />
                Process All Emails
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className={styles.invoiceSection}>
        <InvoiceList />
      </div>

      {/* Info Panel */}
      <div className={styles.configPanel} style={{ 
        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'rgb(147, 197, 253)' }}>
          ℹ️ Features
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem', color: 'rgb(203, 213, 225)' }}>
          <div>
            <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>📄 Invoice Processing</h4>
            <ul style={{ fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
              <li>• Hebrew & English support</li>
              <li>• Keywords: ארנונה, חשמל, מים</li>
              <li>• Auto-save to Google Drive</li>
              <li>• View & download anytime</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>💼 Job Offers</h4>
            <ul style={{ fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
              <li>• Instant notifications</li>
              <li>• Email, Discord, Telegram</li>
              <li>• WhatsApp coming soon</li>
              <li>• Never miss opportunities</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>🗑️ Spam Filtering</h4>
            <ul style={{ fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
              <li>• AI-powered detection</li>
              <li>• Auto-move to folder</li>
              <li>• Keep inbox clean</li>
              <li>• Learns patterns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GmailAgent;
