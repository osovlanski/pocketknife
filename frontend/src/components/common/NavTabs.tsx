/**
 * NavTabs Component
 * 
 * Navigation tabs for agent views with React Router support.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import styles from '../../styles/layout.module.css';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  path?: string;
  badge?: number;
  pulseBadge?: number;
}

export interface NavTabsProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

const colorBorderMap: Record<string, string> = {
  blue: 'rgb(96, 165, 250)',
  purple: 'rgb(192, 132, 252)',
  green: 'rgb(74, 222, 128)',
  amber: 'rgb(251, 191, 36)',
  cyan: 'rgb(34, 211, 238)',
  emerald: 'rgb(52, 211, 153)',
  orange: 'rgb(251, 146, 60)',
  pink: 'rgb(244, 114, 182)',
  red: 'rgb(248, 113, 113)'
};

const colorBadgeMap: Record<string, string> = {
  blue: 'rgb(59, 130, 246)',
  purple: 'rgb(139, 92, 246)',
  green: 'rgb(34, 197, 94)',
  amber: 'rgb(245, 158, 11)',
  cyan: 'rgb(6, 182, 212)',
  emerald: 'rgb(16, 185, 129)',
  orange: 'rgb(249, 115, 22)',
  pink: 'rgb(236, 72, 153)',
  red: 'rgb(239, 68, 68)'
};

const NavTabs: React.FC<NavTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <nav className={styles.navTabs}>
      <div className={styles.navTabsContent}>
        {tabs.map(({ id, label, icon: Icon, color, path, badge, pulseBadge }) => {
          const isActive = activeTab === id;
          const borderColor = colorBorderMap[color] || colorBorderMap.blue;
          const badgeColor = colorBadgeMap[color] || colorBadgeMap.blue;

          const content = (
            <>
              <Icon className={styles.navTabIcon} />
              {label}
              
              {badge !== undefined && badge > 0 && (
                <span
                  className={styles.navTabBadge}
                  style={{ background: badgeColor }}
                >
                  {badge}
                </span>
              )}
              
              {pulseBadge !== undefined && pulseBadge > 0 && !isActive && (
                <span
                  className={styles.navTabBadgePulse}
                  style={{ background: 'rgb(34, 197, 94)' }}
                >
                  +{pulseBadge}
                </span>
              )}
            </>
          );

          // If path is provided, use Link; otherwise use button
          if (path) {
            return (
              <Link
                key={id}
                to={path}
                className={`${styles.navTab} ${isActive ? styles.navTabActive : ''}`}
                style={{
                  ...(isActive ? { borderBottomColor: borderColor } : undefined),
                  textDecoration: 'none'
                }}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={id}
              className={`${styles.navTab} ${isActive ? styles.navTabActive : ''}`}
              style={isActive ? { borderBottomColor: borderColor } : undefined}
              onClick={() => onTabChange?.(id)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavTabs;
