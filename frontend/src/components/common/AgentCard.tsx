/**
 * AgentCard Component
 * 
 * Reusable card component for agent pages with:
 * - Consistent styling and hover effects
 * - Optional gradient accent
 * - Flexible layout options
 * - Interactive states
 */

import React from 'react';

interface AgentCardProps {
  children: React.ReactNode;
  /** Optional click handler (makes card interactive) */
  onClick?: () => void;
  /** Optional href (makes card a link) */
  href?: string;
  /** Accent color for top gradient border */
  accentColor?: string;
  /** Whether card is selected/active */
  isActive?: boolean;
  /** Whether card is in a loading state */
  isLoading?: boolean;
  /** Variant style */
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Optional footer section */
  footer?: React.ReactNode;
  /** Optional header section */
  header?: React.ReactNode;
}

const AgentCard: React.FC<AgentCardProps> = ({
  children,
  onClick,
  href,
  accentColor,
  isActive = false,
  isLoading = false,
  variant = 'default',
  size = 'md',
  className = '',
  footer,
  header,
}) => {
  const isInteractive = onClick || href;

  const sizeClasses = {
    sm: 'p-3 rounded-lg',
    md: 'p-4 sm:p-5 rounded-xl',
    lg: 'p-5 sm:p-6 rounded-2xl',
  };

  const variantClasses = {
    default: `
      bg-slate-800/50 border border-slate-700/50
      ${isInteractive ? 'hover:bg-slate-800/70 hover:border-slate-600/50' : ''}
    `,
    elevated: `
      bg-slate-800/60 border border-slate-700/30
      shadow-lg shadow-black/20
      ${isInteractive ? 'hover:shadow-xl hover:border-slate-600/50 hover:-translate-y-0.5' : ''}
    `,
    outlined: `
      bg-transparent border-2 border-slate-700
      ${isInteractive ? 'hover:bg-slate-800/30 hover:border-slate-600' : ''}
    `,
    glass: `
      bg-white/5 backdrop-blur-sm border border-white/10
      ${isInteractive ? 'hover:bg-white/10 hover:border-white/20' : ''}
    `,
  };

  const activeClasses = isActive
    ? 'ring-2 ring-offset-2 ring-offset-slate-900 border-transparent'
    : '';

  const loadingClasses = isLoading ? 'opacity-60 pointer-events-none' : '';

  const interactiveClasses = isInteractive
    ? 'cursor-pointer transition-all duration-200 active:scale-[0.98]'
    : '';

  const baseClasses = `
    relative overflow-hidden
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${activeClasses}
    ${loadingClasses}
    ${interactiveClasses}
  `;

  const cardContent = (
    <>
      {/* Accent gradient line */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(to right, ${accentColor}, transparent)`,
          }}
        />
      )}

      {/* Header */}
      {header && <div className="mb-3">{header}</div>}

      {/* Main content */}
      {children}

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">{footer}</div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </>
  );

  // Render as link if href provided
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${baseClasses} ${className}`}
        style={isActive && accentColor ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
      >
        {cardContent}
      </a>
    );
  }

  // Render as button if onClick provided
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`block w-full text-left ${baseClasses} ${className}`}
        style={isActive && accentColor ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
      >
        {cardContent}
      </button>
    );
  }

  // Render as div otherwise
  return (
    <div
      className={`${baseClasses} ${className}`}
      style={isActive && accentColor ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
    >
      {cardContent}
    </div>
  );
};

// =============================================================================
// CARD SUBCOMPONENTS
// =============================================================================

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-semibold text-white truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => <div className={`text-slate-300 ${className}`}>{children}</div>;

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => (
  <div className={`flex items-center gap-2 flex-wrap ${className}`}>
    {children}
  </div>
);

interface CardBadgeProps {
  children: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const CardBadge: React.FC<CardBadgeProps> = ({
  children,
  color = 'default',
  className = '',
}) => {
  const colorClasses = {
    default: 'bg-slate-700/50 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    warning: 'bg-amber-500/20 text-amber-300',
    danger: 'bg-red-500/20 text-red-300',
    info: 'bg-blue-500/20 text-blue-300',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        rounded-full text-xs font-medium
        ${colorClasses[color]} ${className}
      `}
    >
      {children}
    </span>
  );
};

export default AgentCard;


