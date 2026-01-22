# Agent Features Documentation

This document describes the advanced features available in all Pocketknife agents through the `AbstractAgent` base class.

## Table of Contents

- [Rate Limiting](#rate-limiting)
- [Retry Logic with Exponential Backoff](#retry-logic-with-exponential-backoff)
- [Circuit Breaker](#circuit-breaker)
- [Timeout Handling](#timeout-handling)
- [Input Validation (Zod)](#input-validation-zod)
- [Metrics & Telemetry](#metrics--telemetry)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Rate Limiting

Each agent has a built-in rate limiter using the token bucket algorithm to prevent overwhelming external APIs.

### Configuration

```typescript
// In agent constructor
constructor() {
  super({
    rateLimit: 30,  // Max 30 requests per minute (default: 60)
  });
}
```

### Behavior

- When rate limit is exceeded, the agent waits for a token before proceeding
- Rate limit hits are logged and tracked in metrics
- Each agent has its own independent rate limiter

### API

```typescript
// Get rate limit status
const status = agent.getRateLimitStatus();
// { available: 45, limit: 60 }
```

---

## Retry Logic with Exponential Backoff

All agent operations automatically retry on transient failures with configurable exponential backoff.

### Configuration

```typescript
constructor() {
  super({
    retryOptions: {
      maxRetries: 3,           // Max retry attempts
      initialDelayMs: 1000,    // First retry delay
      maxDelayMs: 30000,       // Max delay cap
      backoffMultiplier: 2,    // Exponential factor
      jitter: true,            // Add randomness to prevent thundering herd
    }
  });
}
```

### Retryable Errors

The following errors are automatically retried:

| Type | Examples |
|------|----------|
| Network errors | `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED` |
| HTTP status codes | 408, 429, 500, 502, 503, 504 |
| Timeout messages | "timeout", "Network Error" |

### Non-Retryable Errors

- Validation errors
- 4xx client errors (400, 401, 403, 404)
- Business logic errors

### Using `executeExternalCall` for API Calls

For API calls within your agent, use the protected `executeExternalCall` method:

```typescript
protected async run(params) {
  // This call has automatic retry, timeout, and circuit breaker
  const data = await this.executeExternalCall(
    () => axios.get('https://api.example.com/data'),
    { 
      operationName: 'fetch-data',
      timeoutMs: 5000,
      retryOptions: { maxRetries: 2 }
    }
  );
  
  return { success: true, data };
}
```

---

## Circuit Breaker

Prevents cascading failures by "opening" the circuit after repeated failures.

### States

| State | Description |
|-------|-------------|
| **Closed** | Normal operation, requests flow through |
| **Open** | Circuit is tripped, requests fail immediately |
| **Half-Open** | After reset time, allows one test request |

### Configuration

```typescript
constructor() {
  super({
    circuitBreakerThreshold: 5,    // Open after 5 consecutive failures
    circuitBreakerResetMs: 60000,  // Reset after 1 minute
  });
}
```

### API

```typescript
// Get circuit breaker state
const state = agent.getCircuitBreakerState();
// 'closed' | 'open' | 'half-open'

// Manual reset
agent.resetCircuitBreaker();
```

### REST API

```http
POST /api/agents/:agentId/circuit-breaker/reset
```

---

## Timeout Handling

Each agent action can have a configurable timeout.

### Configuration

```typescript
constructor() {
  super({
    defaultTimeoutMs: 30000,  // 30 seconds default
    actionTimeouts: {
      'slow-action': 120000,      // 2 minutes for specific action
      'extract-questions': 90000, // 1.5 minutes for extraction
    }
  });
}
```

### Behavior

- Timeout errors are thrown as `Error: Operation timed out after ${ms}ms`
- Timeouts trigger retry logic (if configured)

---

## Input Validation (Zod)

Agents can register Zod schemas to validate input parameters.

### Registering Schemas

```typescript
import { z } from 'zod';

export class MyAgent extends AbstractAgent {
  protected validationSchemas = {
    'search': z.object({
      action: z.literal('search'),
      userId: z.string().min(1, 'User ID is required'),
      query: z.string().min(1),
      limit: z.number().int().positive().max(100).optional()
    }),
    
    'save-item': z.object({
      action: z.literal('save-item'),
      userId: z.string().min(1),
      itemId: z.string().min(1),
      notes: z.string().max(1000).optional()
    })
  };
}
```

### Validation Behavior

- Validation runs before agent execution
- Invalid params return `{ success: false, error: 'Validation error: ...' }`
- Detailed error messages include field paths

### Pre-built Schemas

See `backend/src/agents/schemas/index.ts` for pre-built schemas for all agents.

---

## Metrics & Telemetry

All agents collect execution metrics automatically.

### Agent-Level Metrics

```typescript
const metrics = agent.getMetrics();
/*
{
  totalExecutions: 150,
  successfulExecutions: 142,
  failedExecutions: 8,
  totalDurationMs: 45000,
  avgDurationMs: 300,
  lastExecutionTime: Date,
  actionMetrics: {
    'search': { count: 100, successCount: 98, failedCount: 2, avgDurationMs: 250 },
    'save': { count: 50, successCount: 44, failedCount: 6, avgDurationMs: 400 }
  },
  rateLimitHits: 5,
  retryCount: 12,
  circuitBreakerTrips: 1
}
*/
```

### Telemetry Service

The telemetry service collects metrics for Prometheus-compatible monitoring:

```typescript
import { telemetryService } from '../utils/telemetry';

// Get all metrics
const metrics = telemetryService.getAllMetrics();

// Get Prometheus format
const prometheus = telemetryService.getPrometheusMetrics();

// Get agent-specific summary
const agentMetrics = telemetryService.getAgentMetricsSummary('jobs');
```

### Available Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `agent_executions_total` | Counter | Total agent executions |
| `agent_executions_success_total` | Counter | Successful executions |
| `agent_executions_failed_total` | Counter | Failed executions |
| `agent_execution_duration_ms` | Histogram | Execution time distribution |
| `agent_rate_limit_hits_total` | Counter | Rate limit violations |
| `agent_retries_total` | Counter | Retry attempts |
| `agent_circuit_breaker_trips_total` | Counter | Circuit breaker opens |
| `agent_state` | Gauge | Current agent state |
| `external_api_calls_total` | Counter | External API call count |
| `external_api_duration_ms` | Histogram | External API call duration |

---

## API Endpoints

### Get All Metrics (JSON)

```http
GET /api/agents/metrics
```

Response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "metrics": {
    "agent_executions_total": { "type": "counter", "values": [...], "total": 500 }
  }
}
```

### Get Metrics (Prometheus Format)

```http
GET /api/agents/metrics?format=prometheus
```

Response:
```
# TYPE agent_executions_total counter
agent_executions_total{agent="jobs",action="search",success="true"} 150
agent_executions_total{agent="jobs",action="save",success="true"} 50
# TYPE agent_execution_duration_ms histogram
agent_execution_duration_ms{agent="jobs",action="search"} 245.5
```

### Get Agent-Specific Metrics

```http
GET /api/agents/:agentId/metrics
```

Response:
```json
{
  "success": true,
  "agent": "jobs",
  "metrics": {
    "totalExecutions": 200,
    "successfulExecutions": 195,
    "avgDurationMs": 250
  },
  "telemetry": { ... },
  "rateLimitStatus": { "available": 55, "limit": 60 },
  "circuitBreakerState": "closed"
}
```

### Reset Agent Metrics

```http
POST /api/agents/:agentId/metrics/reset
```

### Reset Circuit Breaker

```http
POST /api/agents/:agentId/circuit-breaker/reset
```

---

## Configuration

### Full Agent Config Interface

```typescript
interface AgentConfig {
  /** Rate limit: max requests per minute (default: 60) */
  rateLimit?: number;
  
  /** Default timeout in milliseconds (default: 30000) */
  defaultTimeoutMs?: number;
  
  /** Per-action timeout overrides */
  actionTimeouts?: Record<string, number>;
  
  /** Enable metrics collection (default: true) */
  metricsEnabled?: boolean;
  
  /** Circuit breaker threshold (default: 5) */
  circuitBreakerThreshold?: number;
  
  /** Circuit breaker reset time in ms (default: 60000) */
  circuitBreakerResetMs?: number;
  
  /** Retry options for failed operations */
  retryOptions?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    jitter?: boolean;
    jitterFactor?: number;
  };
}
```

---

## Usage Examples

### Creating a Custom Agent with All Features

```typescript
import { AbstractAgent, AgentConfig } from './AbstractAgent';
import { z } from 'zod';

export class CustomAgent extends AbstractAgent {
  readonly metadata = {
    id: 'custom',
    name: 'Custom Agent',
    description: 'My custom agent',
    icon: '🔧',
    color: '#8B5CF6'
  };

  // Register validation schemas
  protected validationSchemas = {
    'process': z.object({
      action: z.literal('process'),
      userId: z.string().min(1),
      data: z.object({
        items: z.array(z.string()),
        priority: z.enum(['low', 'medium', 'high'])
      })
    })
  };

  constructor(config?: AgentConfig) {
    super({
      rateLimit: 30,
      defaultTimeoutMs: 60000,
      actionTimeouts: {
        'process': 120000  // 2 min for processing
      },
      circuitBreakerThreshold: 3,
      retryOptions: {
        maxRetries: 2,
        initialDelayMs: 500
      },
      ...config
    });
  }

  protected async run(params: any) {
    const { action, data } = params;

    switch (action) {
      case 'process':
        return this.processItems(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  private async processItems(params: any) {
    // Use executeExternalCall for API calls
    const result = await this.executeExternalCall(
      () => this.callExternalApi(params.data),
      { operationName: 'external-api', timeoutMs: 10000 }
    );

    return { success: true, data: result };
  }

  private async callExternalApi(data: any) {
    // Your API call here
    return { processed: data.items.length };
  }
}
```

### Monitoring Agent Health

```typescript
// In your monitoring service
const checkAgentHealth = async () => {
  const agents = agentRegistry.getAll();
  
  for (const agent of agents) {
    const metrics = agent.getMetrics();
    const cbState = agent.getCircuitBreakerState();
    
    // Alert if circuit breaker is open
    if (cbState === 'open') {
      logger.warn(`Circuit breaker OPEN for ${agent.metadata.id}`);
    }
    
    // Alert if failure rate is high
    const failureRate = metrics.failedExecutions / metrics.totalExecutions;
    if (failureRate > 0.1) {
      logger.warn(`High failure rate (${(failureRate * 100).toFixed(1)}%) for ${agent.metadata.id}`);
    }
  }
};
```

---

## Best Practices

1. **Always validate inputs** - Register Zod schemas for all actions
2. **Use `executeExternalCall`** - Wraps API calls with retry + timeout + circuit breaker
3. **Configure timeouts per action** - Some actions are inherently slower
4. **Monitor metrics** - Watch for high retry counts or circuit breaker trips
5. **Set appropriate rate limits** - Match external API quotas
6. **Log with context** - Use `this.emitLog()` for real-time logging



