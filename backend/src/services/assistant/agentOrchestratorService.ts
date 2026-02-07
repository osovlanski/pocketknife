/**
 * Agent Orchestrator Service
 *
 * Central service for cross-agent execution and capability discovery.
 * Used by the AI Assistant to understand and invoke agent capabilities.
 *
 * All agent metadata (keywords, capabilities, classification) is read
 * from the AgentRegistry which auto-discovers from agent manifests.
 * No hardcoded maps -- adding a new agent only requires a manifest file.
 */

import { agentRegistry } from '../../agents/AgentRegistry';
import { configService } from '../core/configService';
import logger from '../../utils/logger';
import type { AgentId, AgentType, AgentMetadata, AgentResult, AgentParams, AgentCapability, CapabilityParameter } from '../../agents/types';

// Re-export capability types so consumers don't need to import from agents/types
export type { AgentCapability, CapabilityParameter };

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full agent info with capabilities and availability
 */
export interface AgentInfo {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: AgentCapability[];
  keywords: string[];
  agentType: AgentType;
  isAvailable: boolean;
}

/**
 * Workflow step for multi-step execution
 */
export interface WorkflowStep {
  id: string;
  agentId: AgentId;
  action: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: AgentResult;
  error?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  summary?: string;
  error?: string;
  duration?: number;
}

// =============================================================================
// ORCHESTRATOR SERVICE
// =============================================================================

class AgentOrchestratorService {
  /**
   * Get all available agents with their capabilities.
   * Reads everything from the registry -- no hardcoded maps.
   */
  getAvailableAgents(): AgentInfo[] {
    const agents = agentRegistry.getAll();

    return agents.map(agent => {
      const meta = agent.metadata;
      return {
        id: meta.id,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        color: meta.color,
        capabilities: meta.capabilities,
        keywords: meta.keywords,
        agentType: meta.agentType,
        isAvailable: !agent.isRunning()
      };
    });
  }

  /**
   * Get agent keywords/hashtags from its manifest metadata
   */
  getAgentKeywords(agentId: AgentId): string[] {
    const agent = agentRegistry.get(agentId);
    return agent?.metadata.keywords ?? [];
  }

  /**
   * Find agent by keyword/hashtag match
   */
  findAgentByKeyword(keyword: string): AgentId | null {
    const normalizedKeyword = keyword.toLowerCase().startsWith('#')
      ? keyword.toLowerCase()
      : `#${keyword.toLowerCase()}`;

    for (const agent of agentRegistry.getAll()) {
      const matches = agent.metadata.keywords.some(
        k => k.toLowerCase() === normalizedKeyword
      );
      if (matches) {
        return agent.metadata.id;
      }
    }
    return null;
  }

  /**
   * Get capabilities for a specific agent from its manifest
   */
  getAgentCapabilities(agentId: AgentId): AgentCapability[] {
    const agent = agentRegistry.get(agentId);
    return agent?.metadata.capabilities ?? [];
  }

  /**
   * Get agent type classification (simple or deep) from its manifest
   */
  getAgentType(agentId: AgentId): AgentType {
    const agent = agentRegistry.get(agentId);
    return agent?.metadata.agentType ?? 'deep';
  }

  /**
   * Get agent metadata
   */
  getAgentMetadata(agentId: AgentId): AgentMetadata | undefined {
    const agent = agentRegistry.get(agentId);
    return agent?.metadata;
  }

  /**
   * Execute an action on a specific agent
   */
  async executeAgentAction(
    agentId: AgentId,
    action: string,
    params: Record<string, unknown>,
    userId?: string
  ): Promise<AgentResult> {
    const agent = agentRegistry.get(agentId);

    if (!agent) {
      return { success: false, error: `Agent '${agentId}' not found` };
    }

    if (agent.isRunning()) {
      return { success: false, error: `Agent '${agentId}' is currently busy` };
    }

    try {
      logger.agent(`Executing ${agentId}.${action}`, { params });

      const result = await agent.execute({
        action,
        userId,
        ...params
      });

      logger.agent(`Completed ${agentId}.${action}`, { success: result.success });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.fail(`Agent execution failed: ${agentId}.${action}`, { error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Execute a multi-step workflow
   */
  async executeWorkflow(
    steps: WorkflowStep[],
    userId?: string,
    onProgress?: (step: WorkflowStep) => void
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const maxSteps = configService.get('assistant.workflow.maxSteps', 10);

    if (steps.length > maxSteps) {
      return {
        success: false,
        steps,
        error: `Workflow exceeds maximum of ${maxSteps} steps`
      };
    }

    const completedSteps: Map<string, AgentResult> = new Map();

    for (const step of steps) {
      // Check dependencies
      if (step.dependsOn) {
        const unmetDeps = step.dependsOn.filter(depId => !completedSteps.has(depId));
        if (unmetDeps.length > 0) {
          step.status = 'skipped';
          step.error = `Unmet dependencies: ${unmetDeps.join(', ')}`;
          continue;
        }
      }

      step.status = 'running';
      onProgress?.(step);

      try {
        const result = await this.executeAgentAction(
          step.agentId,
          step.action,
          step.params,
          userId
        );

        step.result = result;
        step.status = result.success ? 'completed' : 'failed';

        if (result.success) {
          completedSteps.set(step.id, result);
        } else {
          step.error = result.error;
        }
      } catch (error: unknown) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
      }

      onProgress?.(step);
    }

    const allSucceeded = steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const duration = Date.now() - startTime;

    return {
      success: allSucceeded,
      steps,
      duration
    };
  }

  /**
   * Build a capabilities prompt for AI to understand available actions.
   * Dynamically assembled from registered agent manifests.
   */
  buildCapabilitiesPrompt(): string {
    const agents = this.getAvailableAgents();

    let prompt = 'You have access to the following agents and their capabilities:\n\n';

    for (const agent of agents) {
      if (agent.capabilities.length === 0) continue;

      prompt += `## ${agent.icon} ${agent.name} (${agent.id}) [${agent.agentType}]\n`;
      prompt += `${agent.description}\n\n`;
      prompt += 'Actions:\n';

      for (const cap of agent.capabilities) {
        prompt += `- **${cap.action}**: ${cap.description}\n`;

        if (cap.parameters.length > 0) {
          const required = cap.parameters.filter(p => p.required);
          const optional = cap.parameters.filter(p => !p.required);

          if (required.length > 0) {
            prompt += `  Required: ${required.map(p => `${p.name} (${p.type})`).join(', ')}\n`;
          }
          if (optional.length > 0) {
            prompt += `  Optional: ${optional.map(p => `${p.name} (${p.type})`).join(', ')}\n`;
          }
        }

        // Include examples to help AI recognize user intent
        if (cap.examples && cap.examples.length > 0) {
          prompt += `  Examples: "${cap.examples.join('", "')}"\n`;
        }
      }

      prompt += '\n';
    }

    return prompt;
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
export default agentOrchestratorService;
