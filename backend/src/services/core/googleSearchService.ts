/**
 * Google Custom Search Service (Shared)
 * 
 * Provides Google Custom Search capabilities to all agents.
 * Manages a shared quota of 100 free queries/day across all agents.
 * 
 * Each agent can configure its own search domains or use agent-specific
 * search engine IDs for optimized results.
 */

import axios from 'axios';
import claudeService from './claudeService';

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

// Get daily limit from config (defaults to 100)
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
      console.log('📊 [QuotaManager] New day detected, resetting quota counter');
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
    console.log(`📊 [QuotaManager] Google CSE usage: ${this.state.count}/${getDailyLimit()} (${agent}: ${this.state.usageByAgent[agent]})`);
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

// Singleton quota manager shared across all agents
const quotaManager = new QuotaManager();

// =============================================================================
// AGENT-SPECIFIC SEARCH CONFIGURATIONS
// =============================================================================

const AGENT_SEARCH_CONFIGS: Record<AgentType, {
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

// =============================================================================
// GOOGLE SEARCH SERVICE CLASS
// =============================================================================

class GoogleSearchService {
  private apiKey: string | null = null;
  private defaultCseId: string | null = null;
  private isConfigured: boolean | null = null;
  private initialized = false;

  /**
   * Lazy initialization - reads env vars when first needed (after dotenv.config() has run)
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    
    this.apiKey = process.env.GOOGLE_CSE_API_KEY || '';
    this.defaultCseId = process.env.GOOGLE_CSE_ID || '';
    this.isConfigured = Boolean(this.apiKey && this.defaultCseId);
    this.initialized = true;

    if (this.isConfigured) {
      console.log('✅ [GoogleSearch] Configured with', quotaManager.getStatus().remaining, 'daily quota');
    } else {
      console.log('⚠️ [GoogleSearch] Not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID in .env');
    }
  }

  /**
   * Check if the service is configured
   */
  isAvailable(): boolean {
    this.ensureInitialized();
    return this.isConfigured!;
  }

  /**
   * Check if quota is available
   */
  hasQuota(): boolean {
    return quotaManager.canUse();
  }

  /**
   * Get current quota status
   */
  getQuotaStatus() {
    return quotaManager.getStatus();
  }

  /**
   * Search using Google Custom Search API
   * 
   * @param query - Search query
   * @param agent - Agent type for quota tracking and site filtering
   * @param options - Additional search options
   */
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
    
    if (!this.isConfigured) {
      console.log('⚠️ [GoogleSearch] Service not configured');
      return [];
    }

    if (!quotaManager.canUse()) {
      console.log('⚠️ [GoogleSearch] Daily quota exhausted');
      throw new Error('QUOTA_EXHAUSTED');
    }

    const { maxResults = 10, siteRestrict, geolocation, language } = options;
    const config = AGENT_SEARCH_CONFIGS[agent];

    // Build site restriction query
    let siteQuery = '';
    const sites = siteRestrict || config.sites;
    if (sites.length > 0) {
      // Google CSE supports up to 10 sites per query with site: operator
      const sitesToUse = sites.slice(0, 10);
      siteQuery = ` (${sitesToUse.map(s => `site:${s}`).join(' OR ')})`;
    }

    const fullQuery = `${query}${siteQuery}`;

    try {
      console.log(`🔍 [GoogleSearch] Searching (${agent}): "${query}"`);

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
          timeout: 10000
        }
      );

      // Increment quota after successful call
      quotaManager.increment(agent);

      if (response.data.error) {
        console.error('❌ [GoogleSearch] API error:', response.data.error.message);
        throw new Error(response.data.error.message);
      }

      const items = response.data.items || [];
      console.log(`📦 [GoogleSearch] Got ${items.length} results for ${agent}`);

      return items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        imageUrl: item.pagemap?.cse_image?.[0]?.src
      }));
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('❌ [GoogleSearch] Rate limit exceeded');
        throw new Error('RATE_LIMIT');
      }
      if (error.response?.status === 403) {
        console.error('❌ [GoogleSearch] API key invalid or quota exceeded');
        throw new Error('QUOTA_EXCEEDED');
      }
      
      console.error('❌ [GoogleSearch] Search failed:', error.message);
      throw error;
    }
  }

  /**
   * Search and parse results using Claude
   * 
   * @param query - Search query
   * @param agent - Agent type
   * @param options - Search options
   */
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

    const config = AGENT_SEARCH_CONFIGS[agent];

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

      const response = await claudeService.generateText(prompt, 2000);
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
      console.error('❌ [GoogleSearch] Parse failed, returning raw results:', error.message);
      
      // Return unparsed results as fallback
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
   * Get the search configuration for an agent
   */
  getAgentConfig(agent: AgentType) {
    return AGENT_SEARCH_CONFIGS[agent];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const googleSearchService = new GoogleSearchService();
export { quotaManager };
export type { SearchResult, ParsedSearchResult, AgentType };
export default googleSearchService;


