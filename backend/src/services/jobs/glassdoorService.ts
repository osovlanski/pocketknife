/**
 * Glassdoor Company Data Service
 * 
 * Provides company reviews, salaries, and interview information via RapidAPI.
 * 
 * RapidAPI: https://rapidapi.com/letscrape-6bRBa3QguO5/api/glassdoor-data
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CompanyInfo {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  founded?: number;
  type?: string;
  revenue?: string;
  description?: string;
  logo?: string;
  glassdoorUrl: string;
}

export interface CompanyRating {
  overall: number;
  cultureAndValues: number;
  diversityAndInclusion: number;
  workLifeBalance: number;
  seniorManagement: number;
  compensationAndBenefits: number;
  careerOpportunities: number;
  ceoApproval: number;
  recommendToFriend: number;
  totalReviews: number;
}

export interface CompanyReview {
  id: string;
  title: string;
  pros: string;
  cons: string;
  rating: number;
  date: Date;
  jobTitle?: string;
  isCurrentEmployee: boolean;
  location?: string;
  advice?: string;
}

export interface SalaryInfo {
  jobTitle: string;
  basePay: {
    min: number;
    max: number;
    median: number;
  };
  totalPay?: {
    min: number;
    max: number;
    median: number;
  };
  currency: string;
  payPeriod: string;
  sampleSize: number;
}

export interface InterviewInfo {
  id: string;
  jobTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  experience: 'Positive' | 'Neutral' | 'Negative';
  outcome?: 'Accepted' | 'Declined' | 'No Offer';
  date: Date;
  questions: string[];
  process?: string;
  tips?: string;
}

// =============================================================================
// GLASSDOOR SERVICE
// =============================================================================

class GlassdoorService {
  private client: AxiosInstance | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (rapidApiKey) {
      this.client = axios.create({
        baseURL: 'https://glassdoor.p.rapidapi.com',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'glassdoor.p.rapidapi.com'
        },
        timeout: configService.get('jobs.glassdoor.timeoutMs', 10000)
      });
      logger.init('Glassdoor RapidAPI client initialized');
    }
  }

  /**
   * Check if Glassdoor is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Search for companies
   */
  async searchCompanies(query: string, limit: number = 10): Promise<CompanyInfo[]> {
    if (!this.client) {
      logger.warn('Glassdoor not available - RAPIDAPI_KEY not configured');
      return [];
    }

    const cacheKey = `glassdoor:companies:${query}`;
    const cached = await cacheService.get<CompanyInfo[]>(cacheKey);
    if (cached) {
      logger.cache('Glassdoor company search cache hit');
      return cached;
    }

    try {
      const response = await this.client.get('/search', {
        params: { query, limit }
      });

      const companies: CompanyInfo[] = (response.data?.data || []).map((item: any) => ({
        id: item.id || item.employer_id,
        name: item.name || item.employer_name,
        website: item.website,
        industry: item.industry,
        size: item.size || item.employer_size,
        headquarters: item.headquarters,
        founded: item.founded,
        type: item.type,
        revenue: item.revenue,
        description: item.description,
        logo: item.logo || item.square_logo,
        glassdoorUrl: item.glassdoor_url || `https://www.glassdoor.com/Overview/${item.name}-EI_IE${item.id}.htm`
      }));

      await cacheService.set(cacheKey, companies, { ttl: 86400 }); // 24 hours
      return companies;
    } catch (error: any) {
      logger.fail('Glassdoor company search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get company ratings
   */
  async getCompanyRatings(companyId: string): Promise<CompanyRating | null> {
    if (!this.client) return null;

    const cacheKey = `glassdoor:ratings:${companyId}`;
    const cached = await cacheService.get<CompanyRating>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/company/ratings', {
        params: { employer_id: companyId }
      });

      const data = response.data?.data;
      if (!data) return null;

      const rating: CompanyRating = {
        overall: data.overall_rating || data.rating,
        cultureAndValues: data.culture_rating || data.culture_and_values,
        diversityAndInclusion: data.diversity_rating || data.diversity_and_inclusion,
        workLifeBalance: data.work_life_balance_rating || data.work_life_balance,
        seniorManagement: data.senior_management_rating || data.senior_management,
        compensationAndBenefits: data.compensation_rating || data.compensation_and_benefits,
        careerOpportunities: data.career_opportunities_rating || data.career_opportunities,
        ceoApproval: data.ceo_approval || 0,
        recommendToFriend: data.recommend_to_friend || 0,
        totalReviews: data.total_reviews || data.review_count || 0
      };

      await cacheService.set(cacheKey, rating, { ttl: 86400 });
      return rating;
    } catch (error: any) {
      logger.fail('Failed to get company ratings', { companyId, error: error.message });
      return null;
    }
  }

  /**
   * Get company reviews
   */
  async getCompanyReviews(companyId: string, limit: number = 10): Promise<CompanyReview[]> {
    if (!this.client) return [];

    const cacheKey = `glassdoor:reviews:${companyId}`;
    const cached = await cacheService.get<CompanyReview[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/company/reviews', {
        params: { employer_id: companyId, limit }
      });

      const reviews: CompanyReview[] = (response.data?.data || []).map((item: any) => ({
        id: item.id,
        title: item.summary || item.headline,
        pros: item.pros,
        cons: item.cons,
        rating: item.rating || item.overall_rating,
        date: new Date(item.date || item.review_date),
        jobTitle: item.job_title,
        isCurrentEmployee: item.is_current_employee || item.current_job,
        location: item.location,
        advice: item.advice || item.management_advice
      }));

      await cacheService.set(cacheKey, reviews, { ttl: 43200 }); // 12 hours
      return reviews;
    } catch (error: any) {
      logger.fail('Failed to get company reviews', { companyId, error: error.message });
      return [];
    }
  }

  /**
   * Get salary data for a company
   */
  async getCompanySalaries(companyId: string, jobTitle?: string): Promise<SalaryInfo[]> {
    if (!this.client) return [];

    const cacheKey = `glassdoor:salaries:${companyId}:${jobTitle || 'all'}`;
    const cached = await cacheService.get<SalaryInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/company/salaries', {
        params: { 
          employer_id: companyId,
          ...(jobTitle && { job_title: jobTitle })
        }
      });

      const salaries: SalaryInfo[] = (response.data?.data || []).map((item: any) => ({
        jobTitle: item.job_title,
        basePay: {
          min: item.base_pay?.min || item.pay_low,
          max: item.base_pay?.max || item.pay_high,
          median: item.base_pay?.median || item.pay_median
        },
        totalPay: item.total_pay ? {
          min: item.total_pay.min,
          max: item.total_pay.max,
          median: item.total_pay.median
        } : undefined,
        currency: item.currency || 'USD',
        payPeriod: item.pay_period || 'yearly',
        sampleSize: item.sample_size || item.count || 0
      }));

      await cacheService.set(cacheKey, salaries, { ttl: 86400 });
      return salaries;
    } catch (error: any) {
      logger.fail('Failed to get salaries', { companyId, error: error.message });
      return [];
    }
  }

  /**
   * Get interview experiences for a company
   */
  async getInterviewExperiences(companyId: string, jobTitle?: string): Promise<InterviewInfo[]> {
    if (!this.client) return [];

    const cacheKey = `glassdoor:interviews:${companyId}:${jobTitle || 'all'}`;
    const cached = await cacheService.get<InterviewInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/company/interviews', {
        params: { 
          employer_id: companyId,
          ...(jobTitle && { job_title: jobTitle })
        }
      });

      const interviews: InterviewInfo[] = (response.data?.data || []).map((item: any) => ({
        id: item.id,
        jobTitle: item.job_title,
        difficulty: this.mapDifficulty(item.difficulty),
        experience: this.mapExperience(item.experience),
        outcome: this.mapOutcome(item.outcome),
        date: new Date(item.date || item.interview_date),
        questions: item.questions || [],
        process: item.process || item.description,
        tips: item.tips
      }));

      await cacheService.set(cacheKey, interviews, { ttl: 43200 });
      return interviews;
    } catch (error: any) {
      logger.fail('Failed to get interviews', { companyId, error: error.message });
      return [];
    }
  }

  /**
   * Get company summary with all data
   */
  async getCompanySummary(companyIdOrName: string): Promise<{
    company: CompanyInfo | null;
    ratings: CompanyRating | null;
    topReviews: CompanyReview[];
    topSalaries: SalaryInfo[];
  }> {
    // Search for company first if name provided
    let companyId = companyIdOrName;
    let company: CompanyInfo | null = null;

    if (isNaN(parseInt(companyIdOrName))) {
      const companies = await this.searchCompanies(companyIdOrName, 1);
      if (companies.length > 0) {
        company = companies[0];
        companyId = company.id;
      }
    }

    if (!companyId) {
      return { company: null, ratings: null, topReviews: [], topSalaries: [] };
    }

    // Fetch all data in parallel
    const [ratings, reviews, salaries] = await Promise.all([
      this.getCompanyRatings(companyId),
      this.getCompanyReviews(companyId, 5),
      this.getCompanySalaries(companyId)
    ]);

    return {
      company,
      ratings,
      topReviews: reviews,
      topSalaries: salaries.slice(0, 5)
    };
  }

  /**
   * Map difficulty value
   */
  private mapDifficulty(value: any): 'Easy' | 'Medium' | 'Hard' {
    if (typeof value === 'number') {
      if (value <= 2) return 'Easy';
      if (value <= 3.5) return 'Medium';
      return 'Hard';
    }
    const str = String(value).toLowerCase();
    if (str.includes('easy')) return 'Easy';
    if (str.includes('hard') || str.includes('difficult')) return 'Hard';
    return 'Medium';
  }

  /**
   * Map experience value
   */
  private mapExperience(value: any): 'Positive' | 'Neutral' | 'Negative' {
    const str = String(value).toLowerCase();
    if (str.includes('positive') || str.includes('good')) return 'Positive';
    if (str.includes('negative') || str.includes('bad')) return 'Negative';
    return 'Neutral';
  }

  /**
   * Map outcome value
   */
  private mapOutcome(value: any): 'Accepted' | 'Declined' | 'No Offer' | undefined {
    if (!value) return undefined;
    const str = String(value).toLowerCase();
    if (str.includes('accept')) return 'Accepted';
    if (str.includes('decline') || str.includes('rejected')) return 'Declined';
    if (str.includes('no offer')) return 'No Offer';
    return undefined;
  }
}

// Export singleton
export const glassdoorService = new GlassdoorService();
export default glassdoorService;



