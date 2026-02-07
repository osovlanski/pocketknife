/**
 * ToDo Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const todoManifest: AgentMetadata = {
  id: 'todo',
  name: 'ToDo Agent',
  description: 'Manage tasks, reminders, and integrate with Google Calendar',
  icon: '✅',
  color: '#F59E0B',
  agentType: 'simple',
  keywords: ['#todo', '#task', '#reminder', '#deadline', '#checklist'],
  capabilities: [
    {
      action: 'get-tasks',
      description: 'Get all tasks/todos',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, completed)' }
      ],
      examples: ['Show my tasks', 'What do I need to do today?']
    },
    {
      action: 'create-task',
      description: 'Create a new task',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Task title' },
        { name: 'description', type: 'string', required: false, description: 'Task description' },
        { name: 'dueDate', type: 'string', required: false, description: 'Due date' },
        { name: 'priority', type: 'string', required: false, description: 'Priority level' }
      ],
      examples: ['Add a task to call the dentist', 'Remind me to buy groceries tomorrow']
    },
    {
      action: 'complete-task',
      description: 'Mark a task as completed',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID to complete' }
      ],
      examples: ['Mark the dentist task as done']
    }
  ]
};
