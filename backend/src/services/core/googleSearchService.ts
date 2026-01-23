/**
 * Google Custom Search Service (Shared)
 * 
 * Provides Google Custom Search capabilities to all agents.
 * Manages a shared quota of 100 free queries/day across all agents.
 * 
 * NOTE: Search site configurations are now stored in the database (SearchSiteConfig table).
 * The hardcoded fallback configs are kept for initial migration and offline mode.
 */

import axios from 'axios';
import claudeService from './claudeService';
import { searchSiteConfigService } from './externalDataService';
import { getPrisma } from './databaseService';
import logger from '../../utils/logger';
import { configService } from './configService';

// Get timeout from config
const GOOGLE_SEARCH_TIMEOUT = () => configService.get('google.search.timeoutMs', 10000);

// =============================================================================
// TYPES
// =============================================================================

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

interface ParsedSearchResult {
  title: string;
  description: string;
  url: string;
  source: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

interface GoogleCSEResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
    pagemap?: {
      cse_image?: Array<{ src: string }>;
      metatags?: Array<Record<string, string>>;
    };
  }>;
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

type AgentType = 'shopping' | 'travel' | 'learning' | 'problems' | 'jobs' | 'general';

// =============================================================================
// QUOTA MANAGER (Shared across all agents)
// =============================================================================

interface QuotaState {
  count: number;
  resetDate: string;
  usageByAgent: Record<string, number>;
}

import { configService } from './configService';

const getDailyLimit = () => configService.get('google.cse.dailyLimit', 100);

class QuotaManager {
  private state: QuotaState;

