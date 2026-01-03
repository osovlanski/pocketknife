/**
 * Jobs Agent
 * 
 * Searches for job listings, matches against user CV using AI,
 * and persists job search history.
 * 
 * This agent wraps the existing job services and provides a unified interface.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getPrisma } from '../services/core/databaseService';

interface JobsParams extends AgentParams {
  action: 'save-job' | 'get-saved' | 'update-preferences';
  jobData?: any;
  preferences?: {
    preferredLocations?: string[];
    preferredJobTypes?: string[];
    preferredCompanies?: string[];
    minSalary?: number;
    maxSalary?: number;
  };
}

interface JobsResult {
  savedJob?: any;
  savedJobs?: any[];
  preferences?: any;
}

export class JobsAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'jobs',
    name: 'Jobs Agent',
    description: 'Search for jobs, match against your CV with AI, and track applications',
    icon: '💼',
    color: '#8B5CF6' // Purple
  };

  protected async run(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { action } = params;

    switch (action) {
      case 'save-job':
        return this.saveJob(params);
      case 'get-saved':
        return this.getSavedJobs(params);
      case 'update-preferences':
        return this.updatePreferences(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Save a job to user's saved jobs
   */
  private async saveJob(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { userId, jobData } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!jobData) {
      return { success: false, error: 'Job data is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog(`💾 Saving job: ${jobData.title}`, 'info');

    try {
      const savedJob = await prisma.savedJob.create({
        data: {
          userId,
          jobId: jobData.id || `job-${Date.now()}`,
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          jobType: jobData.jobType,
          salary: jobData.salary,
          description: jobData.description,
          url: jobData.url,
          source: jobData.source || 'unknown',
          matchScore: jobData.matchScore,
          matchReason: jobData.matchReason,
          companyInfo: jobData.companyInfo,
          status: 'saved'
        }
      });

      this.emitLog('✅ Job saved', 'success');

      return {
        success: true,
        data: { savedJob }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's saved jobs
   */
  private async getSavedJobs(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { userId } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        take: 100
      });

      return {
        success: true,
        data: { savedJobs }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's job search preferences
   */
  private async updatePreferences(params: JobsParams): Promise<AgentResult<JobsResult>> {
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

    this.emitLog('⚙️ Updating job preferences...', 'info');

    try {
      const updatedPrefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          preferredLocations: preferences.preferredLocations,
          preferredJobTypes: preferences.preferredJobTypes,
          preferredCompanies: preferences.preferredCompanies,
          minSalary: preferences.minSalary,
          maxSalary: preferences.maxSalary
        },
        create: {
          userId,
          preferredLocations: preferences.preferredLocations || [],
          preferredJobTypes: preferences.preferredJobTypes || [],
          preferredCompanies: preferences.preferredCompanies || [],
          minSalary: preferences.minSalary,
          maxSalary: preferences.maxSalary,
          preferredLanguage: 'javascript',
          preferredAirlines: [],
          completedLists: []
        }
      });

      this.emitLog('✅ Job preferences updated', 'success');

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
export const jobsAgent = new JobsAgent();
export default jobsAgent;
