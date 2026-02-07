/**
 * Travel Agent Manifest
 */

import type { AgentMetadata } from '../types';

export const travelManifest: AgentMetadata = {
  id: 'travel',
  name: 'Travel Agent',
  description: 'Search flights, hotels, and plan trips with AI-generated itineraries',
  icon: '✈️',
  color: '#0EA5E9',
  agentType: 'deep',
  keywords: ['#travel', '#flight', '#hotel', '#trip', '#vacation', '#booking'],
  capabilities: [
    {
      action: 'search-flights',
      description: 'Search for flights between cities',
      parameters: [
        { name: 'origin', type: 'string', required: true, description: 'Origin city code', example: 'TLV' },
        { name: 'destination', type: 'string', required: true, description: 'Destination city code', example: 'BCN' },
        { name: 'departDate', type: 'string', required: true, description: 'Departure date', example: '2024-06-01' },
        { name: 'returnDate', type: 'string', required: false, description: 'Return date for round trip' }
      ],
      examples: ['Find flights from Tel Aviv to Barcelona', 'Search for flights to New York next week']
    },
    {
      action: 'plan-trip',
      description: 'Create an AI-generated trip itinerary',
      parameters: [
        { name: 'destination', type: 'string', required: true, description: 'Destination' },
        { name: 'duration', type: 'number', required: false, description: 'Trip duration in days' },
        { name: 'interests', type: 'array', required: false, description: 'Travel interests' }
      ],
      examples: ['Plan a 5-day trip to Rome', 'Create an itinerary for Tokyo focusing on food and culture']
    }
  ]
};
