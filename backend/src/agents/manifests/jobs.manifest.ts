/**
 * Jobs Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const jobsManifest: AgentMetadata = {
  id: 'jobs',
  name: 'Jobs Agent',
  description: 'Search for jobs, match against your CV with AI, and track applications',
  icon: '💼',
  color: '#8B5CF6',
  agentType: 'deep',
  keywords: ['#job', '#career', '#interview', '#resume', '#cv', '#hiring'],
  capabilities: [
    {
      action: 'search',
      description: 'Search for job listings',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Job search query', example: 'software engineer' },
        { name: 'location', type: 'string', required: false, description: 'Job location', example: 'remote' }
      ],
      examples: ['Find remote software engineering jobs', 'Search for product manager positions in Tel Aviv']
    },
    {
      action: 'get-saved',
      description: 'Get saved job listings',
      parameters: [],
      examples: ['Show my saved jobs']
    },
    {
      action: 'extract-interview-questions',
      description: 'Extract interview questions from an image',
      parameters: [
        { name: 'imageUrl', type: 'string', required: true, description: 'URL of the image containing questions' }
      ],
      examples: ['Extract questions from this interview screenshot']
    }
  ]
};
