/**
 * Problems Agent
 * 
 * Searches for coding problems from LeetCode, Codeforces, and curated lists.
 * Evaluates code solutions using AI and tracks solved problems.
 * 
 * This agent wraps the existing problem-solving services.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getManifest } from './manifests';
import { getPrisma } from '../services/core/databaseService';
import { googleSearchService } from '../services/core/googleSearchService';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface ProblemsParams extends AgentParams {
  action: 'save-solution' | 'get-solved' | 'search-solutions' | 'update-preferences';
  difficulty?: string;
  source?: string;
  problemData?: any;
  code?: string;
  language?: string;
  query?: string;
  preferences?: {
    preferredLanguage?: string;
    preferredDifficulty?: string;
    completedLists?: string[];
  };
}

interface ProblemsResult {
  savedProblem?: any;
  solvedProblems?: any[];
  solutionResults?: SolutionSearchResult[];
  preferences?: any;
}

interface SolutionSearchResult {
  title: string;
  description: string;
  url: string;
  source: string;
  platform: string;
  language?: string;
  concepts?: string[];
}

export class ProblemsAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = getManifest('problems');

  protected async run(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { action } = params;

    switch (action) {
      case 'save-solution':
        return this.saveSolution(params);
      case 'get-solved':
        return this.getSolvedProblems(params);
      case 'search-solutions':
        return this.searchSolutions(params);
      case 'update-preferences':
        return this.updatePreferences(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Save a solved problem to database
   */
  private async saveSolution(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { userId, problemData, code, language } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!problemData || !code) {
      return { success: false, error: 'Problem data and code are required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog(`💾 Saving solution for: ${problemData.title}`, 'info');

    // Validate difficulty
    const validDifficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];
    const difficulty: Difficulty = validDifficulties.includes(problemData.difficulty) 
      ? problemData.difficulty 
      : 'Medium';

    try {
      const savedProblem = await prisma.solvedProblem.upsert({
        where: {
          userId_problemId_source: {
            userId,
            problemId: problemData.id,
            source: problemData.source
          }
        },
        update: {
          code,
          language: language || 'javascript',
          score: problemData.score,
          attempts: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          userId,
          problemId: problemData.id,
          title: problemData.title,
          source: problemData.source,
          difficulty,
          language: language || 'javascript',
          code,
          score: problemData.score,
          topics: problemData.topics || [],
          companyTags: problemData.companyTags || [],
          listTags: problemData.listTags || [],
          hints: problemData.hintsUsed || 0,
          attempts: 1
        }
      });

      this.emitLog('✅ Solution saved', 'success');

      return {
        success: true,
        data: { savedProblem }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's solved problems
   */
  private async getSolvedProblems(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { userId, source, difficulty } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const where: any = { userId };
      if (source) where.source = source;
      if (difficulty) where.difficulty = difficulty;

      const solvedProblems = await prisma.solvedProblem.findMany({
        where,
        orderBy: { solvedAt: 'desc' },
        take: 100
      });

      return {
        success: true,
        data: { solvedProblems }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for problem solutions using Google Custom Search
   * Searches LeetCode, StackOverflow, GeeksforGeeks, and GitHub
   */
  private async searchSolutions(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { query, language } = params;

    if (!query) {
      return { success: false, error: 'Search query is required' };
    }

    this.emitLog(`🔍 Searching for solutions: "${query}"...`, 'info');
    this.emitProgress(10);

    // Check if Google Search is available
    if (!googleSearchService.isAvailable()) {
      this.emitLog('⚠️ Google Search not configured', 'warning');
      return { 
        success: false, 
        error: 'Google Search not configured. Add GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID to .env' 
      };
    }

    if (!googleSearchService.hasQuota()) {
      const status = googleSearchService.getQuotaStatus();
      this.emitLog(`⚠️ Google Search quota exhausted (${status.used}/${status.limit})`, 'warning');
      return { 
        success: false, 
        error: 'Daily search quota exhausted. Try again tomorrow.' 
      };
    }

    try {
      // Build search query with optional language
      const searchQuery = language 
        ? `${query} ${language} solution explanation`
        : `${query} solution algorithm explanation`;

      this.emitProgress(30);

      const results = await googleSearchService.searchAndParse(searchQuery, 'problems', {
        maxResults: 10
      });

      this.emitProgress(80);

      // Transform results into SolutionSearchResult format
      const solutionResults: SolutionSearchResult[] = results.map(r => ({
        title: r.title,
        description: r.description,
        url: r.url,
        source: r.source,
        platform: this.inferPlatform(r.source, r.url),
        language: r.metadata?.language || language,
        concepts: r.metadata?.concepts
      }));

      this.emitLog(`✅ Found ${solutionResults.length} solution resources`, 'success');
      this.emitProgress(100);

      // Log search quota status
      const quotaStatus = googleSearchService.getQuotaStatus();
      this.emitLog(`📊 Search quota: ${quotaStatus.remaining}/${quotaStatus.limit} remaining`, 'info');

      // Log activity
      await this.saveUserActivity(params.userId, 'search-solutions', {
        query,
        language,
        resultsCount: solutionResults.length
      });

      return {
        success: true,
        data: { solutionResults }
      };
    } catch (error: any) {
      this.emitLog(`❌ Solution search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Infer the platform from URL/source
   */
  private inferPlatform(source: string, url: string): string {
    const combined = `${source} ${url}`.toLowerCase();
    
    if (combined.includes('leetcode')) return 'LeetCode';
    if (combined.includes('stackoverflow')) return 'Stack Overflow';
    if (combined.includes('geeksforgeeks')) return 'GeeksforGeeks';
    if (combined.includes('github')) return 'GitHub';
    if (combined.includes('hackerrank')) return 'HackerRank';
    if (combined.includes('codewars')) return 'Codewars';
    if (combined.includes('codeforces')) return 'Codeforces';
    if (combined.includes('medium')) return 'Medium';
    
    return source;
  }

  /**
   * Update user's problem-solving preferences
   */
  private async updatePreferences(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { userId, preferences } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!preferences) {
      return { success: false, error: 'Preferences are required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog('⚙️ Updating problem preferences...', 'info');

    try {
      const updatedPrefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          preferredLanguage: preferences.preferredLanguage,
          preferredDifficulty: preferences.preferredDifficulty,
          completedLists: preferences.completedLists
        },
        create: {
          userId,
          preferredLanguage: preferences.preferredLanguage || 'javascript',
          preferredDifficulty: preferences.preferredDifficulty,
          completedLists: preferences.completedLists || [],
          preferredJobTypes: [],
          preferredLocations: [],
          preferredCompanies: [],
          preferredAirlines: []
        }
      });

      this.emitLog('✅ Problem preferences updated', 'success');

      return {
        success: true,
        data: { preferences: updatedPrefs }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const problemsAgent = new ProblemsAgent();
export default problemsAgent;
