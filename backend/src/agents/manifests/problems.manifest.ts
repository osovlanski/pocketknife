/**
 * Problems Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const problemsManifest: AgentMetadata = {
  id: 'problems',
  name: 'Problems Agent',
  description: 'Practice coding problems from LeetCode and other platforms',
  icon: '🧩',
  color: '#F97316',
  agentType: 'simple',
  keywords: ['#code', '#leetcode', '#algorithm', '#problem', '#coding'],
  capabilities: [
    {
      action: 'get-problem',
      description: 'Get a coding problem to practice',
      parameters: [
        { name: 'difficulty', type: 'string', required: false, description: 'Difficulty (easy, medium, hard)' },
        { name: 'topic', type: 'string', required: false, description: 'Problem topic' }
      ],
      examples: ['Give me a medium difficulty algorithm problem', 'Practice dynamic programming']
    }
  ]
};
