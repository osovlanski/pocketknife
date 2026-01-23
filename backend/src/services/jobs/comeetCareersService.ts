/**
 * Comeet Careers API Service
 * 
 * Fetches job listings from companies using Comeet as their ATS (Applicant Tracking System).
 * Many Israeli startups use Comeet for hiring, making this a valuable source.
 * 
 * The "cheat" search `site:www.comeet.com {query}` works because Comeet hosts public job listings.
 * This service directly queries the Comeet API for better results.
 * 
 * API Documentation: https://developers.comeet.com/reference
 * 
 * NOTE: Companies are now stored in the database (ExternalCompany table).
 * The hardcoded fallback list is kept for initial migration and offline mode.
 * Use externalCompanyService for CRUD operations on companies.
 */

import axios from 'axios';
import { configService } from '../core/configService';
import { externalCompanyService } from './externalCompanyService';
import { getPrisma } from '../core/databaseService';

// Type alias for company size from database
type DbCompanySize = 'STARTUP' | 'MIDSIZE' | 'ENTERPRISE' | null;

interface JobListing {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  applyUrl: string;
  salary?: string;
  postedAt: string;
  tags?: string[];
  companySize?: 'startup' | 'midsize' | 'enterprise';
  employeeCountMin?: number;
  employeeCountMax?: number;
  industry?: string[];
  experienceLevel?: 'junior' | 'mid' | 'senior';
  jobType?: 'fulltime' | 'contract' | 'freelance' | 'internship';
}

interface ComeetPosition {
  uid: string;
  name: string;
  department: string;
  location: {
    name: string;
    country?: string;
    city?: string;
  };
  employment_type: string;
  experience_level: string;
  time_updated: string;
  details: {
    description: string;
    requirements?: string;
    nice_to_have?: string;
  };
  url_active_page: string;
}

interface ComeetCompany {
  name: string;
  uid: string;
  token: string;
  industry?: string;
  size?: 'startup' | 'midsize' | 'enterprise';
  employeeCountMin?: number;
  employeeCountMax?: number;
}

class ComeetCareersService {
  private readonly baseUrl = 'https://www.comeet.com/careers-api/2.0';
  private readonly userAgent = 'PocketknifeJobAgent/1.0';
  
