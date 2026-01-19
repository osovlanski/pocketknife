/**
 * AgentTabs Component
 * 
 * Reusable tabbed navigation for agent pages with:
 * - Smooth active indicator animation
 * - Badge support for counts
 * - Mobile-friendly horizontal scroll
 * - Keyboard navigation support
 */

import React, { useRef, useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
}

interface AgentTabsProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Theme accent color (hex) */
  accentColor?: string;
  /** Additional class names */
  className?: string;
}

const AgentTabs: React.FC<AgentTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  accentColor = '#8b5cf6',
  className = '',
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      const tabsContainer = tabsRef.current;
      if (!tabsContainer) return;

      const activeTabElement = tabsContainer.querySelector(
        `[data-tab-id="${activeTab}"]`
      ) as HTMLButtonElement;

      if (activeTabElement) {
        const containerRect = tabsContainer.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();

        setIndicatorStyle({
          left: tabRect.left - containerRect.left + tabsContainer.scrollLeft,
          width: tabRect.width,
        });
      }
    };

    updateIndicator();

    // Recalculate on resize
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === tabs[currentIndex].id);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentEnabledIndex + 1) % enabledTabs.length;
      onTabChange(enabledTabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = currentEnabledIndex === 0 ? enabledTabs.length - 1 : currentEnabledIndex - 1;
      onTabChange(enabledTabs[prevIndex].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onTabChange(enabledTabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      onTabChange(enabledTabs[enabledTabs.length - 1].id);
    }
  };

  return (
    <nav
      className={`relative ${className}`}
      role="tablist"
      aria-label="Agent navigation tabs"
    >
      {/* Scrollable tabs container */}
      <div
        ref={tabsRef}
        className="
          flex overflow-x-auto scrollbar-hide
          bg-white/5 backdrop-blur-sm rounded-xl
          border border-white/10 p-1
          -mx-1 px-1
        "
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Animated indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
            borderColor: `${accentColor}50`,
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        />

        {/* Tabs */}
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5
                text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                whitespace-nowrap z-10
                ${isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
                }
                ${tab.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer'
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                focus-visible:ring-offset-slate-900
              `}
              style={{
                ...(isActive && { color: 'white' }),
                ...(isActive && { '--tw-ring-color': accentColor } as React.CSSProperties),
              }}
            >
              <Icon
                className={`
                  w-4 h-4 transition-transform duration-200
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}
                style={isActive ? { color: accentColor } : undefined}
              />
              <span>{tab.label}</span>

              {/* Badge */}
              {tab.badge !== undefined && tab.badge !== 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center
                    min-w-[1.25rem] h-5 px-1.5 rounded-full
                    text-xs font-semibold
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-700 text-slate-300'
                    }
                  `}
                >
                  {typeof tab.badge === 'number' && tab.badge > 99
                    ? '99+'
                    : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AgentTabs;


