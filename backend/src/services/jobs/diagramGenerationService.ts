/**
 * Diagram Generation Service
 * 
 * Generates system design diagrams from natural language prompts using Claude AI.
 * Converts user descriptions into structured component layouts and connections.
 */

import claudeService from '../core/claudeService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratedComponent {
  id: string;
  template: string;           // Maps to COMPONENT_TEMPLATES (e.g., 'database', 'cache')
  label: string;              // Custom label (e.g., "PostgreSQL", "Redis Cache")
  position: { x: number; y: number };
  color?: string;
}

export interface GeneratedConnection {
  fromId: string;
  toId: string;
  label?: string;             // Arrow label (e.g., "writes", "reads", "HTTP")
  style?: 'solid' | 'dashed';
}

export interface GeneratedAnnotation {
  text: string;
  position: { x: number; y: number };
}

export interface GeneratedDiagram {
  components: GeneratedComponent[];
  connections: GeneratedConnection[];
  annotations: GeneratedAnnotation[];
  summary: string;
  suggestions: string[];
}

export interface DiagramGenerationRequest {
  prompt: string;
  questionTitle?: string;
  questionDescription?: string;
  requirements?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
}

// Component template mapping for validation
const VALID_TEMPLATES = configService.get('keywords.jobs.diagrams.validTemplates', [
  'client', 'mobile', 'load_balancer', 'network', 'api_gateway', 'shield',
  'web_server', 'globe', 'database', 'cache', 'message_queue', 'message',
  'storage', 'cdn', 'cloud', 'microservice', 'server', 'worker', 'layers',
  'auth', 'search', 'notification', 'logging', 'dns', 'monitoring'
]) as string[];

// Color palette for components
const COMPONENT_COLORS: Record<string, string> = {
  client: '#60a5fa',
  mobile: '#818cf8',
  load_balancer: '#22c55e',
  network: '#22c55e',
  api_gateway: '#a855f7',
  shield: '#a855f7',
  web_server: '#3b82f6',
  globe: '#3b82f6',
  database: '#f59e0b',
  cache: '#ef4444',
  message_queue: '#06b6d4',
  message: '#06b6d4',
  storage: '#64748b',
  cdn: '#8b5cf6',
  cloud: '#8b5cf6',
  microservice: '#10b981',
  server: '#10b981',
  worker: '#f97316',
  layers: '#f97316',
  auth: '#dc2626',
  search: '#0891b2',
  notification: '#eab308',
  logging: '#78716c',
  dns: '#14b8a6',
  monitoring: '#f43f5e'
};

// =============================================================================
// SERVICE
// =============================================================================

class DiagramGenerationService {
  /**
   * Generate a system design diagram from a text prompt
   */
  async generateDiagram(request: DiagramGenerationRequest): Promise<GeneratedDiagram> {
    logger.start('Generating system design diagram from prompt');

    try {
      const prompt = this.buildPrompt(request);
      const maxTokens = configService.get('mockInterview.ai.systemDesignMaxTokens', 3000);
      
      const response = await claudeService.generateText(prompt, maxTokens);
      const diagram = this.parseResponse(response);
      
      // Validate and fix the diagram
      const validatedDiagram = this.validateAndFixDiagram(diagram, request);
      
      logger.success('Diagram generated', { 
        components: validatedDiagram.components.length,
        connections: validatedDiagram.connections.length 
      });
      
      return validatedDiagram;
    } catch (error: any) {
      logger.fail('Failed to generate diagram', { error: error.message });
      throw error;
    }
  }

