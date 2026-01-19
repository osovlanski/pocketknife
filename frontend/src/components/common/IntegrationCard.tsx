/**
 * IntegrationCard Component
 * 
 * A standardized, reusable component for displaying integration status cards.
 * Provides consistent UI/UX across all integration types (Google, Telegram, Discord, Facebook, etc.)
 */

import React, { ReactNode } from 'react';
import { Loader2, Check, RefreshCw, Link2, Unlink, AlertCircle, Settings } from 'lucide-react';
import styles from '../../styles/settings.module.css';

// =============================================================================
// Types
// =============================================================================

export type IntegrationStatus = 'connected' | 'configured' | 'error' | 'not_configured' | 'loading';

export interface IntegrationDetail {
  label: string;
  value: string;
  color?: 'blue' | 'green' | 'amber' | 'primary';
}

export interface IntegrationCardProps {
  /** Integration name displayed as title */
  name: string;
  /** Brand icon (SVG element or Lucide icon) */
  icon: ReactNode;
  /** Brand color for icon background - use CSS class name without prefix */
  brandColor: 'Google' | 'Telegram' | 'Discord' | 'Facebook';
  /** Current connection status */
  status: IntegrationStatus;
  /** Description text based on status */
  statusText: string;
  /** Loading state */
  isLoading?: boolean;
  /** Action in progress (testing, sending, etc.) */
  isActionInProgress?: boolean;
  /** Action in progress label */
  actionInProgressLabel?: string;
  /** Details to show when connected (permissions, channel, etc.) */
  details?: IntegrationDetail[];
  /** Details section title */
  detailsTitle?: string;
  /** Setup instructions for not configured state */
  setupInstructions?: ReactNode;
  /** Connect handler (for OAuth-based integrations like Google) */
  onConnect?: () => void;
  /** Disconnect handler */
  onDisconnect?: () => void;
  /** Test connection handler */
  onTest?: () => void;
  /** Retry handler for error states */
  onRetry?: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatusDotProps {
  status: IntegrationStatus;
}

const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const getDotClass = (): string => {
    switch (status) {
      case 'connected':
        return styles.integrationStatusDotConnected;
      case 'configured':
        return styles.integrationStatusDotConfigured;
      case 'error':
        return styles.integrationStatusDotError;
      default:
        return styles.integrationStatusDotNotConfigured;
    }
  };

  return (
    <span 
      className={`${styles.integrationStatusDot} ${getDotClass()}`}
      aria-hidden="true"
    />
  );
};

