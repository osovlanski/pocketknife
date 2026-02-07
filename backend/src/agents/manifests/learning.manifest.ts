/**
 * Learning Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const learningManifest: AgentMetadata = {
  id: 'learning',
  name: 'Learning Agent',
  description: 'Find tutorials, courses, and educational resources for tech topics',
  icon: '📚',
  color: '#14B8A6',
  agentType: 'simple',
  keywords: ['#learn', '#tutorial', '#course', '#study', '#education'],
  capabilities: [
    {
      action: 'search',
      description: 'Search for learning resources and tutorials',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Learning topic' },
        { name: 'type', type: 'string', required: false, description: 'Resource type (tutorial, course, article)' }
      ],
      examples: ['Find tutorials on React', 'Search for machine learning courses']
    },
    {
      action: 'get-saved',
      description: 'Get saved learning resources',
      parameters: [],
      examples: ['Show my saved learning resources']
    }
  ]
};
