/**
 * UserMenu Component
 * 
 * Dropdown menu for user actions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Settings, Shield, LogOut, Crown, UserCircle } from 'lucide-react';
import type { CurrentUser } from '../../services/authApi';
import styles from '../../styles/layout.module.css';

export interface UserMenuProps {
  user: CurrentUser;
  isAdmin: boolean;
  onSettingsClick: () => void;
  onAdminClick: () => void;
  onSignOut: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  user,
  isAdmin,
  onSettingsClick,
  onAdminClick,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getRoleClassName = () => {
    switch (user.role) {
      case 'SUPER_ADMIN': return styles.userMenuRoleSuperAdmin;
      case 'ADMIN': return styles.userMenuRoleAdmin;
      default: return styles.userMenuRoleUser;
    }
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'SUPER_ADMIN': return <Crown style={{ width: '0.875rem', height: '0.875rem' }} />;
      case 'ADMIN': return <Shield style={{ width: '0.875rem', height: '0.875rem' }} />;
      default: return <UserCircle style={{ width: '0.875rem', height: '0.875rem' }} />;
    }
  };

  const getRoleLabel = () => {
    switch (user.role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN': return 'Admin';
      default: return 'User';
    }
  };

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      <button
        className={styles.userMenuButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={styles.userAvatar}>
          {user.name?.[0] || user.email[0].toUpperCase()}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name || 'User'}</div>
          <div className={styles.userEmail}>{user.email}</div>
        </div>
        <ChevronDown style={{ width: '1rem', height: '1rem', color: 'rgb(148, 163, 184)' }} />
      </button>

      {isOpen && (
        <div className={styles.userMenuDropdown}>
          <div className={styles.userMenuHeader}>
            <div className={styles.userMenuHeaderName}>{user.name || 'User'}</div>
            <div className={styles.userMenuHeaderEmail}>{user.email}</div>
            <div className={`${styles.userMenuRole} ${getRoleClassName()}`}>
              {getRoleIcon()}
              <span>{getRoleLabel()}</span>
            </div>
          </div>

          <button
            className={styles.userMenuItem}
            onClick={() => { onSettingsClick(); setIsOpen(false); }}
          >
            <Settings className={styles.userMenuItemIcon} />
            Settings
          </button>

          {isAdmin && (
            <button
              className={styles.userMenuItem}
              onClick={() => { onAdminClick(); setIsOpen(false); }}
            >
              <Shield className={styles.userMenuItemIcon} />
              Admin Panel
            </button>
          )}

          <div className={styles.userMenuDivider} />

          <button
            className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
            onClick={() => { onSignOut(); setIsOpen(false); }}
          >
            <LogOut className={styles.userMenuItemIcon} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;




