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
import mockInterviewService, { InterviewQuestion, InterviewAnswer } from '../services/jobs/mockInterviewService';
import systemDesignEvaluationService, { SystemDesignEvaluation, SystemDesignQuestion } from '../services/jobs/systemDesignEvaluationService';

interface JobsParams extends AgentParams {
  action: 'save-job' | 'get-saved' | 'update-preferences' | 'extract-interview-questions' | 'generate-answer' | 'evaluate-answer' | 'get-example-questions' | 'get-popular-company-questions' | 'evaluate-system-design' | 'get-system-design-questions';
  jobData?: any;
  preferences?: {
    preferredLocations?: string[];
    preferredJobTypes?: string[];
    preferredCompanies?: string[];
    minSalary?: number;
    maxSalary?: number;
  };
  // Mock interview params
  imageBase64?: string;
  imageMimeType?: string;
  question?: string | SystemDesignQuestion;
  userAnswer?: string;
  context?: {
    role?: string;
    experience?: string;
    skills?: string[];
  };
  // Example questions params
  company?: string;
  role?: string;
  category?: 'technical' | 'behavioral' | 'situational' | 'system-design' | 'coding';
  industry?: string;
  experienceLevel?: 'junior' | 'mid' | 'senior';
  count?: number;
  // System design params
  jsonData?: string;
  textAnnotations?: string[];
  elapsedTime?: number;
}

interface JobsResult {
  savedJob?: any;
  savedJobs?: any[];
  preferences?: any;
  // Mock interview results
  questions?: InterviewQuestion[] | SystemDesignQuestion[];
  answer?: InterviewAnswer;
  evaluation?: {
    score: number;
    feedback: string;
    improvements: string[];
    strengths: string[];
  } | SystemDesignEvaluation;
  // Example questions results
  tips?: string[];
  source?: string;
  companies?: { company: string; categories: string[]; sampleQuestions: string[] }[];
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
      case 'extract-interview-questions':
        return this.extractInterviewQuestions(params);
      case 'generate-answer':
        return this.generateInterviewAnswer(params);
      case 'evaluate-answer':
        return this.evaluateInterviewAnswer(params);
      case 'get-example-questions':
        return this.getExampleQuestions(params);
      case 'get-popular-company-questions':
        return this.getPopularCompanyQuestions();
      case 'evaluate-system-design':
        return this.evaluateSystemDesign(params);
      case 'get-system-design-questions':
        return this.getSystemDesignQuestions();
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

  /**
   * Extract interview questions from an uploaded image
   * Supports Hebrew text extraction and translation
   */
  private async extractInterviewQuestions(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { imageBase64, imageMimeType } = params;

    if (!imageBase64) {
      return { success: false, error: 'Image data is required' };
    }

    this.emitLog('📷 Extracting interview questions from image...', 'info');

    try {
      const questions = await mockInterviewService.extractTextFromImage(
        imageBase64,
        imageMimeType || 'image/jpeg'
      );

      if (questions.length === 0) {
        this.emitLog('⚠️ No interview questions found in the image', 'warning');
        return { success: true, data: { questions: [] } };
      }

      this.emitLog(`✅ Extracted ${questions.length} interview questions`, 'success');

      return { success: true, data: { questions } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to extract questions: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate an AI-powered answer for an interview question
   */
  private async generateInterviewAnswer(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { question, context } = params;

    if (!question) {
      return { success: false, error: 'Question is required' };
    }

    this.emitLog('🎯 Generating interview answer...', 'info');

    try {
      // Extract question string if it's a SystemDesignQuestion object
      const questionStr = typeof question === 'string' ? question : question.title;
      const answer = await mockInterviewService.generateAnswer(questionStr, context);

      this.emitLog('✅ Interview answer generated', 'success');

      return { success: true, data: { answer } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to generate answer: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluate a user's interview answer
   */
  private async evaluateInterviewAnswer(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { question, userAnswer, context } = params;

    if (!question || !userAnswer) {
      return { success: false, error: 'Question and user answer are required' };
    }

    this.emitLog('📝 Evaluating your interview answer...', 'info');

    try {
      // Extract question string if it's a SystemDesignQuestion object
      const questionStr = typeof question === 'string' ? question : question.title;
      const evaluation = await mockInterviewService.evaluateAnswer(questionStr, userAnswer, context);

      this.emitLog(`✅ Answer evaluated: ${evaluation.score}/10`, 'success');

      return { success: true, data: { evaluation } };
    } catch (error: any) {
      this.emitLog(`❌ Failed to evaluate answer: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get example interview questions based on company, role, or category
   * Similar to Glassdoor interview questions feature
   */
  private async getExampleQuestions(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { company, role, category, industry, experienceLevel, count } = params;

    this.emitLog('📝 Generating example interview questions...', 'info');

    try {
      const result = await mockInterviewService.getExampleQuestions({
        company,
        role,
        category,
        industry,
        experienceLevel,
        count
      });

      this.emitLog(`✅ Generated ${result.questions.length} example questions`, 'success');

      return { 
        success: true, 
        data: { 
          questions: result.questions,
          tips: result.tips,
          source: result.source
        } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to generate example questions: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get popular company interview questions (pre-defined question banks)
   */
  private async getPopularCompanyQuestions(): Promise<AgentResult<JobsResult>> {
    try {
      const companies = mockInterviewService.getPopularCompanyQuestions();

      return { 
        success: true, 
        data: { companies } 
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to get popular company questions: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluate a system design diagram
   */
  private async evaluateSystemDesign(params: JobsParams): Promise<AgentResult<JobsResult>> {
    const { imageBase64, jsonData, textAnnotations, question, elapsedTime } = params;

    if (!question) {
      return { success: false, error: 'Question is required for evaluation' };
    }

    this.emitLog('🏗️ Evaluating system design...', 'info');

    try {
      const evaluation = await systemDesignEvaluationService.evaluate({
        imageBase64: imageBase64 || '',
        jsonData: jsonData || '{}',
        textAnnotations: textAnnotations || [],
        question: question as SystemDesignQuestion,
        elapsedTime
      });

      this.emitLog(`✅ System design evaluated: Score ${evaluation.score}/100`, 'success');

      return {
        success: true,
        data: { evaluation }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to evaluate system design: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get example system design questions
   */
  private async getSystemDesignQuestions(): Promise<AgentResult<JobsResult>> {
    try {
      const questions = systemDesignEvaluationService.getExampleQuestions();

      return {
        success: true,
        data: { questions }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to get system design questions: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const jobsAgent = new JobsAgent();
export default jobsAgent;
