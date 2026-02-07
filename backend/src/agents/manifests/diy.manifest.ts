/**
 * DIY Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const diyManifest: AgentMetadata = {
  id: 'diy',
  name: 'DIY Agent',
  description: 'Generate DIY project ideas with step-by-step instructions',
  icon: '🔨',
  color: '#D97706',
  agentType: 'deep',
  keywords: ['#diy', '#project', '#craft', '#build', '#make'],
  capabilities: [
    {
      action: 'generate-project',
      description: 'Generate a DIY project idea with instructions',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Project category' },
        { name: 'difficulty', type: 'string', required: false, description: 'Difficulty level' },
        { name: 'materials', type: 'array', required: false, description: 'Available materials' }
      ],
      examples: ['Give me a weekend woodworking project', 'DIY project for beginners with recycled materials']
    }
  ]
};