  constructor() {
    this.state = {
      count: 0,
      resetDate: this.getTodayDate(),
      usageByAgent: {}
    };
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private checkAndReset(): void {
    const today = this.getTodayDate();
    if (this.state.resetDate !== today) {
      logger.info('New day detected, resetting quota counter', { context: 'QuotaManager' });
      this.state = {
        count: 0,
        resetDate: today,
        usageByAgent: {}
      };
    }
  }

  canUse(): boolean {
    this.checkAndReset();
    return this.state.count < getDailyLimit();
  }

  increment(agent: AgentType): void {
    this.state.count++;
    this.state.usageByAgent[agent] = (this.state.usageByAgent[agent] || 0) + 1;
    logger.info('Google CSE usage updated', { 
      used: this.state.count, 
      limit: getDailyLimit(), 
      agent, 
      agentUsage: this.state.usageByAgent[agent] 
    });
  }

  getStatus(): { 
    used: number; 
    limit: number; 
    remaining: number; 
    usageByAgent: Record<string, number>;
    resetDate: string;
  } {
    this.checkAndReset();
    const limit = getDailyLimit();
    return {
      used: this.state.count,
      limit,
      remaining: limit - this.state.count,
      usageByAgent: { ...this.state.usageByAgent },
      resetDate: this.state.resetDate
    };
  }

  getRemainingQuota(): number {
    this.checkAndReset();
    return getDailyLimit() - this.state.count;
  }

  isQuotaLow(): boolean {
    return this.getRemainingQuota() < 20;
  }
}

const quotaManager = new QuotaManager();

// =============================================================================
// AGENT-SPECIFIC SEARCH CONFIGURATIONS
// =============================================================================

// Fallback hardcoded configs (used when database is empty)
const FALLBACK_AGENT_SEARCH_CONFIGS: Record<AgentType, {
  sites: string[];
  description: string;
  parsePrompt: string;
}> = {
  shopping: {
    sites: [
      'zap.co.il', 'ksp.co.il', 'ivory.co.il', 'bug.co.il',
      'shufersal.co.il', 'rami-levy.co.il', 'azrieli.com',
      'ace.co.il', 'homecenter.co.il', 'lastprice.co.il'
    ],
    description: 'Israeli e-commerce and price comparison sites',
    parsePrompt: `Extract product information: name, price (ILS), store, discount percentage if any.`
  },
  travel: {
    sites: [
      'tripadvisor.com', 'booking.com', 'hotels.com',
      'viator.com', 'getyourguide.com', 'klook.com',
      'lonely planet.com', 'timeout.com', 'yelp.com'
    ],
    description: 'Travel, attractions, restaurants, and local experiences',
    parsePrompt: `Extract travel information: place name, type (attraction/restaurant/hotel/activity), rating if available, location, key highlights.`
  },
  learning: {
    sites: [
      'dev.to', 'medium.com', 'freecodecamp.org',
      'stackoverflow.com', 'github.com', 'docs.microsoft.com',
      'developer.mozilla.org', 'css-tricks.com', 'smashingmagazine.com',
      'hackernoon.com', 'dzone.com', 'infoq.com'
    ],
    description: 'Technical tutorials, documentation, and learning resources',
    parsePrompt: `Extract learning resource: title, type (tutorial/article/documentation/video), technology/topic, difficulty level if apparent, key concepts covered.`
  },
  problems: {
    sites: [
      'leetcode.com', 'hackerrank.com', 'codewars.com',
      'stackoverflow.com', 'github.com', 'geeksforgeeks.org',
      'codeforces.com', 'topcoder.com', 'exercism.org'
    ],
    description: 'Coding problems, solutions, and programming Q&A',
    parsePrompt: `Extract problem/solution information: problem title, platform, difficulty, programming language, key concepts/algorithms used.`
  },
  jobs: {
    sites: [
      'linkedin.com/jobs', 'indeed.com', 'glassdoor.com',
      'drushim.co.il', 'alljobs.co.il', 'jobmaster.co.il',
      'gotfriends.co.il', 'hi-tech.co.il', 'israelhitech.co.il'
    ],
    description: 'Job listings and career opportunities',
    parsePrompt: `Extract job information: title, company, location, job type (full-time/part-time/remote), key requirements.`
  },
  general: {
    sites: [],
    description: 'General web search without site restrictions',
    parsePrompt: `Extract key information: title, description, source, main topic.`
  }
};

/**
 * Get search config from database, fallback to hardcoded
 */
async function getAgentSearchConfig(agentType: AgentType): Promise<{
  sites: string[];
  description: string;
  parsePrompt: string;
}> {
  const agentTypeMap: Record<AgentType, string> = {
    shopping: 'SHOPPING',
    travel: 'TRAVEL',
    learning: 'LEARNING',
    problems: 'PROBLEMS',
    jobs: 'JOBS',
    general: 'GENERAL'
  };
  
  try {
    const prisma = getPrisma();
    if (!prisma) return FALLBACK_AGENT_SEARCH_CONFIGS[agentType];
    
    const dbConfigs = await (prisma as any).searchSiteConfig.findMany({
      where: {
        agentType: agentTypeMap[agentType],
        isActive: true
      },
      orderBy: { priority: 'asc' }
    });
    
    if (dbConfigs.length > 0) {
      const sites = dbConfigs.map((c: any) => c.domain);
      const parsePrompt = dbConfigs[0]?.parsePrompt || FALLBACK_AGENT_SEARCH_CONFIGS[agentType].parsePrompt;
      
      return {
        sites,
        description: FALLBACK_AGENT_SEARCH_CONFIGS[agentType].description,
        parsePrompt
      };
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch search site configs from database');
  }
  
  return FALLBACK_AGENT_SEARCH_CONFIGS[agentType];
}

/**
 * Migrate hardcoded search configs to database
 */
async function migrateSearchConfigsToDatabase(): Promise<number> {
  let count = 0;
  
  for (const [agentType, config] of Object.entries(FALLBACK_AGENT_SEARCH_CONFIGS)) {
    const agentTypeMap: Record<string, string> = {
      shopping: 'SHOPPING',
      travel: 'TRAVEL',
      learning: 'LEARNING',
      problems: 'PROBLEMS',
      jobs: 'JOBS',
      general: 'GENERAL'
    };
    
    for (const domain of config.sites) {
      try {
        await searchSiteConfigService.create({
          agentType: agentTypeMap[agentType] as any,
          domain,
          parsePrompt: config.parsePrompt
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating site ${domain}:`, error.message);
        }
      }
    }
  }
  
  console.log(`✅ Migrated ${count} search site configs to database`);
  return count;
}

// =============================================================================
// GOOGLE SEARCH SERVICE CLASS
// =============================================================================

class GoogleSearchService {
  private apiKey: string | null = null;
  private defaultCseId: string | null = null;
  private _isConfigured: boolean | null = null;
  private initialized = false;

  /**
   * Check if GoogleSearch is configured with API key and CSE ID
   */
  public get isConfigured(): boolean {
    this.ensureInitialized();
    return this._isConfigured || false;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    
    this.apiKey = process.env.GOOGLE_CSE_API_KEY || '';
    this.defaultCseId = process.env.GOOGLE_CSE_ID || '';
    this._isConfigured = Boolean(this.apiKey && this.defaultCseId);
    this.initialized = true;

    if (this._isConfigured) {
      logger.success('GoogleSearch configured', { remaining: quotaManager.getStatus().remaining });
    } else {
      logger.warn('GoogleSearch not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID in .env');
    }
  }

  isAvailable(): boolean {
    this.ensureInitialized();
    return this._isConfigured!;
  }

  hasQuota(): boolean {
    return quotaManager.canUse();
  }

  getQuotaStatus() {
    return quotaManager.getStatus();
  }

  async search(
    query: string,
    agent: AgentType,
    options: {
      maxResults?: number;
      siteRestrict?: string[];
      geolocation?: string;
      language?: string;
    } = {}
  ): Promise<SearchResult[]> {
    this.ensureInitialized();
    
    if (!this._isConfigured) {
      logger.warn('GoogleSearch service not configured');
      return [];
    }

    if (!quotaManager.canUse()) {
      logger.warn('GoogleSearch daily quota exhausted');
      throw new Error('QUOTA_EXHAUSTED');
    }

    const { maxResults = 10, siteRestrict, geolocation, language } = options;
    // Use database config if available, fallback to hardcoded
    const config = await getAgentSearchConfig(agent);

    let siteQuery = '';
    const sites = siteRestrict || config.sites;
    if (sites.length > 0) {
      const sitesToUse = sites.slice(0, 10);
      siteQuery = ` (${sitesToUse.map(s => `site:${s}`).join(' OR ')})`;
    }

    const fullQuery = `${query}${siteQuery}`;

    try {
      logger.search(`GoogleSearch (${agent}): "${query}"`);

      const response = await axios.get<GoogleCSEResponse>(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: this.apiKey,
            cx: this.defaultCseId,
            q: fullQuery,
            gl: geolocation || undefined,
            lr: language ? `lang_${language}` : undefined,
            num: Math.min(maxResults, 10)
          },
          timeout: GOOGLE_SEARCH_TIMEOUT()
        }
      );

      quotaManager.increment(agent);

      if (response.data.error) {
        logger.fail('GoogleSearch API error', { message: response.data.error.message });
        throw new Error(response.data.error.message);
      }

      const items = response.data.items || [];
      logger.found(`GoogleSearch results for ${agent}`, { count: items.length });

      return items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        imageUrl: item.pagemap?.cse_image?.[0]?.src
      }));
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.fail('GoogleSearch rate limit exceeded');
        throw new Error('RATE_LIMIT');
      }
      if (error.response?.status === 403) {
        logger.fail('GoogleSearch API key invalid or quota exceeded');
        throw new Error('QUOTA_EXCEEDED');
      }
      
      logger.fail('GoogleSearch failed', { error: error.message });
      throw error;
    }
  }

  async searchAndParse(
    query: string,
    agent: AgentType,
    options: {
      maxResults?: number;
      siteRestrict?: string[];
      geolocation?: string;
      language?: string;
    } = {}
  ): Promise<ParsedSearchResult[]> {
    const results = await this.search(query, agent, options);
    
    if (results.length === 0) {
      return [];
    }

    // Use database config if available, fallback to hardcoded
    const config = await getAgentSearchConfig(agent);

    try {
      const prompt = `Parse these search results for a ${agent} agent.
${config.parsePrompt}

Search query: "${query}"

Search results:
${results.map((r, i) => `
${i + 1}. Title: ${r.title}
   URL: ${r.link}
   Site: ${r.displayLink}
   Snippet: ${r.snippet}
`).join('\n')}

Respond ONLY with valid JSON (no markdown):
{
  "results": [
    {
      "title": "clean title",
      "description": "relevant description",
      "url": "url",
      "source": "source name",
      "metadata": { ... any extracted metadata ... }
    }
  ]
}`;

      const aiMaxTokens = configService.get('ai.claude.defaultMaxTokens', 2000);
      const response = await claudeService.generateText(prompt, aiMaxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      return (parsed.results || []).map((r: any, i: number) => ({
        title: r.title || results[i]?.title || 'Unknown',
        description: r.description || results[i]?.snippet || '',
        url: r.url || results[i]?.link || '',
        source: r.source || results[i]?.displayLink || '',
        imageUrl: results[i]?.imageUrl,
        metadata: r.metadata || {}
      }));
    } catch (error: any) {
      logger.fail('GoogleSearch parse failed, returning raw results', { error: error.message });
      
      return results.map(r => ({
        title: r.title,
        description: r.snippet,
        url: r.link,
        source: r.displayLink,
        imageUrl: r.imageUrl
      }));
    }
  }

  /**
   * Get agent config (sync - uses fallback only)
   */
  getAgentConfig(agent: AgentType) {
    return FALLBACK_AGENT_SEARCH_CONFIGS[agent];
  }

  /**
   * Get agent config (async - database first)
   */
  async getAgentConfigAsync(agent: AgentType) {
    return getAgentSearchConfig(agent);
  }

  /**
   * Migrate hardcoded configs to database
   */
  async migrateToDatabase() {
    return migrateSearchConfigsToDatabase();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const googleSearchService = new GoogleSearchService();
export { quotaManager };
export type { SearchResult, ParsedSearchResult, AgentType };
export default googleSearchService;
