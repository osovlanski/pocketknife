/**
 * Agent Tags Configuration
 * 
 * Defines agent keywords/hashtags that can be detected in messages.
 * Each agent has associated tags that trigger recognition and styling.
 */

import React from 'react';
import {
  ChefHat,
  Briefcase,
  Plane,
  CheckSquare,
  ShoppingBag,
  GraduationCap,
  Newspaper,
  Wrench,
  Mail,
  Code,
  Bot,
  type LucideIcon
} from 'lucide-react';

// =============================================================================
// AGENT TAG DEFINITIONS
// =============================================================================

export interface AgentTagConfig {
  agentId: string;
  displayName: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  keywords: string[]; // Hashtags/keywords that trigger this agent
}

export const AGENT_TAGS: AgentTagConfig[] = [
  {
    agentId: 'cooking',
    displayName: 'Recipe',
    icon: ChefHat,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    keywords: ['#recipe', '#cooking', '#food', '#ingredient', '#meal', '#kitchen']
  },
  {
    agentId: 'todo',
    displayName: 'Task',
    icon: CheckSquare,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    keywords: ['#todo', '#task', '#reminder', '#deadline', '#checklist']
  },
  {
    agentId: 'jobs',
    displayName: 'Jobs',
    icon: Briefcase,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    keywords: ['#job', '#career', '#interview', '#resume', '#cv', '#hiring']
  },
  {
    agentId: 'travel',
    displayName: 'Travel',
    icon: Plane,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    keywords: ['#travel', '#flight', '#hotel', '#trip', '#vacation', '#booking']
  },
  {
    agentId: 'email',
    displayName: 'Email',
    icon: Mail,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    keywords: ['#email', '#inbox', '#mail', '#gmail', '#newsletter']
  },
  {
    agentId: 'shopping',
    displayName: 'Shopping',
    icon: ShoppingBag,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    keywords: ['#shopping', '#deal', '#price', '#discount', '#buy', '#order']
  },
  {
    agentId: 'learning',
    displayName: 'Learning',
    icon: GraduationCap,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    keywords: ['#learn', '#tutorial', '#course', '#study', '#education']
  },
  {
    agentId: 'news',
    displayName: 'News',
    icon: Newspaper,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    keywords: ['#news', '#article', '#trending', '#headline']
  },
  {
    agentId: 'diy',
    displayName: 'DIY',
    icon: Wrench,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    keywords: ['#diy', '#project', '#craft', '#build', '#make']
  },
  {
    agentId: 'problems',
    displayName: 'Coding',
    icon: Code,
    color: '#14b8a6',
    bgColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    keywords: ['#code', '#leetcode', '#algorithm', '#problem', '#coding']
  },
  {
    agentId: 'assistant',
    displayName: 'AI',
    icon: Bot,
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    keywords: ['#ai', '#assistant', '#help']
  }
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Find agent config by keyword
 */
export const findAgentByKeyword = (keyword: string): AgentTagConfig | undefined => {
  const normalizedKeyword = keyword.toLowerCase().startsWith('#') 
    ? keyword.toLowerCase() 
    : `#${keyword.toLowerCase()}`;
  
  return AGENT_TAGS.find(agent => 
    agent.keywords.some(k => k.toLowerCase() === normalizedKeyword)
  );
};

/**
 * Find agent config by agent ID
 */
export const findAgentById = (agentId: string): AgentTagConfig | undefined => {
  return AGENT_TAGS.find(agent => agent.agentId === agentId);
};

/**
 * Extract all agent tags from text
 */
export const extractAgentTags = (text: string): AgentTagConfig[] => {
  const tags: AgentTagConfig[] = [];
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex) || [];
  
  for (const match of matches) {
    const agent = findAgentByKeyword(match);
    if (agent && !tags.some(t => t.agentId === agent.agentId)) {
      tags.push(agent);
    }
  }
  
  return tags;
};

/**
 * Get all available keywords for autocomplete
 */
export const getAllKeywords = (): string[] => {
  return AGENT_TAGS.flatMap(agent => agent.keywords);
};

// =============================================================================
// AGENT TAG BADGE COMPONENT
// =============================================================================

interface AgentTagBadgeProps {
  tag: AgentTagConfig;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const AgentTagBadge: React.FC<AgentTagBadgeProps> = ({ 
  tag, 
  size = 'sm',
  onClick 
}) => {
  const Icon = tag.icon;
  const isClickable = !!onClick;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5'
  };
  
  const iconSize = size === 'sm' ? 12 : 14;
  
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses[size]}
        ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      style={{
        color: tag.color,
        backgroundColor: tag.bgColor,
        border: `1px solid ${tag.borderColor}`
      }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <Icon size={iconSize} />
      {tag.displayName}
    </span>
  );
};

export default AGENT_TAGS;
