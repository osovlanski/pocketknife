/**
 * Agent Routes
 * 
 * Unified API endpoints for all agents.
 * Provides consistent interface for agent operations.
 */

import { Router, Request, Response } from 'express';
import { agentRegistry, AgentId } from '../agents';
import { databaseService } from '../services/core/databaseService';
import { telemetryService } from '../utils/telemetry';

const router = Router();

/**
 * GET /api/agents
 * Get all registered agents and their metadata
 */
router.get('/', (req: Request, res: Response) => {
  const agents = agentRegistry.getAllMetadata();
  res.json({
    success: true,
    count: agents.length,
    agents
  });
});

/**
 * GET /api/agents/status
 * Get status of all agents
 */
router.get('/status', (req: Request, res: Response) => {
  const status = agentRegistry.getAllStatus();
  res.json({
    success: true,
    status
  });
});

/**
 * GET /api/agents/health
 * Health check for all agents
 */
router.get('/health', (req: Request, res: Response) => {
  const health = agentRegistry.healthCheck();
  res.json({
    success: true,
    ...health
  });
});

/**
 * GET /api/agents/:agentId
 * Get specific agent info and status
 */
router.get('/:agentId', (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  res.json({
    success: true,
    metadata: agent.metadata,
    state: agent.getState()
  });
});

/**
 * POST /api/agents/:agentId/execute
 * Execute an agent with given parameters
 */
router.post('/:agentId/execute', async (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  if (agent.isRunning()) {
    return res.status(409).json({
      success: false,
      error: `Agent '${agentId}' is already running`
    });
  }
  
  try {
    // Get default user if userId not provided
    let userId = req.body.userId;
    if (!userId && databaseService.isConfigured()) {
      const user = await databaseService.getDefaultUser();
      userId = user?.id;
    }
    
    const result = await agent.execute({
      ...req.body,
      userId
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/:agentId/stop
 * Stop a running agent
 */
router.post('/:agentId/stop', (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const stopped = agentRegistry.stopAgent(agentId);
  
  if (stopped) {
    res.json({
      success: true,
      message: `Stop signal sent to agent '${agentId}'`
    });
  } else {
    res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found or not running`
    });
  }
});

/**
 * POST /api/agents/stop-all
 * Stop all running agents
 */
router.post('/stop-all', (req: Request, res: Response) => {
  agentRegistry.stopAll();
  res.json({
    success: true,
    message: 'Stop signal sent to all running agents'
  });
});

/**
 * GET /api/agents/:agentId/history
 * Get agent's activity history for current user
 */
router.get('/:agentId/history', async (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  try {
    // Get default user
    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.json({
        success: true,
        history: []
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await agent.getUserHistory(user.id, limit);
    
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/metrics
 * Get all agent telemetry metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  const format = req.query.format as string;
  
  if (format === 'prometheus') {
    // Return Prometheus exposition format
    res.set('Content-Type', 'text/plain');
    res.send(telemetryService.getPrometheusMetrics());
  } else {
    // Return JSON format
    const allMetrics = telemetryService.getAllMetrics();
    const metricsObject: Record<string, unknown> = {};
    
    for (const [name, metric] of allMetrics) {
      metricsObject[name] = metric;
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: metricsObject
    });
  }
});

/**
 * GET /api/agents/:agentId/metrics
 * Get metrics for a specific agent
 */
router.get('/:agentId/metrics', (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  // Get agent-specific metrics from both agent instance and telemetry service
  const agentMetrics = agent.getMetrics();
  const telemetryMetrics = telemetryService.getAgentMetricsSummary(agentId);
  
  res.json({
    success: true,
    agent: agentId,
    metrics: agentMetrics,
    telemetry: telemetryMetrics,
    rateLimitStatus: agent.getRateLimitStatus(),
    circuitBreakerState: agent.getCircuitBreakerState()
  });
});

/**
 * POST /api/agents/:agentId/metrics/reset
 * Reset metrics for a specific agent
 */
router.post('/:agentId/metrics/reset', (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  agent.resetMetrics();
  
  res.json({
    success: true,
    message: `Metrics reset for agent '${agentId}'`
  });
});

/**
 * POST /api/agents/:agentId/circuit-breaker/reset
 * Reset circuit breaker for a specific agent
 */
router.post('/:agentId/circuit-breaker/reset', (req: Request, res: Response) => {
  const agentId = req.params.agentId as AgentId;
  const agent = agentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`
    });
  }
  
  agent.resetCircuitBreaker();
  
  res.json({
    success: true,
    message: `Circuit breaker reset for agent '${agentId}'`,
    newState: agent.getCircuitBreakerState()
  });
});

export default router;








