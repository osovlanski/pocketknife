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
import { getPrisma } from '../services/core/databaseService';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface ProblemsParams extends AgentParams {
  action: 'save-solution' | 'get-solved' | 'update-preferences';
  difficulty?: string;
  source?: string;
  problemData?: any;
  code?: string;
  language?: string;
  preferences?: {
    preferredLanguage?: string;
    preferredDifficulty?: string;
    completedLists?: string[];
  };
}

interface ProblemsResult {
  savedProblem?: any;
  solvedProblems?: any[];
  preferences?: any;
}

export class ProblemsAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'problems',
    name: 'Problems Agent',
    description: 'Practice coding problems from LeetCode, Codeforces, and curated interview lists',
    icon: '💻',
    color: '#F59E0B' // Amber
  };

  protected async run(params: ProblemsParams): Promise<AgentResult<ProblemsResult>> {
    const { action } = params;

    switch (action) {
      case 'save-solution':
        return this.saveSolution(params);
      case 'get-solved':
        return this.getSolvedProblems(params);
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
