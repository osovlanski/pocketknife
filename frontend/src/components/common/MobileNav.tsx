/**
 * MobileNav Component
 * 
 * Mobile navigation drawer with hamburger menu trigger.
 * Provides a slide-out navigation panel for small screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, Settings, Shield, User, LogOut, ChevronRight,
  Mail, Briefcase, Plane, BookOpen, Code, CheckSquare, 
  ShoppingCart, Utensils, Newspaper, Wrench
} from 'lucide-react';
import type { CurrentUser } from '../../services/authApi';
import styles from '../../styles/mobile.module.css';

interface MobileNavProps {
  user: CurrentUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  onSignInClick: () => void;
  onSignOut: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<any>;
  path: string;
  color: string;
}

const agentItems: NavItem[] = [
  { id: 'email', label: 'Email Agent', icon: Mail, path: '/agents/email', color: '#60a5fa' },
  { id: 'jobs', label: 'Jobs Agent', icon: Briefcase, path: '/agents/jobs', color: '#c084fc' },
  { id: 'travel', label: 'Travel Agent', icon: Plane, path: '/agents/travel', color: '#4ade80' },
  { id: 'learning', label: 'Learning Agent', icon: BookOpen, path: '/agents/learning', color: '#fbbf24' },
  { id: 'problems', label: 'Problem Solving', icon: Code, path: '/agents/problems', color: '#22d3ee' },
  { id: 'todo', label: 'ToDo Agent', icon: CheckSquare, path: '/agents/todo', color: '#34d399' },
  { id: 'shopping', label: 'Shopping Agent', icon: ShoppingCart, path: '/agents/shopping', color: '#fb923c' },
  { id: 'cooking', label: 'Cooking Agent', icon: Utensils, path: '/agents/cooking', color: '#a3e635' },
  { id: 'news', label: 'News Agent', icon: Newspaper, path: '/agents/news', color: '#f87171' },
  { id: 'diy', label: 'DIY Agent', icon: Wrench, path: '/agents/diy', color: '#fbbf24' },
];

const MobileNav: React.FC<MobileNavProps> = ({
  user,
  isAdmin,
  isLoading,
  onSignInClick,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    setIsOpen(false);
    onSignOut();
  }, [onSignOut]);

  const handleSignIn = useCallback(() => {
    setIsOpen(false);
    onSignInClick();
  }, [onSignInClick]);

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        className={styles.hamburgerButton}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        {isOpen ? (
          <X className={styles.hamburgerIcon} />
        ) : (
          <Menu className={styles.hamburgerIcon} />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer */}
      <nav
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* User Section */}
        <div className={styles.drawerHeader}>
          {user ? (
            <div className={styles.userSection}>
              <div className={styles.userAvatar}>
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name || 'User'}</span>
                <span className={styles.userEmail}>{user.email}</span>
                {user.role && user.role !== 'USER' && (
                  <span className={`${styles.userRole} ${styles[`role${user.role}`]}`}>
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              className={styles.signInButton}
              onClick={handleSignIn}
              disabled={isLoading}
            >
              <User className={styles.signInIcon} />
              {isLoading ? 'Loading...' : 'Sign In'}
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <div className={styles.drawerContent}>
          {/* Quick Links */}
          <div className={styles.navSection}>
            <Link
              to="/"
              className={`${styles.navItem} ${location.pathname === '/' ? styles.navItemActive : ''}`}
              onClick={handleClose}
            >
              <Home className={styles.navItemIcon} />
              <span>Home</span>
              <ChevronRight className={styles.navItemArrow} />
            </Link>

            <Link
              to="/settings"
              className={`${styles.navItem} ${location.pathname === '/settings' ? styles.navItemActive : ''}`}
              onClick={handleClose}
            >
              <Settings className={styles.navItemIcon} />
              <span>Settings</span>
              <ChevronRight className={styles.navItemArrow} />
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`${styles.navItem} ${styles.navItemAdmin} ${location.pathname === '/admin' ? styles.navItemActive : ''}`}
                onClick={handleClose}
              >
                <Shield className={styles.navItemIcon} />
                <span>Admin Panel</span>
                <ChevronRight className={styles.navItemArrow} />
              </Link>
            )}
          </div>

          {/* Agents Section */}
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>AI Agents</span>
            {agentItems.map(({ id, label, icon: Icon, path, color }) => (
              <Link
                key={id}
                to={path}
                className={`${styles.navItem} ${location.pathname === path ? styles.navItemActive : ''}`}
                onClick={handleClose}
              >
                <Icon className={styles.navItemIcon} style={{ color }} />
                <span>{label}</span>
                <ChevronRight className={styles.navItemArrow} />
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        {user && (
          <div className={styles.drawerFooter}>
            <button
              className={styles.signOutButton}
              onClick={handleSignOut}
            >
              <LogOut className={styles.signOutIcon} />
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default MobileNav;

