/**
 * Agent Routes
 * 
 * Unified API endpoints for all agents.
 * Provides consistent interface for agent operations.
 */

import { Router, Request, Response } from 'express';
import { agentRegistry, AgentId } from '../agents';
import { databaseService } from '../services/core/databaseService';

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

export default router;




