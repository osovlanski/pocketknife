/**
 * Agent Manifests Index
 *
 * Central export point for all agent manifests. When adding a new agent,
 * create a new manifest file and add the export here.
 *
 * The orchestrator auto-discovers capabilities from these manifests
 * via the AgentRegistry -- no hardcoded maps needed in the orchestrator.
 */

import type { AgentId, AgentMetadata } from '../types';

export { cookingManifest } from './cooking.manifest';
export { jobsManifest } from './jobs.manifest';
export { travelManifest } from './travel.manifest';
export { todoManifest } from './todo.manifest';
export { emailManifest } from './email.manifest';
export { shoppingManifest } from './shopping.manifest';
export { learningManifest } from './learning.manifest';
export { newsManifest } from './news.manifest';
export { diyManifest } from './diy.manifest';
export { problemsManifest } from './problems.manifest';
export { assistantManifest } from './assistant.manifest';

// Import all manifests for lookup
import { cookingManifest } from './cooking.manifest';
import { jobsManifest } from './jobs.manifest';
import { travelManifest } from './travel.manifest';
import { todoManifest } from './todo.manifest';
import { emailManifest } from './email.manifest';
import { shoppingManifest } from './shopping.manifest';
import { learningManifest } from './learning.manifest';
import { newsManifest } from './news.manifest';
import { diyManifest } from './diy.manifest';
import { problemsManifest } from './problems.manifest';
import { assistantManifest } from './assistant.manifest';

/**
 * All agent manifests indexed by agent ID.
 * Used by agents to look up their manifest during construction.
 */
export const AGENT_MANIFESTS: Record<AgentId, AgentMetadata> = {
  cooking: cookingManifest,
  jobs: jobsManifest,
  travel: travelManifest,
  todo: todoManifest,
  email: emailManifest,
  shopping: shoppingManifest,
  learning: learningManifest,
  news: newsManifest,
  diy: diyManifest,
  problems: problemsManifest,
  assistant: assistantManifest
};

/**
 * Get a manifest by agent ID. Throws if not found.
 */
export const getManifest = (agentId: AgentId): AgentMetadata => {
  const manifest = AGENT_MANIFESTS[agentId];
  if (!manifest) {
    throw new Error(`No manifest found for agent: ${agentId}`);
  }
  return manifest;
};
