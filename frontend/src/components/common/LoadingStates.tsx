/**
 * Loading States Components
 * 
 * Reusable loading skeletons and empty states for agent pages.
 */

import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

// =============================================================================
// LOADING SPINNER
// =============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
    <Loader2 className={`${sizeClasses[size]} animate-spin text-slate-400`} />
    {message && <p className="text-slate-400 text-sm animate-pulse">{message}</p>}
  </div>
);

// =============================================================================
// SKELETON LOADERS
// =============================================================================

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`
      animate-pulse bg-gradient-to-r 
      from-slate-800 via-slate-700 to-slate-800
      bg-[length:200%_100%] rounded-lg
      ${className}
    `}
    style={{
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}
  />
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`
      bg-white/5 border border-white/10 rounded-xl p-5
      animate-pulse ${className}
    `}
  >
    <div className="flex items-start gap-4">
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const GridSkeleton: React.FC<{
  count?: number;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}> = ({ count = 6, cols = 3, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[cols]} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`
      flex flex-col items-center justify-center text-center
      py-16 px-6 ${className}
    `}
  >
    <div
      className="
        w-20 h-20 rounded-2xl
        bg-slate-800/50 border border-slate-700/50
        flex items-center justify-center mb-6
      "
    >
      <Icon className="w-10 h-10 text-slate-500" />
    </div>
    <h3 className="text-xl font-semibold text-slate-300 mb-2">{title}</h3>
    {description && (
      <p className="text-slate-400 max-w-md mb-6">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="
          px-6 py-2.5 rounded-xl
          bg-white/10 hover:bg-white/15 border border-white/10
          text-white font-medium transition-all
          hover:border-white/20 active:scale-95
        "
      >
        {action.label}
      </button>
    )}
  </div>
);

// =============================================================================
// ERROR STATE
// =============================================================================

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  onDismiss,
  className = '',
}) => (
  <div
    className={`
      bg-red-500/10 border border-red-500/20 rounded-xl
      p-4 flex items-center justify-between gap-4
      ${className}
    `}
    role="alert"
  >
    <p className="text-red-300 text-sm flex-1">{message}</p>
    <div className="flex items-center gap-2">
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            px-3 py-1.5 rounded-lg text-sm font-medium
            bg-red-500/20 hover:bg-red-500/30
            text-red-300 transition-colors
          "
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="
            px-3 py-1.5 rounded-lg text-sm font-medium
            bg-white/5 hover:bg-white/10
            text-slate-300 transition-colors
          "
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);

// Add shimmer animation to global styles via CSS-in-JS
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

// Inject keyframes into document (only once)
if (typeof document !== 'undefined') {
  const styleId = 'loading-states-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
}


