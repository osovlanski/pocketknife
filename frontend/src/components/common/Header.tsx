/**
 * Header Component
 * 
 * App header with logo and user actions.
 * Supports React Router navigation.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench, Settings, Shield, User, Home, ChevronRight } from 'lucide-react';
import UserMenu from './UserMenu';
import type { CurrentUser } from '../../services/authApi';
import styles from '../../styles/layout.module.css';

export interface HeaderProps {
  user: CurrentUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  activeView: string;
  onHomeClick?: () => void;
  onSettingsClick: () => void;
  onAdminClick: () => void;
  onSignInClick: () => void;
  onSignOut: () => void;
}

// Helper to get breadcrumb from path
const getBreadcrumb = (pathname: string): { label: string; icon?: React.FC<any> } | null => {
  if (pathname === '/') return null;
  if (pathname === '/settings') return { label: 'Settings', icon: Settings };
  if (pathname === '/admin') return { label: 'Admin', icon: Shield };
  if (pathname.startsWith('/agents/')) {
    const agent = pathname.split('/')[2];
    const agentNames: Record<string, string> = {
      email: 'Email Agent',
      jobs: 'Jobs Agent',
      travel: 'Travel Agent',
      learning: 'Learning Agent',
      problems: 'Problem Solving',
      todo: 'ToDo Agent',
      shopping: 'Shopping Agent'
    };
    return { label: agentNames[agent] || 'Agent' };
  }
  return null;
};

const Header: React.FC<HeaderProps> = ({
  user,
  isLoading,
  isAdmin,
  activeView,
  onHomeClick,
  onSettingsClick,
  onAdminClick,
  onSignInClick,
  onSignOut
}) => {
  const location = useLocation();
  const breadcrumb = getBreadcrumb(location.pathname);
  const isHome = location.pathname === '/';

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Logo - clickable to go home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link 
            to="/" 
            className={styles.logo}
            style={{ textDecoration: 'none' }}
          >
            <div className={styles.logoIcon}>
              <Wrench style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
            </div>
            <div>
              <h1 className={styles.logoText}>Pocketknife</h1>
              <span className={styles.logoSubtext}>Multi-Agent AI Platform</span>
            </div>
          </Link>

          {/* Breadcrumb */}
          {breadcrumb && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'rgb(148, 163, 184)'
            }}>
              <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              {breadcrumb.icon && (
                <breadcrumb.icon style={{ width: '1rem', height: '1rem' }} />
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {breadcrumb.label}
              </span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className={styles.headerActions}>
          {/* Home Button (when not on home) */}
          {!isHome && (
            <Link
              to="/"
              className={styles.headerButton}
              style={{ textDecoration: 'none' }}
            >
              <Home style={{ width: '1.25rem', height: '1.25rem' }} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          )}

          {/* Settings Button */}
          <Link
            to="/settings"
            className={`${styles.headerButton} ${activeView === 'settings' ? styles.headerButtonActive : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <Settings style={{ width: '1.25rem', height: '1.25rem' }} />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {/* Admin Button (only for admins) */}
          {isAdmin && (
            <Link
              to="/admin"
              className={`${styles.headerButton} ${styles.headerButtonAdmin} ${activeView === 'admin' ? styles.headerButtonActive : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Shield style={{ width: '1.25rem', height: '1.25rem' }} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* Divider */}
          <div style={{ width: '1px', height: '2rem', background: 'rgba(255, 255, 255, 0.1)', margin: '0 0.5rem' }} />

          {/* User Menu or Sign In */}
          {isLoading ? (
            <div className={styles.userAvatar} style={{ animation: 'pulse 2s infinite', background: 'rgba(255, 255, 255, 0.1)' }} />
          ) : user ? (
            <UserMenu
              user={user}
              isAdmin={isAdmin}
              onSettingsClick={onSettingsClick}
              onAdminClick={onAdminClick}
              onSignOut={onSignOut}
            />
          ) : (
            <button className={styles.signInButton} onClick={onSignInClick}>
              <User style={{ width: '1.25rem', height: '1.25rem' }} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
