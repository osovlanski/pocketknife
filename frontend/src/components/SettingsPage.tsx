/**
 * SettingsPage Component
 * 
 * User settings page with separated concerns:
 * - Uses custom hooks for state management
 * - Uses modular CSS for styling
 * - Separated into logical sections
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings,
  User,
  Briefcase,
  Plane,
  Code,
  Bell,
  ShoppingCart,
  CheckSquare,
  Globe,
  Save,
  Loader2,
  Check,
  Link2,
  Unlink,
  Mail
} from 'lucide-react';

// Hooks
import useSettings from '../hooks/useSettings';

// Services & Types
import * as authApi from '../services/authApi';
import type { CurrentUser, UserPreferences, AuthStatus, TelegramStatus, DiscordStatus, FacebookStatus } from '../services/authApi';

// Styles
import styles from '../styles/settings.module.css';
import commonStyles from '../styles/common.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface SettingsPageProps {
  user: CurrentUser | null;
  onUserUpdate: () => void;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.FC<any>;
}

// =============================================================================
// SECTION CONFIGURATION
// =============================================================================

const sections: SectionConfig[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'jobs', label: 'Job Preferences', icon: Briefcase },
  { id: 'travel', label: 'Travel Preferences', icon: Plane },
  { id: 'coding', label: 'Coding Preferences', icon: Code },
  { id: 'todo', label: 'ToDo Settings', icon: CheckSquare },
  { id: 'shopping', label: 'Shopping Settings', icon: ShoppingCart },
  { id: 'notifications', label: 'Notifications', icon: Bell }
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
}

const FormGroup: React.FC<FormGroupProps> = ({ label, children }) => (
  <div className={styles.formGroup}>
    <label className={styles.formLabel}>{label}</label>
    {children}
  </div>
);

interface ToggleButtonGroupProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colorClass?: string;
}

const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({ 
  options, 
  selected, 
  onChange,
  colorClass = styles.toggleButtonActive
}) => (
  <div className={styles.toggleGroup}>
    {options.map(option => (
      <button
        key={option}
        type="button"
        onClick={() => {
          const isSelected = selected.includes(option);
          onChange(isSelected 
            ? selected.filter(s => s !== option) 
            : [...selected, option]
          );
        }}
        className={`${styles.toggleButton} ${selected.includes(option) ? colorClass : ''}`}
      >
        {option}
      </button>
    ))}
  </div>
);

interface SwitchProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ title, description, checked, onChange }) => (
  <div className={styles.switchContainer}>
    <div className={styles.switchInfo}>
      <h4 className={styles.switchTitle}>{title}</h4>
      {description && <p className={styles.switchDescription}>{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`${styles.switch} ${checked ? styles.switchOn : styles.switchOff}`}
    >
      <div className={`${styles.switchThumb} ${checked ? styles.switchThumbOn : styles.switchThumbOff}`} />
    </button>
  </div>
);

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

interface ProfileSectionProps {
  user: CurrentUser | null;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ user }) => {
  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN': return styles.statusBadgeSuperAdmin;
      case 'ADMIN': return styles.statusBadgeAdmin;
      default: return styles.statusBadgeUser;
    }
  };

  return (
    <div className={styles.sectionContent}>
      <h2 className={styles.sectionTitle}>Profile</h2>
      
      <FormGroup label="Email">
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className={`${styles.formInput} ${styles.formInputDisabled}`}
        />
      </FormGroup>
      
      <FormGroup label="Name">
        <input
          type="text"
          value={user?.name || ''}
          readOnly
          className={`${styles.formInput} ${styles.formInputDisabled}`}
          placeholder="Your name"
        />
      </FormGroup>

      <div className={styles.formRow}>
        <FormGroup label="Role">
          <div className={`${styles.statusBadge} ${getRoleBadgeClass()}`}>
            {user?.role?.replace('_', ' ') || 'User'}
          </div>
        </FormGroup>
        <FormGroup label="Status">
          <div className={`${styles.statusBadge} ${user?.status === 'ACTIVE' ? styles.statusBadgeActive : ''}`}>
            {user?.status || 'Unknown'}
          </div>
        </FormGroup>
      </div>

      <FormGroup label="Member Since">
        <div className={`${styles.formInput} ${styles.formInputDisabled}`}>
          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
        </div>
      </FormGroup>
    </div>
  );
};

interface IntegrationsSectionProps {
  googleStatus: AuthStatus | null;
  isLoading: boolean;
  loadError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRetry: () => void;
  // Telegram
  telegramStatus: TelegramStatus | null;
  isLoadingTelegram: boolean;
  isTestingTelegram: boolean;
  onTestTelegram: () => void;
  onRetryTelegram: () => void;
  // Discord
  discordStatus: DiscordStatus | null;
  isLoadingDiscord: boolean;
  isTestingDiscord: boolean;
  onTestDiscord: () => void;
  onRetryDiscord: () => void;
  // Facebook
  facebookStatus: FacebookStatus | null;
  isLoadingFacebook: boolean;
  isTestingFacebook: boolean;
  onTestFacebook: () => void;
  onRetryFacebook: () => void;
}

const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  googleStatus,
  isLoading,
  loadError,
  onConnect,
  onDisconnect,
  onRetry,
  telegramStatus,
  isLoadingTelegram,
  isTestingTelegram,
  onTestTelegram,
  onRetryTelegram,
  discordStatus,
  isLoadingDiscord,
  isTestingDiscord,
  onTestDiscord,
  onRetryDiscord,
  facebookStatus,
  isLoadingFacebook,
  isTestingFacebook,
  onTestFacebook,
  onRetryFacebook
}) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Integrations</h2>
    
    {/* Error Banner */}
    {loadError && (
      <div style={{
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '0.5rem',
        color: 'rgb(239, 68, 68)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span>{loadError}</span>
        </div>
        <button
          onClick={onRetry}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '0.25rem',
            color: 'rgb(239, 68, 68)',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Retry
        </button>
      </div>
    )}
    
    {/* Google Integration */}
    <div className={styles.integrationCard}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationInfo}>
          <div className={`${styles.integrationIcon} ${styles.integrationIconGoogle}`}>
            <Globe style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(59, 130, 246)' }} />
          </div>
          <div>
            <h3 className={styles.integrationTitle}>Google Account</h3>
            <p className={styles.integrationDescription}>
              {isLoading 
                ? 'Checking connection status...'
                : googleStatus?.authenticated
                  ? `Connected as ${googleStatus.email}`
                  : 'Connect for Gmail, Calendar, and Drive access'}
            </p>
          </div>
        </div>
        
        {isLoading ? (
          <Loader2 className={commonStyles.spinner} style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(148, 163, 184)' }} />
        ) : googleStatus?.authenticated ? (
          <button
            onClick={onDisconnect}
            disabled={isLoading}
            className={`${commonStyles.btn} ${commonStyles.btnDanger}`}
          >
            <Unlink style={{ width: '1rem', height: '1rem' }} />
            Disconnect
          </button>
        ) : (
          <button onClick={onConnect} className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}>
            <Link2 style={{ width: '1rem', height: '1rem' }} />
            Connect Google
          </button>
        )}
      </div>
      
      {googleStatus?.authenticated && (
        <div className={styles.integrationPermissions}>
          <h4 className={styles.integrationPermissionsTitle}>Permissions granted:</h4>
          <div className={styles.integrationTags}>
            <span className={`${styles.integrationTag} ${styles.integrationTagGmail}`}>Gmail</span>
            <span className={`${styles.integrationTag} ${styles.integrationTagCalendar}`}>Calendar</span>
            <span className={`${styles.integrationTag} ${styles.integrationTagDrive}`}>Drive</span>
          </div>
        </div>
      )}
    </div>

    {/* Telegram Integration */}
    <div className={`${styles.integrationCard} ${telegramStatus?.connected ? '' : styles.integrationCardDisabled}`}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationInfo}>
          <div className={`${styles.integrationIcon} ${styles.integrationIconTelegram}`}>
            <Mail style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
          </div>
          <div>
            <h3 className={styles.integrationTitle}>Telegram</h3>
            <p className={styles.integrationDescription}>
              {isLoadingTelegram 
                ? 'Checking connection status...'
                : telegramStatus?.connected
                  ? `Connected to @${telegramStatus.botUsername || 'bot'}`
                  : telegramStatus?.configured
                    ? `Configuration error: ${telegramStatus.error || 'Unknown'}`
                    : 'Not configured - Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env'}
            </p>
          </div>
        </div>

        {isLoadingTelegram ? (
          <Loader2 className={commonStyles.spinner} style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(148, 163, 184)' }} />
        ) : telegramStatus?.connected ? (
          <button
            onClick={onTestTelegram}
            disabled={isTestingTelegram}
            className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
            style={{ minWidth: '140px' }}
          >
            {isTestingTelegram ? (
              <>
                <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} />
                Sending...
              </>
            ) : (
              <>
                <Check style={{ width: '1rem', height: '1rem' }} />
                Test Connection
              </>
            )}
          </button>
        ) : telegramStatus?.error ? (
          <button
            onClick={onRetryTelegram}
            className={`${commonStyles.btn}`}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'rgb(239, 68, 68)' }}
          >
            Retry
          </button>
        ) : null}
      </div>

      {telegramStatus?.connected && (
        <div className={styles.integrationPermissions}>
          <h4 className={styles.integrationPermissionsTitle}>Connection details:</h4>
          <div className={styles.integrationTags}>
            <span className={`${styles.integrationTag}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'rgb(59, 130, 246)' }}>
              Bot: @{telegramStatus.botUsername}
            </span>
            <span className={`${styles.integrationTag}`} style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'rgb(16, 185, 129)' }}>
              Chat ID: {telegramStatus.chatId}
            </span>
          </div>
        </div>
      )}

      {!telegramStatus?.configured && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          backgroundColor: 'rgba(251, 191, 36, 0.1)', 
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: 'rgb(251, 191, 36)'
        }}>
          <strong>Setup Instructions:</strong>
          <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
            <li>Create a bot with <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(96, 165, 250)' }}>@BotFather</a> on Telegram</li>
            <li>Copy the bot token to <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>TELEGRAM_BOT_TOKEN</code> in .env</li>
            <li>Send any message to your bot, then get your chat ID from the API</li>
            <li>Add the chat ID to <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>TELEGRAM_CHAT_ID</code> in .env</li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}
    </div>

    {/* Discord Integration */}
    <div className={`${styles.integrationCard} ${discordStatus?.connected ? '' : styles.integrationCardDisabled}`}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationInfo}>
          <div className={`${styles.integrationIcon}`} style={{ backgroundColor: 'rgba(88, 101, 242, 0.2)' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24" fill="rgb(88, 101, 242)">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.integrationTitle}>Discord</h3>
            <p className={styles.integrationDescription}>
              {isLoadingDiscord 
                ? 'Checking connection status...'
                : discordStatus?.connected
                  ? `Connected to ${discordStatus.webhookUrl || 'webhook'}`
                  : discordStatus?.error
                    ? `Connection error: ${discordStatus.error}`
                    : discordStatus?.configured
                      ? 'Configured - Click Test to verify webhook'
                      : 'Not configured - Add DISCORD_WEBHOOK_URL to .env'}
            </p>
          </div>
        </div>

        {isLoadingDiscord ? (
          <Loader2 className={commonStyles.spinner} style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(148, 163, 184)' }} />
        ) : discordStatus?.connected ? (
          <button
            onClick={onTestDiscord}
            disabled={isTestingDiscord}
            className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
            style={{ minWidth: '140px' }}
          >
            {isTestingDiscord ? (
              <>
                <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} />
                Sending...
              </>
            ) : (
              <>
                <Check style={{ width: '1rem', height: '1rem' }} />
                Test Connection
              </>
            )}
          </button>
        ) : discordStatus?.configured ? (
          <button
            onClick={onTestDiscord}
            disabled={isTestingDiscord}
            className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
            style={{ minWidth: '140px' }}
          >
            {isTestingDiscord ? (
              <>
                <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} />
                Testing...
              </>
            ) : (
              <>
                <Check style={{ width: '1rem', height: '1rem' }} />
                Test Connection
              </>
            )}
          </button>
        ) : null}
      </div>

      {discordStatus?.connected && (
        <div className={styles.integrationPermissions}>
          <h4 className={styles.integrationPermissionsTitle}>Connection details:</h4>
          <div className={styles.integrationTags}>
            <span className={`${styles.integrationTag}`} style={{ backgroundColor: 'rgba(88, 101, 242, 0.2)', color: 'rgb(129, 140, 248)' }}>
              Channel: {discordStatus.webhookUrl}
            </span>
          </div>
        </div>
      )}

      {!discordStatus?.configured && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          backgroundColor: 'rgba(251, 191, 36, 0.1)', 
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: 'rgb(251, 191, 36)'
        }}>
          <strong>Setup Instructions:</strong>
          <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
            <li>Open Discord and go to Server Settings → Integrations → Webhooks</li>
            <li>Click "New Webhook" and choose a channel</li>
            <li>Copy the Webhook URL</li>
            <li>Add it to <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>DISCORD_WEBHOOK_URL</code> in .env</li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}
    </div>

    {/* Facebook Integration */}
    <div className={`${styles.integrationCard} ${facebookStatus?.connected ? '' : styles.integrationCardDisabled}`}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationInfo}>
          <div className={`${styles.integrationIcon}`} style={{ backgroundColor: 'rgba(24, 119, 242, 0.2)' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24" fill="rgb(24, 119, 242)">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.integrationTitle}>Facebook</h3>
            <p className={styles.integrationDescription}>
              {isLoadingFacebook 
                ? 'Checking connection status...'
                : facebookStatus?.connected
                  ? `Connected to ${facebookStatus.appName || 'Facebook App'}`
                  : facebookStatus?.error
                    ? `Connection error: ${facebookStatus.error}`
                    : facebookStatus?.configured
                      ? 'Configured - Click Test to verify connection'
                      : 'Not configured - Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env'}
            </p>
          </div>
        </div>

        {isLoadingFacebook ? (
          <Loader2 className={commonStyles.spinner} style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(148, 163, 184)' }} />
        ) : facebookStatus?.connected ? (
          <button
            onClick={onTestFacebook}
            disabled={isTestingFacebook}
            className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
            style={{ minWidth: '140px' }}
          >
            {isTestingFacebook ? (
              <>
                <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} />
                Sending...
              </>
            ) : (
              <>
                <Check style={{ width: '1rem', height: '1rem' }} />
                Test Connection
              </>
            )}
          </button>
        ) : facebookStatus?.configured ? (
          <button
            onClick={onTestFacebook}
            disabled={isTestingFacebook}
            className={`${commonStyles.btn} ${commonStyles.btnPrimary}`}
            style={{ minWidth: '140px' }}
          >
            {isTestingFacebook ? (
              <>
                <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} />
                Testing...
              </>
            ) : (
              <>
                <Check style={{ width: '1rem', height: '1rem' }} />
                Test Connection
              </>
            )}
          </button>
        ) : null}
      </div>

      {facebookStatus?.connected && (
        <div className={styles.integrationPermissions}>
          <h4 className={styles.integrationPermissionsTitle}>Connection details:</h4>
          <div className={styles.integrationTags}>
            <span className={`${styles.integrationTag}`} style={{ backgroundColor: 'rgba(24, 119, 242, 0.2)', color: 'rgb(66, 133, 244)' }}>
              App: {facebookStatus.appName}
            </span>
          </div>
        </div>
      )}

      {!facebookStatus?.configured && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          backgroundColor: 'rgba(251, 191, 36, 0.1)', 
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: 'rgb(251, 191, 36)'
        }}>
          <strong>Setup Instructions:</strong>
          <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(96, 165, 250)' }}>Facebook Developers</a></li>
            <li>Create a new app or select an existing one</li>
            <li>Copy the App ID to <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>FACEBOOK_APP_ID</code> in .env</li>
            <li>Copy the App Secret to <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>FACEBOOK_APP_SECRET</code> in .env</li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}
    </div>
  </div>
);

interface JobPreferencesSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const JobPreferencesSection: React.FC<JobPreferencesSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Job Search Preferences</h2>
    
    <FormGroup label="Preferred Locations">
      <input
        type="text"
        value={preferences.preferredLocations?.join(', ') || ''}
        onChange={(e) => onChange({ preferredLocations: e.target.value.split(',').map(s => s.trim()) })}
        className={styles.formInput}
        placeholder="e.g., Tel Aviv, Remote, New York"
      />
    </FormGroup>

    <FormGroup label="Job Types">
      <ToggleButtonGroup
        options={['Remote', 'Hybrid', 'Office Only']}
        selected={preferences.preferredJobTypes || []}
        onChange={(types) => onChange({ preferredJobTypes: types })}
      />
    </FormGroup>

    <div className={styles.formRow}>
      <FormGroup label="Min Salary">
        <input
          type="number"
          value={preferences.minSalary || ''}
          onChange={(e) => onChange({ minSalary: parseInt(e.target.value) || undefined })}
          className={styles.formInput}
          placeholder="e.g., 80000"
        />
      </FormGroup>
      <FormGroup label="Max Salary">
        <input
          type="number"
          value={preferences.maxSalary || ''}
          onChange={(e) => onChange({ maxSalary: parseInt(e.target.value) || undefined })}
          className={styles.formInput}
          placeholder="e.g., 150000"
        />
      </FormGroup>
    </div>

    <FormGroup label="Experience Level">
      <select
        value={preferences.experienceLevel || ''}
        onChange={(e) => onChange({ experienceLevel: e.target.value || undefined })}
        className={styles.formInput}
      >
        <option value="">Any</option>
        <option value="Junior">Junior</option>
        <option value="Mid">Mid-Level</option>
        <option value="Senior">Senior</option>
      </select>
    </FormGroup>
  </div>
);

interface TravelPreferencesSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const TravelPreferencesSection: React.FC<TravelPreferencesSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Travel Preferences</h2>
    
    <FormGroup label="Home Airport">
      <input
        type="text"
        value={preferences.homeAirport || ''}
        onChange={(e) => onChange({ homeAirport: e.target.value })}
        className={styles.formInput}
        placeholder="e.g., TLV, JFK"
      />
    </FormGroup>

    <FormGroup label="Preferred Airlines">
      <input
        type="text"
        value={preferences.preferredAirlines?.join(', ') || ''}
        onChange={(e) => onChange({ preferredAirlines: e.target.value.split(',').map(s => s.trim()) })}
        className={styles.formInput}
        placeholder="e.g., El Al, United, Delta"
      />
    </FormGroup>

    <FormGroup label="Preferred Hotel Class">
      <div className={styles.starGroup}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            onClick={() => onChange({ preferredHotelClass: stars })}
            className={`${styles.starButton} ${preferences.preferredHotelClass === stars ? styles.starButtonActive : ''}`}
          >
            {'⭐'.repeat(stars)}
          </button>
        ))}
      </div>
    </FormGroup>
  </div>
);

interface CodingPreferencesSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const CodingPreferencesSection: React.FC<CodingPreferencesSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Coding Preferences</h2>
    
    <FormGroup label="Preferred Language">
      <select
        value={preferences.preferredLanguage || 'javascript'}
        onChange={(e) => onChange({ preferredLanguage: e.target.value })}
        className={styles.formInput}
      >
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="csharp">C#</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
      </select>
    </FormGroup>

    <FormGroup label="Preferred Difficulty">
      <div className={styles.toggleGroup}>
        {['Easy', 'Medium', 'Hard'].map((diff) => (
          <button
            key={diff}
            type="button"
            onClick={() => onChange({ preferredDifficulty: diff })}
            className={`${styles.toggleButton} ${
              preferences.preferredDifficulty === diff 
                ? diff === 'Easy' ? styles.toggleButtonSuccess 
                : diff === 'Medium' ? styles.toggleButtonWarning 
                : styles.toggleButtonDanger
                : ''
            }`}
          >
            {diff}
          </button>
        ))}
      </div>
    </FormGroup>
  </div>
);

interface ToDoSettingsSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const ToDoSettingsSection: React.FC<ToDoSettingsSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>ToDo Settings</h2>
    
    <FormGroup label="Default Task Duration (minutes)">
      <input
        type="number"
        value={preferences.defaultTaskDuration || ''}
        onChange={(e) => onChange({ defaultTaskDuration: parseInt(e.target.value) || undefined })}
        className={styles.formInput}
        placeholder="e.g., 30"
      />
    </FormGroup>

    <div className={styles.formRow}>
      <FormGroup label="Working Hours Start">
        <input
          type="time"
          value={preferences.workingHoursStart || '09:00'}
          onChange={(e) => onChange({ workingHoursStart: e.target.value })}
          className={styles.formInput}
        />
      </FormGroup>
      <FormGroup label="Working Hours End">
        <input
          type="time"
          value={preferences.workingHoursEnd || '17:00'}
          onChange={(e) => onChange({ workingHoursEnd: e.target.value })}
          className={styles.formInput}
        />
      </FormGroup>
    </div>

    <div className={styles.checkboxContainer}>
      <input
        type="checkbox"
        id="weekendEnabled"
        checked={preferences.weekendEnabled || false}
        onChange={(e) => onChange({ weekendEnabled: e.target.checked })}
        className={styles.checkbox}
      />
      <label htmlFor="weekendEnabled">Include weekends in task scheduling</label>
    </div>
  </div>
);

interface ShoppingSettingsSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const ShoppingSettingsSection: React.FC<ShoppingSettingsSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Shopping Settings</h2>
    
    <FormGroup label="Preferred Currency">
      <select
        value={preferences.preferredCurrency || 'USD'}
        onChange={(e) => onChange({ preferredCurrency: e.target.value })}
        className={styles.formInput}
      >
        <option value="USD">USD ($)</option>
        <option value="EUR">EUR (€)</option>
        <option value="GBP">GBP (£)</option>
        <option value="ILS">ILS (₪)</option>
      </select>
    </FormGroup>

    <FormGroup label={`Deal Score Threshold (${preferences.dealScoreThreshold || 70}%)`}>
      <input
        type="range"
        min="0"
        max="100"
        value={preferences.dealScoreThreshold || 70}
        onChange={(e) => onChange({ dealScoreThreshold: parseInt(e.target.value) })}
        className={styles.rangeSlider}
      />
      <p className={styles.rangeHint}>Only show deals with this score or higher</p>
    </FormGroup>

    <FormGroup label="Favorite Categories">
      <input
        type="text"
        value={preferences.favoriteCategories?.join(', ') || ''}
        onChange={(e) => onChange({ favoriteCategories: e.target.value.split(',').map(s => s.trim()) })}
        className={styles.formInput}
        placeholder="e.g., Electronics, Gaming, Fashion"
      />
    </FormGroup>
  </div>
);

interface NotificationsSectionProps {
  preferences: Partial<UserPreferences>;
  onChange: (prefs: Partial<UserPreferences>) => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ preferences, onChange }) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Notification Settings</h2>
    
    <div className={styles.switchContainer}>
      <div className={styles.switchInfo}>
        <h4 className={styles.switchTitle}>Email Digest</h4>
        <p className={styles.switchDescription}>Receive daily email summaries</p>
      </div>
      <input
        type="time"
        value={preferences.emailDigestTime || '09:00'}
        onChange={(e) => onChange({ emailDigestTime: e.target.value })}
        className={styles.formInput}
        style={{ width: 'auto' }}
      />
    </div>

    <Switch
      title="Auto-Archive Spam"
      description="Automatically archive detected spam emails"
      checked={preferences.autoArchiveSpam || false}
      onChange={(checked) => onChange({ autoArchiveSpam: checked })}
    />
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUserUpdate }) => {
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [googleStatus, setGoogleStatus] = useState<AuthStatus | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(true);
  const [googleLoadError, setGoogleLoadError] = useState<string | null>(null);
  
  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(true);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Discord state
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);

  // Facebook state
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [isLoadingFacebook, setIsLoadingFacebook] = useState(true);
  const [isTestingFacebook, setIsTestingFacebook] = useState(false);
  
  const location = useLocation();
  const settings = useSettings(onUserUpdate);

  const loadGoogleStatus = useCallback(async () => {
    try {
      setIsLoadingGoogle(true);
      setGoogleLoadError(null);
      const status = await authApi.getGoogleAuthStatus();
      setGoogleStatus(status);
      
      // Check for authentication issues
      if (status.authenticated === false && status.error) {
        setGoogleLoadError(status.error);
      }
    } catch (error: any) {
      console.error('Failed to load Google status:', error);
      setGoogleLoadError(
        error.response?.data?.error || 
        error.message || 
        'Failed to check Google connection status. Make sure the backend server is running.'
      );
      setGoogleStatus(null);
    } finally {
      setIsLoadingGoogle(false);
    }
  }, []);

  const loadTelegramStatus = useCallback(async () => {
    try {
      setIsLoadingTelegram(true);
      const status = await authApi.getTelegramStatus();
      setTelegramStatus(status);
    } catch (error: any) {
      console.error('Failed to load Telegram status:', error);
      setTelegramStatus({
        configured: false,
        connected: false,
        error: 'Failed to check status'
      });
    } finally {
      setIsLoadingTelegram(false);
    }
  }, []);

  const handleTestTelegram = async () => {
    try {
      setIsTestingTelegram(true);
      const result = await authApi.testTelegramConnection();
      if (result.success) {
        alert('✅ ' + result.message);
        // Reload status to update connected state
        loadTelegramStatus();
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error: any) {
      alert('❌ Failed to test connection');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const loadDiscordStatus = useCallback(async () => {
    try {
      setIsLoadingDiscord(true);
      const status = await authApi.getDiscordStatus();
      setDiscordStatus(status);
    } catch (error: any) {
      console.error('Failed to load Discord status:', error);
      setDiscordStatus({
        configured: false,
        connected: false,
        error: 'Failed to check status'
      });
    } finally {
      setIsLoadingDiscord(false);
    }
  }, []);

  const handleTestDiscord = async () => {
    try {
      setIsTestingDiscord(true);
      const result = await authApi.testDiscordConnection();
      if (result.success) {
        alert('✅ ' + result.message);
        // Reload status to update connected state
        loadDiscordStatus();
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error: any) {
      alert('❌ Failed to test connection');
    } finally {
      setIsTestingDiscord(false);
    }
  };

  const loadFacebookStatus = useCallback(async () => {
    try {
      setIsLoadingFacebook(true);
      const status = await authApi.getFacebookStatus();
      setFacebookStatus(status);
    } catch (error: any) {
      console.error('Failed to load Facebook status:', error);
      setFacebookStatus({
        configured: false,
        connected: false,
        error: 'Failed to check status'
      });
    } finally {
      setIsLoadingFacebook(false);
    }
  }, []);

  const handleTestFacebook = async () => {
    try {
      setIsTestingFacebook(true);
      const result = await authApi.testFacebookConnection();
      if (result.success) {
        alert('✅ ' + result.message);
        // Reload status to update connected state
        loadFacebookStatus();
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error: any) {
      alert('❌ Failed to test connection');
    } finally {
      setIsTestingFacebook(false);
    }
  };

  // Load Google, Telegram, Discord, Facebook status and user preferences on mount
  useEffect(() => {
    loadGoogleStatus();
    loadTelegramStatus();
    loadDiscordStatus();
    loadFacebookStatus();
    if (user?.preferences) {
      settings.loadPreferences(user.preferences);
    }
  }, [user, loadGoogleStatus, loadTelegramStatus, loadDiscordStatus, loadFacebookStatus]);

  // Reload Google status when returning from OAuth (URL has auth param)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('auth') === 'success') {
      // OAuth just completed, reload status
      loadGoogleStatus();
    }
  }, [location.search, loadGoogleStatus]);

  // Reload Google status when window regains focus (in case OAuth completed)
  useEffect(() => {
    const handleFocus = () => {
      // Only reload if we're on the integrations section
      if (activeSection === 'integrations') {
        loadGoogleStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeSection, loadGoogleStatus]);

  const handleGoogleConnect = () => {
    window.location.href = authApi.getGoogleAuthUrl();
  };

  const handleGoogleDisconnect = async () => {
    try {
      setIsLoadingGoogle(true);
      await authApi.disconnectGoogle();
      await loadGoogleStatus();
    } catch (error) {
      console.error('Failed to disconnect Google:', error);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handlePreferencesChange = (updates: Partial<UserPreferences>) => {
    settings.setPreferences(prev => ({ ...prev, ...updates }));
  };

  // Render the active section
  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} />;
      case 'integrations':
        return (
          <IntegrationsSection
            googleStatus={googleStatus}
            isLoading={isLoadingGoogle}
            loadError={googleLoadError}
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            onRetry={loadGoogleStatus}
            telegramStatus={telegramStatus}
            isLoadingTelegram={isLoadingTelegram}
            isTestingTelegram={isTestingTelegram}
            onTestTelegram={handleTestTelegram}
            onRetryTelegram={loadTelegramStatus}
            discordStatus={discordStatus}
            isLoadingDiscord={isLoadingDiscord}
            isTestingDiscord={isTestingDiscord}
            onTestDiscord={handleTestDiscord}
            onRetryDiscord={loadDiscordStatus}
            facebookStatus={facebookStatus}
            isLoadingFacebook={isLoadingFacebook}
            isTestingFacebook={isTestingFacebook}
            onTestFacebook={handleTestFacebook}
            onRetryFacebook={loadFacebookStatus}
          />
        );
      case 'jobs':
        return <JobPreferencesSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      case 'travel':
        return <TravelPreferencesSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      case 'coding':
        return <CodingPreferencesSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      case 'todo':
        return <ToDoSettingsSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      case 'shopping':
        return <ShoppingSettingsSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      case 'notifications':
        return <NotificationsSection preferences={settings.preferences} onChange={handlePreferencesChange} />;
      default:
        return <ProfileSection user={user} />;
    }
  };

  // Show sign-in prompt if user is not authenticated
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>
            <Settings className={styles.headerIcon} />
            <span className={styles.headerTitleText}>Settings</span>
          </h1>
          <p className={styles.headerSubtitle}>Manage your preferences and integrations</p>
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '4rem',
          textAlign: 'center'
        }}>
          <User style={{ width: '4rem', height: '4rem', color: 'rgba(148, 163, 184, 0.5)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Sign In Required
          </h2>
          <p style={{ color: 'rgb(148, 163, 184)', marginBottom: '1.5rem' }}>
            Please sign in to access your settings and preferences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>
          <Settings className={styles.headerIcon} />
          <span className={styles.headerTitleText}>Settings</span>
        </h1>
        <p className={styles.headerSubtitle}>Manage your preferences and integrations</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Navigation */}
        <div className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`${styles.sidebarItem} ${activeSection === id ? styles.sidebarItemActive : ''}`}
              >
                <Icon className={styles.sidebarItemIcon} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Panel */}
        <div className={styles.content}>
          {renderSection()}

          {/* Save Button */}
          <div className={styles.footer}>
            <button
              onClick={settings.savePreferences}
              disabled={settings.isSaving}
              className={`${styles.saveButton} ${settings.saveSuccess ? styles.saveButtonSuccess : styles.saveButtonDefault}`}
            >
              {settings.isSaving ? (
                <Loader2 className={`${styles.saveButtonIcon} ${commonStyles.spinner}`} />
              ) : settings.saveSuccess ? (
                <Check className={styles.saveButtonIcon} />
              ) : (
                <Save className={styles.saveButtonIcon} />
              )}
              {settings.saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