  /**
   * Build the Claude prompt for diagram generation
   */
  private buildPrompt(request: DiagramGenerationRequest): string {
    const canvasWidth = request.canvasWidth || 1200;
    const canvasHeight = request.canvasHeight || 800;

    return `You are a system design diagram generator. Convert the user's architecture description into a structured JSON format that can be rendered on a whiteboard canvas.

## Canvas Dimensions
Width: ${canvasWidth}px, Height: ${canvasHeight}px

## Available Component Templates (use these exact names in the "template" field)
- client: Web/Desktop client (color: #60a5fa)
- mobile: Mobile application (color: #818cf8)  
- load_balancer: Traffic distribution (color: #22c55e)
- api_gateway: API routing & auth (color: #a855f7)
- web_server: HTTP handling (color: #3b82f6)
- database: SQL/NoSQL storage (color: #f59e0b)
- cache: Redis/Memcached (color: #ef4444)
- message_queue: Kafka/RabbitMQ (color: #06b6d4)
- storage: S3/Blob storage (color: #64748b)
- cdn: Content delivery (color: #8b5cf6)
- microservice: Service container (color: #10b981)
- worker: Background jobs (color: #f97316)
- auth: Authentication service (color: #dc2626)
- search: Elasticsearch (color: #0891b2)
- notification: Push/Email/SMS (color: #eab308)
- logging: Log aggregation (color: #78716c)
- dns: Domain resolution (color: #14b8a6)
- monitoring: Metrics/Alerts (color: #f43f5e)

## Layout Rules (IMPORTANT - follow these for clean diagrams)
1. Clients on the left (x: 50-150)
2. Gateway/Load Balancer next (x: 200-350)
3. Services in the middle (x: 400-600)
4. Databases/Storage on the right (x: 650-850)
5. Async workers/queues at the bottom (y: 400-600)
6. Space components vertically with at least 100px between them
7. Keep related components grouped together
8. Each component is approximately 130x70 pixels

${request.questionTitle ? `## System Design Question
Title: ${request.questionTitle}
${request.questionDescription ? `Description: ${request.questionDescription}` : ''}
${request.requirements && request.requirements.length > 0 ? `Requirements:\n${request.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}` : ''}
` : ''}

## User's Architecture Description
${request.prompt}

## Task
1. Identify all components mentioned or implied in the description
2. Map each component to one of the available templates
3. Determine logical data flow between components
4. Create positions for a clean, readable diagram (avoid overlapping components!)
5. Write a detailed summary explaining the data flow step by step
6. Add 1-2 helpful suggestions if the design is incomplete (WITHOUT revealing the "perfect" solution)

## Edge Routing Rules (IMPORTANT - prevent overlapping edges)
1. Position components to minimize edge crossings
2. Components that connect to the same target should be placed on the same vertical or horizontal line
3. For multiple parallel paths, stagger component positions vertically
4. Leave enough space (min 150px) between component rows for clear arrows
5. When creating connections, prefer connecting adjacent components
6. For long-distance connections, consider adding intermediate components

## Response Format
Respond ONLY with valid JSON (no markdown, no code blocks, no explanation):
{
  "components": [
    {
      "id": "unique_id",
      "template": "database",
      "label": "PostgreSQL",
      "position": { "x": 700, "y": 200 }
    }
  ],
  "connections": [
    {
      "fromId": "api",
      "toId": "db",
      "label": "writes",
      "style": "solid"
    }
  ],
  "annotations": [
    {
      "text": "Cache-aside pattern",
      "position": { "x": 400, "y": 50 }
    }
  ],
  "summary": "Write a detailed step-by-step data flow description:\\n\\n1. User requests come through...\\n2. The load balancer distributes...\\n3. API servers process...\\n\\nThis architecture handles X by Y.",
  "suggestions": ["Consider adding X for Y benefit"]
}`;
  }

