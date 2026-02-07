/**
 * Assistant Agent Manifest
 *
 * The meta-agent that handles general queries and orchestrates other agents.
 */

import type { AgentMetadata } from '../types';

export const assistantManifest: AgentMetadata = {
  id: 'assistant',
  name: 'Assistant',
  description: 'General AI assistant for queries that don\'t match a specific agent',
  icon: '🤖',
  color: '#6B7280',
  agentType: 'deep',
  keywords: ['#ai', '#assistant', '#help'],
  capabilities: []
};