  /**
   * List of Israeli tech companies using Comeet ATS
   * These can be discovered via `site:www.comeet.com/jobs Israel` searches
   * The UID and token are public and visible in the company's careers page URL
   * 
   * EXPANDED: Includes more early-stage startups and smaller companies
   */
  private getComeetCompanies(): ComeetCompany[] {
    // These are discoverable from public Comeet careers pages
    // Format: https://www.comeet.com/jobs/{uid}/{token}
    // Employee counts based on LinkedIn/Crunchbase data as of 2025
    return [
      // =========================================================================
      // EARLY-STAGE STARTUPS (1-50 employees)
      // =========================================================================
      { name: 'Piiano', uid: 'piiano', token: 'Piiano.007', industry: 'privacy', size: 'startup', employeeCountMin: 20, employeeCountMax: 50 },
      { name: 'Spott.ai', uid: 'spott', token: 'Spott.004', industry: 'ai', size: 'startup', employeeCountMin: 10, employeeCountMax: 30 },
      { name: 'Enso Security', uid: 'enso', token: 'Enso.007', industry: 'cybersecurity', size: 'startup', employeeCountMin: 30, employeeCountMax: 50 },
      { name: 'Descope', uid: 'descope', token: 'Descope', industry: 'identity', size: 'startup', employeeCountMin: 20, employeeCountMax: 50 },
      { name: 'Opus Security', uid: 'opus-security', token: 'Opus', industry: 'cybersecurity', size: 'startup', employeeCountMin: 20, employeeCountMax: 50 },
      { name: 'Seemplicity', uid: 'seemplicity', token: 'Seemplicity', industry: 'cybersecurity', size: 'startup', employeeCountMin: 25, employeeCountMax: 50 },
      { name: 'Wing Security', uid: 'wing-security', token: 'Wing', industry: 'cybersecurity', size: 'startup', employeeCountMin: 30, employeeCountMax: 50 },
      { name: 'Astrix Security', uid: 'astrix', token: 'Astrix', industry: 'cybersecurity', size: 'startup', employeeCountMin: 20, employeeCountMax: 50 },
      { name: 'Groundcover', uid: 'groundcover', token: 'Groundcover', industry: 'observability', size: 'startup', employeeCountMin: 30, employeeCountMax: 50 },
      { name: 'Noogata', uid: 'noogata', token: 'Noogata', industry: 'ai', size: 'startup', employeeCountMin: 30, employeeCountMax: 50 },
      { name: 'Polar Security', uid: 'polar-security', token: 'Polar', industry: 'cybersecurity', size: 'startup', employeeCountMin: 20, employeeCountMax: 50 },
      { name: 'Entrio', uid: 'entrio', token: 'Entrio', industry: 'devops', size: 'startup', employeeCountMin: 15, employeeCountMax: 40 },
      
      // =========================================================================
      // MID-SIZE STARTUPS (51-200 employees) - Series A/B
      // =========================================================================
      { name: 'Lightrun', uid: 'lightrun', token: 'Lightrun.006', industry: 'devtools', size: 'midsize', employeeCountMin: 60, employeeCountMax: 100 },
      { name: 'Cyera', uid: 'cyera', token: 'Cyera', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Torq', uid: 'torq', token: 'Torq.007', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Vim', uid: 'vim-health', token: 'Vim', industry: 'healthtech', size: 'midsize', employeeCountMin: 60, employeeCountMax: 120 },
      { name: 'Anodot', uid: 'anodot', token: 'Anodot.007', industry: 'ai', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Ermetic', uid: 'ermetic', token: 'Ermetic.003', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Talon Cyber Security', uid: 'talon', token: 'Talon-Cyber-Security', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Vdoo', uid: 'vdoo', token: 'VDOO', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Run:AI', uid: 'run-ai', token: 'Run-ai', industry: 'ai', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Dazz', uid: 'dazz', token: 'Dazz.007', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 60, employeeCountMax: 120 },
      { name: 'Pentera', uid: 'pentera', token: 'Pentera', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'Buildots', uid: 'buildots', token: 'Buildots', industry: 'construction', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Aidoc', uid: 'aidoc', token: 'Aidoc', industry: 'healthtech', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Fabric', uid: 'fabric-ai', token: 'fabric', industry: 'ecommerce', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Pecan AI', uid: 'pecan', token: 'Pecan', industry: 'ai', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Apiiro', uid: 'apiiro', token: 'Apiiro', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'Authomize', uid: 'authomize', token: 'Authomize', industry: 'identity', size: 'midsize', employeeCountMin: 50, employeeCountMax: 100 },
      { name: 'Spectral', uid: 'spectral', token: 'Spectral.007', industry: 'devtools', size: 'midsize', employeeCountMin: 50, employeeCountMax: 100 },
      { name: 'Noname Security', uid: 'noname', token: 'Noname', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'Pliops', uid: 'pliops', token: 'Pliops', industry: 'hardware', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'AI21 Labs', uid: 'ai21', token: 'AI21', industry: 'ai', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'D-ID', uid: 'd-id', token: 'D-ID', industry: 'ai', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Hailo', uid: 'hailo', token: 'Hailo', industry: 'ai', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'Dataloop', uid: 'dataloop', token: 'Dataloop', industry: 'ai', size: 'midsize', employeeCountMin: 80, employeeCountMax: 150 },
      { name: 'Komodor', uid: 'komodor', token: 'Komodor', industry: 'devops', size: 'midsize', employeeCountMin: 50, employeeCountMax: 80 },
      { name: 'Rezilion', uid: 'rezilion', token: 'Rezilion', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 60, employeeCountMax: 120 },
      { name: 'Silverfort', uid: 'silverfort', token: 'Silverfort', industry: 'identity', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      
      // =========================================================================
      // MID-SIZE TO GROWTH STAGE (200-500 employees) - Series C/D
      // =========================================================================
      { name: 'Bizzabo', uid: 'bizzabo', token: 'Bizzabo', industry: 'saas', size: 'midsize', employeeCountMin: 200, employeeCountMax: 400 },
      { name: 'Upstream Security', uid: 'upstream', token: 'Upstream.007', industry: 'automotive', size: 'midsize', employeeCountMin: 100, employeeCountMax: 200 },
      { name: 'K Health', uid: 'khealth', token: 'K-Health', industry: 'healthtech', size: 'midsize', employeeCountMin: 300, employeeCountMax: 500 },
      { name: 'BlueVine', uid: 'bluevine', token: 'BlueVine', industry: 'fintech', size: 'midsize', employeeCountMin: 300, employeeCountMax: 500 },
      { name: 'Orca Security', uid: 'orca-security', token: 'Orca.003', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 300, employeeCountMax: 500 },
      { name: 'Salt Security', uid: 'salt', token: 'Salt', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 200, employeeCountMax: 400 },
      { name: 'Coralogix', uid: 'coralogix', token: 'Coralogix.007', industry: 'observability', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'Cheq', uid: 'cheq-ai', token: 'CHEQ.007', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 200, employeeCountMax: 400 },
      { name: 'Vulcan Cyber', uid: 'vulcan-cyber', token: 'Vulcan.007', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 150, employeeCountMax: 300 },
      { name: 'Verbit', uid: 'verbit', token: 'Verbit', industry: 'ai', size: 'midsize', employeeCountMin: 300, employeeCountMax: 500 },
      { name: 'Yotpo', uid: 'yotpo', token: 'Yotpo', industry: 'ecommerce', size: 'midsize', employeeCountMin: 400, employeeCountMax: 600 },
      { name: 'Honeybook', uid: 'honeybook', token: 'HoneyBook', industry: 'saas', size: 'midsize', employeeCountMin: 300, employeeCountMax: 500 },
      { name: 'Lemonade', uid: 'lemonade', token: 'Lemonade', industry: 'insurtech', size: 'midsize', employeeCountMin: 400, employeeCountMax: 600 },
      { name: 'Cognyte', uid: 'cognyte', token: 'Cognyte', industry: 'cybersecurity', size: 'midsize', employeeCountMin: 400, employeeCountMax: 600 },
      
      // =========================================================================
      // ENTERPRISE COMPANIES (500+ employees)
      // =========================================================================
      { name: 'Cybereason', uid: 'cybereason', token: 'F1.001', industry: 'cybersecurity', size: 'enterprise', employeeCountMin: 600, employeeCountMax: 1000 },
      { name: 'Snyk', uid: 'snyk', token: 'Snyk', industry: 'cybersecurity', size: 'enterprise', employeeCountMin: 800, employeeCountMax: 1200 },
      { name: 'Cato Networks', uid: 'cato-networks', token: 'Cato-Networks', industry: 'cybersecurity', size: 'enterprise', employeeCountMin: 600, employeeCountMax: 1000 },
      { name: 'Next Insurance', uid: 'next-insurance', token: 'Next-Insurance', industry: 'insurtech', size: 'enterprise', employeeCountMin: 800, employeeCountMax: 1200 },
      { name: 'SentinelOne', uid: 'sentinelone', token: 'SentinelOne', industry: 'cybersecurity', size: 'enterprise', employeeCountMin: 1500, employeeCountMax: 2500 },
    ];
  }

  /**
   * Fetch job positions from a specific Comeet company
   */
  async fetchCompanyPositions(company: ComeetCompany): Promise<JobListing[]> {
    try {
      const timeout = configService.get('job.comeet.timeoutMs', 10000);
      
      // Comeet public careers API endpoint
      const url = `${this.baseUrl}/company/${company.uid}/positions`;
      
      const response = await axios.get(url, {
        params: {
          token: company.token,
          details: true  // Include full job details
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404 || response.status === 403) {
        // Company may have changed their Comeet config
        return [];
      }

      // Handle different response formats - Comeet API may return array or object with positions
      let positions: ComeetPosition[] = [];
      
      if (Array.isArray(response.data)) {
        positions = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Try common response structures
        if (Array.isArray(response.data.positions)) {
          positions = response.data.positions;
        } else if (Array.isArray(response.data.jobs)) {
          positions = response.data.jobs;
        } else if (Array.isArray(response.data.data)) {
          positions = response.data.data;
        } else {
          // Try to find any array property
          const possibleArrays = Object.values(response.data).filter(v => Array.isArray(v));
          if (possibleArrays.length > 0) {
            positions = possibleArrays[0] as ComeetPosition[];
          }
        }
      }
      
      if (!Array.isArray(positions)) {
        console.debug(`⚠️ Comeet: ${company.name} - unexpected response format`);
        return [];
      }
      
      return positions.map((pos) => this.mapToJobListing(pos, company));
    } catch (error: any) {
      // Silently fail for individual companies - don't spam logs
      if (error.code !== 'ECONNABORTED') {
        console.debug(`⚠️ Comeet: ${company.name} - ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Map Comeet position to standard JobListing format
   */
  private mapToJobListing(position: ComeetPosition, company: ComeetCompany): JobListing {
    const location = position.location?.name || 'Israel';
    const isRemote = location.toLowerCase().includes('remote') || 
                     location.toLowerCase().includes('anywhere') ||
                     location.toLowerCase().includes('flexible');

    const experienceLevel = this.detectExperienceLevel(position.experience_level, position.name);
    const jobType = this.detectJobType(position.employment_type);

    // Build description from details
    const descriptionParts = [
      position.details?.description || '',
      position.details?.requirements ? `\n\nRequirements:\n${position.details.requirements}` : '',
      position.details?.nice_to_have ? `\n\nNice to Have:\n${position.details.nice_to_have}` : ''
    ].filter(Boolean);

    return {
      id: `comeet-${company.uid}-${position.uid}`,
      source: 'Comeet',
      title: position.name,
      company: company.name,
      location: location,
      remote: isRemote,
      description: this.stripHtml(descriptionParts.join('')),
      applyUrl: position.url_active_page || `https://www.comeet.com/jobs/${company.uid}/${company.token}/${position.uid}`,
      postedAt: position.time_updated || new Date().toISOString(),
      tags: [position.department, company.industry].filter(Boolean) as string[],
      companySize: company.size,
      employeeCountMin: company.employeeCountMin,
      employeeCountMax: company.employeeCountMax,
      industry: company.industry ? [company.industry] : undefined,
      experienceLevel,
      jobType
    };
  }

  /**
   * Detect experience level from Comeet data
   */
  private detectExperienceLevel(level?: string, title?: string): 'junior' | 'mid' | 'senior' | undefined {
    const text = `${level || ''} ${title || ''}`.toLowerCase();
    
    if (text.match(/\b(senior|sr\.|lead|principal|staff|architect|director|vp|head)\b/)) {
      return 'senior';
    }
    if (text.match(/\b(junior|jr\.|entry|graduate|intern|associate)\b/)) {
      return 'junior';
    }
    if (text.match(/\b(mid|intermediate)\b/) || level?.toLowerCase() === 'experienced') {
      return 'mid';
    }
    
    return undefined;
  }

  /**
   * Detect job type from employment type
   */
  private detectJobType(employmentType?: string): 'fulltime' | 'contract' | 'freelance' | 'internship' | undefined {
    if (!employmentType) return 'fulltime';
    
    const type = employmentType.toLowerCase();
    if (type.includes('intern')) return 'internship';
    if (type.includes('contract') || type.includes('temp')) return 'contract';
    if (type.includes('freelance') || type.includes('consultant')) return 'freelance';
    if (type.includes('full') || type.includes('permanent')) return 'fulltime';
    
    return 'fulltime';
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Search all Comeet companies for matching jobs
   * Uses database companies first, falls back to hardcoded list
   */
  async searchAllCompanies(query: string): Promise<JobListing[]> {
    console.log('🔍 Fetching jobs from Comeet ATS companies...');
    
    // Try to get companies from database first
    let companies = await this.getCompaniesFromDatabase();
    
    // Fallback to hardcoded list if database is empty
    if (companies.length === 0) {
      console.log('ℹ️ No companies in database, using fallback list');
      companies = this.getComeetCompanies();
    }
    
    const maxConcurrent = configService.get('job.comeet.maxConcurrentRequests', 5);
    const allJobs: JobListing[] = [];
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < companies.length; i += maxConcurrent) {
      const batch = companies.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(company => this.fetchCompanyPositions(company))
      );
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        }
      });
    }

    // Filter by query
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);
    
    const filtered = allJobs.filter(job => {
      const text = `${job.title} ${job.description} ${job.company} ${job.tags?.join(' ')}`.toLowerCase();
      
      // Match if any significant keyword matches
      return keywords.some(keyword => text.includes(keyword));
    });

    console.log(`✅ Found ${filtered.length} jobs from ${companies.length} Comeet companies`);
    return filtered;
  }

  /**
   * Get companies from database (ExternalCompany table)
   */
  private async getCompaniesFromDatabase(): Promise<ComeetCompany[]> {
    try {
      const prisma = getPrisma();
      if (!prisma) return [];
      
      const dbCompanies = await (prisma as any).externalCompany.findMany({
        where: {
          atsProvider: 'COMEET',
          status: 'ACTIVE'
        }
      });
      
      return dbCompanies.map((c: any) => ({
        name: c.name,
        uid: c.atsCompanyId,
        token: c.atsToken || '',
        industry: c.industry || undefined,
        size: this.mapDbSizeToLocal(c.size as DbCompanySize),
        employeeCountMin: c.employeeCountMin || undefined,
        employeeCountMax: c.employeeCountMax || undefined
      }));
    } catch (error) {
      console.warn('⚠️ Could not fetch companies from database:', error);
      return [];
    }
  }

  /**
   * Map database size enum to local type
   */
  private mapDbSizeToLocal(size: DbCompanySize): 'startup' | 'midsize' | 'enterprise' | undefined {
    if (!size) return undefined;
    const mapping: Record<NonNullable<DbCompanySize>, 'startup' | 'midsize' | 'enterprise'> = {
      'STARTUP': 'startup',
      'MIDSIZE': 'midsize',
      'ENTERPRISE': 'enterprise'
    };
    return mapping[size];
  }

  /**
   * Migrate hardcoded companies to database
   * Call this once to populate the database
   */
  async migrateToDatabase(): Promise<number> {
    const hardcodedCompanies = this.getComeetCompanies();
    return externalCompanyService.migrateHardcodedCompanies(hardcodedCompanies);
  }

  /**
   * Filter companies by industry
   */
  filterByIndustry(industry: string): ComeetCompany[] {
    return this.getComeetCompanies().filter(c => 
      c.industry?.toLowerCase() === industry.toLowerCase()
    );
  }

  /**
   * Get list of available companies with full metadata for filtering
   */
  getAvailableCompanies(): { 
    name: string; 
    industry?: string; 
    size?: 'startup' | 'midsize' | 'enterprise';
    employeeCountMin?: number;
    employeeCountMax?: number;
    companyScore?: number;
    heatScore?: number;
    growthScore?: number;
    founded?: string;
  }[] {
    return this.getComeetCompanies().map(c => ({
      name: c.name,
      industry: c.industry,
      size: c.size,
      employeeCountMin: c.employeeCountMin,
      employeeCountMax: c.employeeCountMax
    }));
  }
}

export default new ComeetCareersService();

