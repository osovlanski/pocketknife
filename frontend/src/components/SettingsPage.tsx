/**
 * SettingsPage Component
 * 
 * User settings page with separated concerns:
 * - Uses custom hooks for state management
 * - Uses modular CSS for styling
 * - Separated into logical sections
 */

import React, { useState, useEffect } from 'react';
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
import type { CurrentUser, UserPreferences, AuthStatus } from '../services/authApi';

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
          className={styles.formInput}
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
  onConnect: () => void;
  onDisconnect: () => void;
}

const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  googleStatus,
  isLoading,
  onConnect,
  onDisconnect
}) => (
  <div className={styles.sectionContent}>
    <h2 className={styles.sectionTitle}>Integrations</h2>
    
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
              {googleStatus?.authenticated
                ? `Connected as ${googleStatus.email}`
                : 'Connect for Gmail, Calendar, and Drive access'}
            </p>
          </div>
        </div>
        
        {googleStatus?.authenticated ? (
          <button
            onClick={onDisconnect}
            disabled={isLoading}
            className={`${commonStyles.btn} ${commonStyles.btnDanger}`}
          >
            {isLoading ? <Loader2 className={commonStyles.spinner} style={{ width: '1rem', height: '1rem' }} /> : <Unlink style={{ width: '1rem', height: '1rem' }} />}
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

    {/* Telegram (Coming Soon) */}
    <div className={`${styles.integrationCard} ${styles.integrationCardDisabled}`}>
      <div className={styles.integrationInfo}>
        <div className={`${styles.integrationIcon} ${styles.integrationIconTelegram}`}>
          <Mail style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
        </div>
        <div>
          <h3 className={styles.integrationTitle}>Telegram</h3>
          <p className={styles.integrationDescription}>Coming soon - Get notifications via Telegram</p>
        </div>
      </div>
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
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  
  const settings = useSettings(onUserUpdate);

  // Load Google status and user preferences on mount
  useEffect(() => {
    loadGoogleStatus();
    if (user?.preferences) {
      settings.loadPreferences(user.preferences);
    }
  }, [user]);

  const loadGoogleStatus = async () => {
    try {
      const status = await authApi.getGoogleAuthStatus();
      setGoogleStatus(status);
    } catch (error) {
      console.error('Failed to load Google status:', error);
    }
  };

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
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
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
