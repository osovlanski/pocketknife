/**
 * Shopping Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const shoppingManifest: AgentMetadata = {
  id: 'shopping',
  name: 'Shopping Agent',
  description: 'Find deals, compare prices, and track products across stores',
  icon: '🛍️',
  color: '#EC4899',
  agentType: 'deep',
  keywords: ['#shopping', '#deal', '#price', '#discount', '#buy', '#order'],
  capabilities: [
    {
      action: 'search',
      description: 'Search for products and deals',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Product search query' },
        { name: 'maxPrice', type: 'number', required: false, description: 'Maximum price' }
      ],
      examples: ['Find deals on headphones', 'Search for the best price on a laptop']
    },
    {
      action: 'get-saved-deals',
      description: 'Get saved deals and watchlist items',
      parameters: [],
      examples: ['Show my saved deals', 'What products am I tracking?']
    }
  ]
};
