/**
 * UserMenu Component
 * 
 * Dropdown menu for user actions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Settings, Shield, LogOut } from 'lucide-react';
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
            <span className={`${styles.userMenuRole} ${getRoleClassName()}`}>
              {user.role.replace('_', ' ')}
            </span>
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



