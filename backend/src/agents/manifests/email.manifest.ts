/**
 * Email Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const emailManifest: AgentMetadata = {
  id: 'email',
  name: 'Email Agent',
  description: 'Process, categorize, and summarize Gmail messages',
  icon: '📧',
  color: '#EF4444',
  agentType: 'simple',
  keywords: ['#email', '#inbox', '#mail', '#gmail', '#newsletter'],
  capabilities: [
    {
      action: 'process',
      description: 'Process and categorize emails',
      parameters: [
        { name: 'maxEmails', type: 'number', required: false, description: 'Maximum emails to process' }
      ],
      examples: ['Process my unread emails', 'Categorize my inbox']
    }
  ]
};
