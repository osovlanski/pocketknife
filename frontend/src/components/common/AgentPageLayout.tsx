/**
 * AgentPageLayout Component
 * 
 * Shared layout wrapper for all agent pages providing:
 * - Consistent header with title, subtitle, and optional actions
 * - Beautiful gradient backgrounds per agent
 * - Smooth page entrance animations
 * - Mobile-responsive design
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

// Agent-specific gradients and colors
export const AGENT_THEMES = {
  email: {
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    accent: '#6366f1',
    bgGlow: 'rgba(99, 102, 241, 0.15)',
  },
  jobs: {
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    accent: '#ec4899',
    bgGlow: 'rgba(236, 72, 153, 0.15)',
  },
  travel: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accent: '#14b8a6',
    bgGlow: 'rgba(20, 184, 166, 0.15)',
  },
  learning: {
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    accent: '#f59e0b',
    bgGlow: 'rgba(245, 158, 11, 0.15)',
  },
  todo: {
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    accent: '#10b981',
    bgGlow: 'rgba(16, 185, 129, 0.15)',
  },
  shopping: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: '#ef4444',
    bgGlow: 'rgba(239, 68, 68, 0.15)',
  },
  cooking: {
    gradient: 'from-lime-500 via-green-500 to-emerald-500',
    accent: '#22c55e',
    bgGlow: 'rgba(34, 197, 94, 0.15)',
  },
  news: {
    gradient: 'from-red-500 via-orange-500 to-amber-500',
    accent: '#f97316',
    bgGlow: 'rgba(249, 115, 22, 0.15)',
  },
  diy: {
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    accent: '#eab308',
    bgGlow: 'rgba(234, 179, 8, 0.15)',
  },
  assistant: {
    gradient: 'from-purple-500 via-violet-500 to-indigo-500',
    accent: '#8b5cf6',
    bgGlow: 'rgba(139, 92, 246, 0.15)',
  },
} as const;

export type AgentThemeId = keyof typeof AGENT_THEMES;

interface AgentPageLayoutProps {
  /** Agent identifier for theming */
  agentId: AgentThemeId;
  /** Page title with optional emoji */
  title: string;
  /** Subtitle description */
  subtitle: string;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Loading state for refresh button */
  isLoading?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Optional action buttons in header */
  headerActions?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

const AgentPageLayout: React.FC<AgentPageLayoutProps> = ({
  agentId,
  title,
  subtitle,
  icon,
  isLoading = false,
  onRefresh,
  headerActions,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const theme = AGENT_THEMES[agentId];

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        min-h-full transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
      style={{
        background: `radial-gradient(ellipse at top, ${theme.bgGlow} 0%, transparent 50%)`,
      }}
    >
      {/* Header Section */}
      <header className="relative px-4 sm:px-6 py-6 sm:py-8">
        {/* Decorative gradient line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`}
        />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-3">
              {icon && (
                <div
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl 
                    flex items-center justify-center text-white text-2xl sm:text-3xl
                    bg-gradient-to-br ${theme.gradient}
                    shadow-lg transform hover:scale-105 transition-transform
                  `}
                  style={{ boxShadow: `0 8px 32px ${theme.bgGlow}` }}
                >
                  {icon}
                </div>
              )}
              <div>
                <h1
                  className={`
                    text-2xl sm:text-3xl md:text-4xl font-bold 
                    bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent
                  `}
                >
                  {title}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {headerActions}
              
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl
                    bg-white/5 hover:bg-white/10 border border-white/10
                    text-slate-300 hover:text-white transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:border-white/20 active:scale-95
                  `}
                  aria-label="Refresh"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">
                    Refresh
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AgentPageLayout;


