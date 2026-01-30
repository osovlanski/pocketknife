/**
 * AgentSidebarLayout Component
 * 
 * A layout component with a collapsible left sidebar for agent navigation
 * and a main content area. Designed to emphasize the AI Assistant as the
 * primary orchestrator while keeping other agents easily accessible.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import { AGENT_TAGS, type AgentTagConfig } from './AgentTags';
import styles from '../../styles/sidebar-layout.module.css';

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarAgent {
  id: string;
  name: string;
  icon: LucideIcon | React.FC<{ size?: number }>;
  emoji?: string;
  color: string;
  path: string;
  badge?: number;
}

interface AgentSidebarLayoutProps {
  agents: SidebarAgent[];
  children: React.ReactNode;
  activeAgentId?: string;
  onAgentSelect?: (agentId: string) => void;
}

// =============================================================================
// SIDEBAR ITEM COMPONENT
// =============================================================================

interface SidebarItemProps {
  agent: SidebarAgent;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  agent,
  isActive,
  isCollapsed,
  onClick
}) => {
  const Icon = agent.icon;
  const tagConfig = AGENT_TAGS.find(t => t.agentId === agent.id);
  
  return (
    <button
      className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}
      onClick={onClick}
      title={agent.name}
      aria-label={agent.name}
      aria-current={isActive ? 'page' : undefined}
      style={{
        '--agent-color': tagConfig?.color || agent.color,
        '--agent-bg': tagConfig?.bgColor || `${agent.color}20`,
        '--agent-border': tagConfig?.borderColor || `${agent.color}40`,
      } as React.CSSProperties}
    >
      <span className={styles.sidebarItemIcon}>
        {agent.emoji ? (
          <span className={styles.emojiIcon}>{agent.emoji}</span>
        ) : (
          <Icon size={20} />
        )}
      </span>
      {!isCollapsed && (
        <span className={styles.sidebarItemLabel}>{agent.name}</span>
      )}
      {agent.badge && agent.badge > 0 && (
        <span className={styles.sidebarItemBadge}>{agent.badge}</span>
      )}
    </button>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AgentSidebarLayout: React.FC<AgentSidebarLayoutProps> = ({
  agents,
  children,
  activeAgentId,
  onAgentSelect
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Persist sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save collapse state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Get active agent from path
  const getActiveAgent = useCallback(() => {
    if (activeAgentId) return activeAgentId;
    
    const match = location.pathname.match(/^\/agents\/(\w+)/);
    return match ? match[1] : 'assistant';
  }, [location.pathname, activeAgentId]);

  const currentAgentId = getActiveAgent();
  const isAssistantActive = currentAgentId === 'assistant';

  const handleAgentClick = (agent: SidebarAgent) => {
    if (onAgentSelect) {
      onAgentSelect(agent.id);
    } else {
      navigate(agent.path);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Separate assistant from other agents
  const otherAgents = agents.filter(a => a.id !== 'assistant');
  const assistantAgent = agents.find(a => a.id === 'assistant');

  return (
    <div className={styles.layoutContainer}>
      {/* Left Sidebar */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* AI Assistant - Featured at top */}
        {assistantAgent && (
          <div className={styles.assistantSection}>
            <button
              className={`${styles.assistantButton} ${isAssistantActive ? styles.assistantButtonActive : ''}`}
              onClick={() => handleAgentClick(assistantAgent)}
              aria-label="AI Assistant"
              aria-current={isAssistantActive ? 'page' : undefined}
            >
              <div className={styles.assistantIcon}>
                <Bot size={24} />
                <Sparkles size={12} className={styles.sparkle} />
              </div>
              {!isCollapsed && (
                <div className={styles.assistantInfo}>
                  <span className={styles.assistantTitle}>AI Assistant</span>
                  <span className={styles.assistantSubtitle}>Ask me anything</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className={styles.sidebarDivider}>
          {!isCollapsed && <span>Agents</span>}
        </div>

        {/* Agent List */}
        <nav className={styles.agentList}>
          {otherAgents.map(agent => (
            <SidebarItem
              key={agent.id}
              agent={agent}
              isActive={currentAgentId === agent.id}
              isCollapsed={isCollapsed}
              onClick={() => handleAgentClick(agent)}
            />
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          className={styles.collapseButton}
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

export default AgentSidebarLayout;