  /**
   * Parse Claude's response into structured diagram data
   */
  private parseResponse(response: string): GeneratedDiagram {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // Clean up the string
      jsonStr = jsonStr.trim();
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        components: parsed.components || [],
        connections: parsed.connections || [],
        annotations: parsed.annotations || [],
        summary: parsed.summary || 'Generated diagram',
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      logger.warn('Failed to parse diagram response, returning empty diagram', { error });
      return {
        components: [],
        connections: [],
        annotations: [],
        summary: 'Failed to parse diagram',
        suggestions: ['Please try describing your architecture again']
      };
    }
  }

  /**
   * Validate and fix the generated diagram
   */
  private validateAndFixDiagram(
    diagram: GeneratedDiagram, 
    request: DiagramGenerationRequest
  ): GeneratedDiagram {
    const canvasWidth = request.canvasWidth || 1200;
    const canvasHeight = request.canvasHeight || 800;
    
    // Validate and fix components
    const validatedComponents = diagram.components.map((comp, index) => {
      // Ensure valid template
      let template = comp.template?.toLowerCase().replace(/\s+/g, '_') || 'server';
      if (!VALID_TEMPLATES.includes(template)) {
        // Try to find a close match
        template = this.findClosestTemplate(template) || 'server';
      }
      
      // Ensure valid position
      let x = comp.position?.x ?? (100 + (index % 4) * 200);
      let y = comp.position?.y ?? (100 + Math.floor(index / 4) * 150);
      
      // Clamp to canvas bounds
      x = Math.max(10, Math.min(x, canvasWidth - 140));
      y = Math.max(10, Math.min(y, canvasHeight - 80));
      
      return {
        id: comp.id || `comp-${index}`,
        template,
        label: comp.label || this.templateToLabel(template),
        position: { x, y },
        color: comp.color || COMPONENT_COLORS[template] || '#3b82f6'
      };
    });
    
    // Validate connections (ensure referenced IDs exist)
    const componentIds = new Set(validatedComponents.map(c => c.id));
    const validatedConnections = diagram.connections.filter(conn => 
      componentIds.has(conn.fromId) && componentIds.has(conn.toId)
    );
    
    // Clamp annotation positions
    const validatedAnnotations = diagram.annotations.map(ann => ({
      text: ann.text,
      position: {
        x: Math.max(10, Math.min(ann.position?.x ?? 100, canvasWidth - 100)),
        y: Math.max(10, Math.min(ann.position?.y ?? 50, canvasHeight - 30))
      }
    }));
    
    return {
      components: validatedComponents,
      connections: validatedConnections,
      annotations: validatedAnnotations,
      summary: diagram.summary,
      suggestions: diagram.suggestions
    };
  }

  /**
   * Find the closest matching template for an invalid template name
   */
  private findClosestTemplate(input: string): string | null {
    const normalized = input.toLowerCase().replace(/[^a-z]/g, '');
    
    // Common mappings
    const mappings: Record<string, string> = {
      'loadbalancer': 'load_balancer',
      'lb': 'load_balancer',
      'nginx': 'load_balancer',
      'haproxy': 'load_balancer',
      'gateway': 'api_gateway',
      'apigateway': 'api_gateway',
      'webserver': 'web_server',
      'http': 'web_server',
      'db': 'database',
      'sql': 'database',
      'nosql': 'database',
      'postgres': 'database',
      'postgresql': 'database',
      'mysql': 'database',
      'mongodb': 'database',
      'dynamodb': 'database',
      'redis': 'cache',
      'memcached': 'cache',
      'queue': 'message_queue',
      'kafka': 'message_queue',
      'rabbitmq': 'message_queue',
      'sqs': 'message_queue',
      's3': 'storage',
      'blob': 'storage',
      'files': 'storage',
      'elasticsearch': 'search',
      'es': 'search',
      'service': 'microservice',
      'app': 'web_server',
      'user': 'client',
      'browser': 'client',
      'ios': 'mobile',
      'android': 'mobile',
      'cloudflare': 'cdn',
      'authentication': 'auth',
      'login': 'auth',
      'push': 'notification',
      'email': 'notification',
      'sms': 'notification',
      'logs': 'logging',
      'elk': 'logging',
      'metrics': 'monitoring',
      'prometheus': 'monitoring',
      'grafana': 'monitoring'
    };
    
    if (mappings[normalized]) {
      return mappings[normalized];
    }
    
    // Try partial matching
    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Try matching against valid templates
    for (const template of VALID_TEMPLATES) {
      if (normalized.includes(template) || template.includes(normalized)) {
        return template;
      }
    }
    
    return null;
  }

  /**
   * Convert template name to a display label
   */
  private templateToLabel(template: string): string {
    const labels: Record<string, string> = {
      client: 'Client',
      mobile: 'Mobile App',
      load_balancer: 'Load Balancer',
      api_gateway: 'API Gateway',
      web_server: 'Web Server',
      database: 'Database',
      cache: 'Cache',
      message_queue: 'Message Queue',
      storage: 'Storage',
      cdn: 'CDN',
      microservice: 'Service',
      worker: 'Worker',
      auth: 'Auth',
      search: 'Search',
      notification: 'Notifications',
      logging: 'Logging',
      dns: 'DNS',
      monitoring: 'Monitoring'
    };
    return labels[template] || template.split('_').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }
}

export const diagramGenerationService = new DiagramGenerationService();
export default diagramGenerationService;

