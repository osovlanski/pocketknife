/**
 * News Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const newsManifest: AgentMetadata = {
  id: 'news',
  name: 'News Agent',
  description: 'Curated tech news feed with AI-powered summaries',
  icon: '📰',
  color: '#6366F1',
  agentType: 'deep',
  keywords: ['#news', '#article', '#trending', '#headline'],
  capabilities: [
    {
      action: 'get-feed',
      description: 'Get personalized news feed',
      parameters: [
        { name: 'topics', type: 'array', required: false, description: 'Filter by topics' }
      ],
      examples: ['Show me the latest tech news', "What's happening in AI today?"]
    },
    {
      action: 'search',
      description: 'Search for news articles',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' }
      ],
      examples: ['Search for news about climate change']
    }
  ]
};
