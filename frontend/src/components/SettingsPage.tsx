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
  Save,
  Loader2,
  Link2,
  Check
} from 'lucide-react';

// Components
import IntegrationCard, { IntegrationStatus, IntegrationDetail } from './common/IntegrationCard';

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
  isTestingGoogle: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestGoogle: () => void;
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

// =============================================================================
// BRAND ICONS (SVG Components)
// =============================================================================

const GoogleIcon: React.FC = () => (
  <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const TelegramIcon: React.FC = () => (
  <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24" fill="#0088CC">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const DiscordIcon: React.FC = () => (
  <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const FacebookIcon: React.FC = () => (
  <svg style={{ width: '1.5rem', height: '1.5rem' }} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getGoogleStatus = (googleStatus: AuthStatus | null, isLoading: boolean): IntegrationStatus => {
  if (isLoading) return 'loading';
  if (googleStatus?.authenticated) return 'connected';
  return 'not_configured';
};

const getGoogleStatusText = (googleStatus: AuthStatus | null, isLoading: boolean): string => {
  if (isLoading) return 'Checking connection status...';
  if (googleStatus?.authenticated) return `Connected as ${googleStatus.email}`;
  return 'Connect for Gmail, Calendar, and Drive access';
};

const getGoogleDetails = (googleStatus: AuthStatus | null): IntegrationDetail[] => {
  if (!googleStatus?.authenticated) return [];
  return [
    { label: 'Permission', value: 'Gmail', color: 'blue' },
    { label: 'Permission', value: 'Calendar', color: 'green' },
    { label: 'Permission', value: 'Drive', color: 'amber' },
  ];
};

const getTelegramIntegrationStatus = (status: TelegramStatus | null, isLoading: boolean): IntegrationStatus => {
  if (isLoading) return 'loading';
  if (status?.connected) return 'connected';
  if (status?.configured && status?.error) return 'error';
  if (status?.configured) return 'configured';
  return 'not_configured';
};

const getTelegramStatusText = (status: TelegramStatus | null, isLoading: boolean): string => {
  if (isLoading) return 'Checking connection status...';
  if (status?.connected) return `Connected to @${status.botUsername || 'bot'}`;
  if (status?.error) return `Error: ${status.error}`;
  if (status?.configured) return 'Configured - Click Test to verify';
  return 'Not configured';
};

const getTelegramDetails = (status: TelegramStatus | null): IntegrationDetail[] => {
  if (!status?.connected) return [];
  return [
    { label: 'Bot', value: `@${status.botUsername}`, color: 'blue' },
    { label: 'Chat ID', value: status.chatId || 'N/A', color: 'green' },
  ];
};

const getDiscordIntegrationStatus = (status: DiscordStatus | null, isLoading: boolean): IntegrationStatus => {
  if (isLoading) return 'loading';
  if (status?.connected) return 'connected';
  if (status?.error) return 'error';
  if (status?.configured) return 'configured';
  return 'not_configured';
};

const getDiscordStatusText = (status: DiscordStatus | null, isLoading: boolean): string => {
  if (isLoading) return 'Checking connection status...';
  if (status?.connected) return `Connected to ${status.webhookUrl || 'webhook'}`;
  if (status?.error) return `Error: ${status.error}`;
  if (status?.configured) return 'Configured - Click Test to verify';
  return 'Not configured';
};

const getDiscordDetails = (status: DiscordStatus | null): IntegrationDetail[] => {
  if (!status?.connected) return [];
  return [
    { label: 'Channel', value: status.webhookUrl || 'Webhook', color: 'primary' },
  ];
};

const getFacebookIntegrationStatus = (status: FacebookStatus | null, isLoading: boolean): IntegrationStatus => {
  if (isLoading) return 'loading';
  if (status?.connected) return 'connected';
  if (status?.error) return 'error';
  if (status?.configured) return 'configured';
  return 'not_configured';
};

const getFacebookStatusText = (status: FacebookStatus | null, isLoading: boolean): string => {
  if (isLoading) return 'Checking connection status...';
  if (status?.connected) return `Connected to ${status.appName || 'Facebook App'}`;
  if (status?.error) return `Error: ${status.error}`;
  if (status?.configured) return 'Configured - Click Test to verify';
  return 'Not configured';
};

const getFacebookDetails = (status: FacebookStatus | null): IntegrationDetail[] => {
  if (!status?.connected) return [];
  return [
    { label: 'App', value: status.appName || 'Facebook App', color: 'blue' },
  ];
};

// =============================================================================
// INTEGRATIONS SECTION COMPONENT
// =============================================================================

const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  googleStatus,
  isLoading,
  loadError,
  isTestingGoogle,
  onConnect,
  onDisconnect,
  onTestGoogle,
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
      <div className={styles.integrationSetupBox} style={{ 
        borderColor: 'rgba(239, 68, 68, 0.3)',
        background: 'rgba(239, 68, 68, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(248, 113, 113)' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>{loadError}</span>
          </div>
          <button
            onClick={onRetry}
            className={`${styles.integrationBtn} ${styles.integrationBtnRetry}`}
            style={{ minWidth: 'auto' }}
          >
            Retry
          </button>
        </div>
      </div>
    )}
    
    {/* Google Integration */}
    <IntegrationCard
      name="Google Account"
      icon={<GoogleIcon />}
      brandColor="Google"
      status={getGoogleStatus(googleStatus, isLoading)}
      statusText={getGoogleStatusText(googleStatus, isLoading)}
      isLoading={isLoading}
      isActionInProgress={isTestingGoogle}
      actionInProgressLabel="Testing..."
      details={getGoogleDetails(googleStatus)}
      detailsTitle="Permissions granted:"
      onConnect={onConnect}
      onTest={googleStatus?.authenticated ? onTestGoogle : undefined}
      onDisconnect={googleStatus?.authenticated ? onDisconnect : undefined}
    />

    {/* Telegram Integration */}
    <IntegrationCard
      name="Telegram"
      icon={<TelegramIcon />}
      brandColor="Telegram"
      status={getTelegramIntegrationStatus(telegramStatus, isLoadingTelegram)}
      statusText={getTelegramStatusText(telegramStatus, isLoadingTelegram)}
      isLoading={isLoadingTelegram}
      isActionInProgress={isTestingTelegram}
      actionInProgressLabel="Sending..."
      details={getTelegramDetails(telegramStatus)}
      onTest={telegramStatus?.connected || telegramStatus?.configured ? onTestTelegram : undefined}
      onRetry={telegramStatus?.error ? onRetryTelegram : undefined}
      setupInstructions={
        <ol className={styles.integrationSetupList}>
          <li>Create a bot with <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram</li>
          <li>Copy the bot token to <code>TELEGRAM_BOT_TOKEN</code> in .env</li>
          <li>Send any message to your bot, then get your chat ID from the API</li>
          <li>Add the chat ID to <code>TELEGRAM_CHAT_ID</code> in .env</li>
          <li>Restart the backend server</li>
        </ol>
      }
    />

    {/* Discord Integration */}
    <IntegrationCard
      name="Discord"
      icon={<DiscordIcon />}
      brandColor="Discord"
      status={getDiscordIntegrationStatus(discordStatus, isLoadingDiscord)}
      statusText={getDiscordStatusText(discordStatus, isLoadingDiscord)}
      isLoading={isLoadingDiscord}
      isActionInProgress={isTestingDiscord}
      actionInProgressLabel="Sending..."
      details={getDiscordDetails(discordStatus)}
      onTest={discordStatus?.connected || discordStatus?.configured ? onTestDiscord : undefined}
      onRetry={discordStatus?.error ? onRetryDiscord : undefined}
      setupInstructions={
        <ol className={styles.integrationSetupList}>
          <li>Open Discord and go to Server Settings → Integrations → Webhooks</li>
          <li>Click "New Webhook" and choose a channel</li>
          <li>Copy the Webhook URL</li>
          <li>Add it to <code>DISCORD_WEBHOOK_URL</code> in .env</li>
          <li>Restart the backend server</li>
        </ol>
      }
    />

    {/* Facebook Integration */}
    <IntegrationCard
      name="Facebook"
      icon={<FacebookIcon />}
      brandColor="Facebook"
      status={getFacebookIntegrationStatus(facebookStatus, isLoadingFacebook)}
      statusText={getFacebookStatusText(facebookStatus, isLoadingFacebook)}
      isLoading={isLoadingFacebook}
      isActionInProgress={isTestingFacebook}
      actionInProgressLabel="Sending..."
      details={getFacebookDetails(facebookStatus)}
      onTest={facebookStatus?.connected || facebookStatus?.configured ? onTestFacebook : undefined}
      onRetry={facebookStatus?.error ? onRetryFacebook : undefined}
      setupInstructions={
        <ol className={styles.integrationSetupList}>
          <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">Facebook Developers</a></li>
          <li>Create a new app or select an existing one</li>
          <li>Copy the App ID to <code>FACEBOOK_APP_ID</code> in .env</li>
          <li>Copy the App Secret to <code>FACEBOOK_APP_SECRET</code> in .env</li>
          <li>Restart the backend server</li>
        </ol>
      }
    />
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
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  
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

  const handleTestGoogle = async () => {
    try {
      setIsTestingGoogle(true);
      // Re-check auth status to verify connection is still valid
      const status = await authApi.getGoogleAuthStatus();
      if (status.authenticated) {
        alert('✅ Google connection is working! Connected as ' + status.email);
        setGoogleStatus(status);
      } else {
        alert('❌ Google connection failed: ' + (status.error || 'Not authenticated'));
        setGoogleStatus(status);
      }
    } catch (error: any) {
      alert('❌ Failed to test connection: ' + (error.message || 'Unknown error'));
    } finally {
      setIsTestingGoogle(false);
    }
  };

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
            isTestingGoogle={isTestingGoogle}
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            onTestGoogle={handleTestGoogle}
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