// =============================================================================
// Main Component
// =============================================================================

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  icon,
  brandColor,
  status,
  statusText,
  isLoading = false,
  isActionInProgress = false,
  actionInProgressLabel = 'Processing...',
  details,
  detailsTitle = 'Connection details:',
  setupInstructions,
  onConnect,
  onDisconnect,
  onTest,
  onRetry,
}) => {
  // Determine card state class
  const getCardStateClass = (): string => {
    if (isLoading) return '';
    switch (status) {
      case 'connected':
        return styles.integrationCardConnected;
      case 'error':
        return styles.integrationCardError;
      case 'configured':
        return styles.integrationCardPending;
      default:
        return '';
    }
  };

  // Determine if card should appear disabled
  const isDisabled = status === 'not_configured' && !isLoading;

  // Get brand icon background class
  const getIconBrandClass = (): string => {
    switch (brandColor) {
      case 'Google':
        return styles.integrationIconBrandGoogle;
      case 'Telegram':
        return styles.integrationIconBrandTelegram;
      case 'Discord':
        return styles.integrationIconBrandDiscord;
      case 'Facebook':
        return styles.integrationIconBrandFacebook;
      default:
        return '';
    }
  };

  // Get detail tag color class
  const getDetailColorClass = (color?: string): string => {
    switch (color) {
      case 'blue':
        return styles.integrationTagBlue;
      case 'green':
        return styles.integrationTagGreen;
      case 'amber':
        return styles.integrationTagAmber;
      case 'primary':
        return styles.integrationTagPrimary;
      default:
        return styles.integrationTagBlue;
    }
  };

  // Render action button based on status
  const renderActionButton = (): ReactNode => {
    if (isLoading) {
      return (
        <div className={styles.integrationStatus}>
          <Loader2 
            style={{ width: '1.25rem', height: '1.25rem', color: 'rgb(148, 163, 184)' }}
            className={styles.spinner}
            aria-label="Loading"
          />
        </div>
      );
    }

    // Connected state - show Test or Disconnect
    if (status === 'connected') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onTest && (
            <button
              onClick={onTest}
              disabled={isActionInProgress}
              className={`${styles.integrationBtn} ${styles.integrationBtnTest}`}
              aria-label={`Test ${name} connection`}
              tabIndex={0}
            >
              {isActionInProgress ? (
                <>
                  <Loader2 style={{ width: '1rem', height: '1rem' }} className={styles.spinner} />
                  {actionInProgressLabel}
                </>
              ) : (
                <>
                  <Check style={{ width: '1rem', height: '1rem' }} />
                  Test Connection
                </>
              )}
            </button>
          )}
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className={`${styles.integrationBtn} ${styles.integrationBtnDisconnect}`}
              aria-label={`Disconnect ${name}`}
              tabIndex={0}
            >
              <Unlink style={{ width: '1rem', height: '1rem' }} />
              Disconnect
            </button>
          )}
        </div>
      );
    }

    // Configured but not verified - show Test button
    if (status === 'configured') {
      return (
        <button
          onClick={onTest}
          disabled={isActionInProgress}
          className={`${styles.integrationBtn} ${styles.integrationBtnTest}`}
          aria-label={`Test ${name} connection`}
          tabIndex={0}
        >
          {isActionInProgress ? (
            <>
              <Loader2 style={{ width: '1rem', height: '1rem' }} className={styles.spinner} />
              {actionInProgressLabel}
            </>
          ) : (
            <>
              <Check style={{ width: '1rem', height: '1rem' }} />
              Test Connection
            </>
          )}
        </button>
      );
    }

    // Error state - show Retry button
    if (status === 'error') {
      return (
        <button
          onClick={onRetry}
          className={`${styles.integrationBtn} ${styles.integrationBtnRetry}`}
          aria-label={`Retry ${name} connection`}
          tabIndex={0}
        >
          <RefreshCw style={{ width: '1rem', height: '1rem' }} />
          Retry
        </button>
      );
    }

    // Not configured - show Connect button if available
    if (status === 'not_configured' && onConnect) {
      return (
        <button
          onClick={onConnect}
          className={`${styles.integrationBtn} ${styles.integrationBtnConnect}`}
          aria-label={`Connect ${name}`}
          tabIndex={0}
        >
          <Link2 style={{ width: '1rem', height: '1rem' }} />
          Connect
        </button>
      );
    }

    // Not configured with no connect handler - show Configure hint
    if (status === 'not_configured') {
      return (
        <button
          disabled
          className={`${styles.integrationBtn} ${styles.integrationBtnConfigure}`}
          aria-label={`${name} needs configuration`}
        >
          <Settings style={{ width: '1rem', height: '1rem' }} />
          Not Configured
        </button>
      );
    }

    return null;
  };

  return (
    <div 
      className={`${styles.integrationCard} ${getCardStateClass()} ${isDisabled ? styles.integrationCardDisabled : ''}`}
      role="article"
      aria-label={`${name} integration`}
    >
      {/* Header */}
      <div className={styles.integrationHeader}>
        <div className={styles.integrationInfo}>
          {/* Brand Icon */}
          <div className={`${styles.integrationIcon} ${getIconBrandClass()}`}>
            {icon}
          </div>
          
          {/* Title and Status */}
          <div>
            <h3 className={styles.integrationTitle}>{name}</h3>
            <div className={styles.integrationStatus}>
              {!isLoading && <StatusDot status={status} />}
              <p className={styles.integrationDescription}>
                {statusText}
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        {renderActionButton()}
      </div>
      
      {/* Details Section (when connected) */}
      {status === 'connected' && details && details.length > 0 && (
        <div className={styles.integrationPermissions}>
          <h4 className={styles.integrationPermissionsTitle}>{detailsTitle}</h4>
          <div className={styles.integrationTags}>
            {details.map((detail, index) => (
              <span 
                key={index}
                className={`${styles.integrationTag} ${getDetailColorClass(detail.color)}`}
              >
                {detail.label}: {detail.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions (when not configured) */}
      {status === 'not_configured' && setupInstructions && (
        <div className={styles.integrationSetupBox}>
          <div className={styles.integrationSetupTitle}>
            <AlertCircle style={{ width: '1rem', height: '1rem' }} />
            Setup Instructions
          </div>
          {setupInstructions}
        </div>
      )}
    </div>
  );
};

export default IntegrationCard;





