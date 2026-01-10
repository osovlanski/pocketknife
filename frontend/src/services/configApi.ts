/**
 * Config API Service
 * 
 * Fetches configuration from the backend.
 * Caches configs to avoid unnecessary requests.
 */

import axios from 'axios';
import { API_BASE_URL, config } from '../config';

// =============================================================================
// TYPES
// =============================================================================

export interface ShoppingThresholds {
  excellent: number;  // Default: 80
  good: number;       // Default: 60
  fair: number;       // Default: 40
  notifyThreshold: number; // Default: 70
}

export interface JobThresholds {
  excellent: number;  // Default: 80
  good: number;       // Default: 60
  streamThreshold: number; // Default: 75
}

export interface AgentStatus {
  email: boolean;
  jobs: boolean;
  travel: boolean;
  learning: boolean;
  problems: boolean;
  todo: boolean;
  shopping: boolean;
  groceries: boolean;
}

export interface ConfigResponse {
  success: boolean;
  settings: Record<string, Record<string, unknown>>;
  thresholds: {
    shopping: ShoppingThresholds;
    jobs: JobThresholds;
  };
  agents?: AgentStatus;
}

// =============================================================================
// CACHE
// =============================================================================

let configCache: ConfigResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = config.cache.ttlMs; // From config

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch public configuration from backend
 */
export const getConfig = async (): Promise<ConfigResponse> => {
  // Return cached if still valid
  if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return configCache;
  }

  try {
    const response = await axios.get<ConfigResponse>(`${API_BASE_URL}/config`);
    configCache = response.data;
    cacheTimestamp = Date.now();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    // Return defaults if fetch fails
    return getDefaultConfig();
  }
};

/**
 * Get shopping thresholds
 */
export const getShoppingThresholds = async (): Promise<ShoppingThresholds> => {
  const config = await getConfig();
  return config.thresholds?.shopping || getDefaultConfig().thresholds.shopping;
};

/**
 * Get job thresholds
 */
export const getJobThresholds = async (): Promise<JobThresholds> => {
  const config = await getConfig();
  return config.thresholds?.jobs || getDefaultConfig().thresholds.jobs;
};

/**
 * Get agent enabled status
 */
export const getAgentStatus = async (): Promise<AgentStatus> => {
  const config = await getConfig();
  return config.agents || getDefaultConfig().agents!;
};

/**
 * Check if a specific agent is enabled
 */
export const isAgentEnabled = async (agentId: string): Promise<boolean> => {
  const agents = await getAgentStatus();
  return agents[agentId as keyof AgentStatus] ?? true;
};

/**
 * Invalidate cache (call after config update)
 */
export const invalidateCache = (): void => {
  configCache = null;
  cacheTimestamp = 0;
};

/**
 * Get default configuration (fallback)
 */
export const getDefaultConfig = (): ConfigResponse => ({
  success: true,
  settings: {},
  thresholds: {
    shopping: {
      excellent: 80,
      good: 60,
      fair: 40,
      notifyThreshold: 70
    },
    jobs: {
      excellent: 80,
      good: 60,
      streamThreshold: 75
    }
  },
  agents: {
    email: true,
    jobs: true,
    travel: true,
    learning: true,
    problems: true,
    todo: true,
    shopping: true,
    groceries: true
  }
});

export default {
  getConfig,
  getShoppingThresholds,
  getJobThresholds,
  getAgentStatus,
  isAgentEnabled,
  invalidateCache,
  getDefaultConfig
};



