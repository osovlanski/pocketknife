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
 */

import axios from 'axios';
import { configService } from '../core/configService';

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
    return [
      // =========================================================================
      // EARLY-STAGE STARTUPS (Seed, Series A/B) - Priority for startup job seekers
      // =========================================================================
      { name: 'Lightrun', uid: 'lightrun', token: 'Lightrun.006', industry: 'devtools', size: 'startup' },
      { name: 'Cyera', uid: 'cyera', token: 'Cyera', industry: 'cybersecurity', size: 'startup' },
      { name: 'Torq', uid: 'torq', token: 'Torq.007', industry: 'cybersecurity', size: 'startup' },
      { name: 'Vim', uid: 'vim-health', token: 'Vim', industry: 'healthtech', size: 'startup' },
      { name: 'Anodot', uid: 'anodot', token: 'Anodot.007', industry: 'ai', size: 'startup' },
      { name: 'Ermetic', uid: 'ermetic', token: 'Ermetic.003', industry: 'cybersecurity', size: 'startup' },
      { name: 'Talon Cyber Security', uid: 'talon', token: 'Talon-Cyber-Security', industry: 'cybersecurity', size: 'startup' },
      { name: 'Enso Security', uid: 'enso', token: 'Enso.007', industry: 'cybersecurity', size: 'startup' },
      { name: 'Piiano', uid: 'piiano', token: 'Piiano.007', industry: 'privacy', size: 'startup' },
      { name: 'Spott.ai', uid: 'spott', token: 'Spott.004', industry: 'ai', size: 'startup' },
      { name: 'Vdoo', uid: 'vdoo', token: 'VDOO', industry: 'cybersecurity', size: 'startup' },
      { name: 'Run:AI', uid: 'run-ai', token: 'Run-ai', industry: 'ai', size: 'startup' },
      { name: 'Dazz', uid: 'dazz', token: 'Dazz.007', industry: 'cybersecurity', size: 'startup' },
      { name: 'Descope', uid: 'descope', token: 'Descope', industry: 'identity', size: 'startup' },
      { name: 'Opus Security', uid: 'opus-security', token: 'Opus', industry: 'cybersecurity', size: 'startup' },
      { name: 'Palo Alto', uid: 'pentera', token: 'Pentera', industry: 'cybersecurity', size: 'startup' },
      { name: 'Seemplicity', uid: 'seemplicity', token: 'Seemplicity', industry: 'cybersecurity', size: 'startup' },
      { name: 'Wing Security', uid: 'wing-security', token: 'Wing', industry: 'cybersecurity', size: 'startup' },
      { name: 'Astrix Security', uid: 'astrix', token: 'Astrix', industry: 'cybersecurity', size: 'startup' },
      { name: 'Buildots', uid: 'buildots', token: 'Buildots', industry: 'construction', size: 'startup' },
      { name: 'Aidoc', uid: 'aidoc', token: 'Aidoc', industry: 'healthtech', size: 'startup' },
      { name: 'Fabric', uid: 'fabric-ai', token: 'fabric', industry: 'ecommerce', size: 'startup' },
      { name: 'Pecan AI', uid: 'pecan', token: 'Pecan', industry: 'ai', size: 'startup' },
      { name: 'Cognyte', uid: 'cognyte', token: 'Cognyte', industry: 'cybersecurity', size: 'startup' },
      { name: 'Noogata', uid: 'noogata', token: 'Noogata', industry: 'ai', size: 'startup' },
      { name: 'Apiiro', uid: 'apiiro', token: 'Apiiro', industry: 'cybersecurity', size: 'startup' },
      { name: 'Authomize', uid: 'authomize', token: 'Authomize', industry: 'identity', size: 'startup' },
      { name: 'Spectral', uid: 'spectral', token: 'Spectral.007', industry: 'devtools', size: 'startup' },
      { name: 'Noname Security', uid: 'noname', token: 'Noname', industry: 'cybersecurity', size: 'startup' },
      { name: 'Polar Security', uid: 'polar-security', token: 'Polar', industry: 'cybersecurity', size: 'startup' },
      { name: 'Pliops', uid: 'pliops', token: 'Pliops', industry: 'hardware', size: 'startup' },
      { name: 'AI21 Labs', uid: 'ai21', token: 'AI21', industry: 'ai', size: 'startup' },
      { name: 'D-ID', uid: 'd-id', token: 'D-ID', industry: 'ai', size: 'startup' },
      { name: 'Hailo', uid: 'hailo', token: 'Hailo', industry: 'ai', size: 'startup' },
      { name: 'Dataloop', uid: 'dataloop', token: 'Dataloop', industry: 'ai', size: 'startup' },
      { name: 'Entrio', uid: 'entrio', token: 'Entrio', industry: 'devops', size: 'startup' },
      { name: 'Komodor', uid: 'komodor', token: 'Komodor', industry: 'devops', size: 'startup' },
      { name: 'Groundcover', uid: 'groundcover', token: 'Groundcover', industry: 'observability', size: 'startup' },
      { name: 'Rezilion', uid: 'rezilion', token: 'Rezilion', industry: 'cybersecurity', size: 'startup' },
      { name: 'Silverfort', uid: 'silverfort', token: 'Silverfort', industry: 'identity', size: 'startup' },
      
      // =========================================================================
      // MID-STAGE COMPANIES (Series C/D)
      // =========================================================================
      { name: 'Bizzabo', uid: 'bizzabo', token: 'Bizzabo', industry: 'saas', size: 'midsize' },
      { name: 'Upstream Security', uid: 'upstream', token: 'Upstream.007', industry: 'automotive', size: 'midsize' },
      { name: 'K Health', uid: 'khealth', token: 'K-Health', industry: 'healthtech', size: 'midsize' },
      { name: 'BlueVine', uid: 'bluevine', token: 'BlueVine', industry: 'fintech', size: 'midsize' },
      { name: 'Orca Security', uid: 'orca-security', token: 'Orca.003', industry: 'cybersecurity', size: 'midsize' },
      { name: 'Salt Security', uid: 'salt', token: 'Salt', industry: 'cybersecurity', size: 'midsize' },
      { name: 'Coralogix', uid: 'coralogix', token: 'Coralogix.007', industry: 'observability', size: 'midsize' },
      { name: 'Cheq', uid: 'cheq-ai', token: 'CHEQ.007', industry: 'cybersecurity', size: 'midsize' },
      { name: 'Vulcan Cyber', uid: 'vulcan-cyber', token: 'Vulcan.007', industry: 'cybersecurity', size: 'midsize' },
      { name: 'Verbit', uid: 'verbit', token: 'Verbit', industry: 'ai', size: 'midsize' },
      { name: 'Yotpo', uid: 'yotpo', token: 'Yotpo', industry: 'ecommerce', size: 'midsize' },
      { name: 'Honeybook', uid: 'honeybook', token: 'HoneyBook', industry: 'saas', size: 'midsize' },
      { name: 'Lemonade', uid: 'lemonade', token: 'Lemonade', industry: 'insurtech', size: 'midsize' },
      
      // =========================================================================
      // LARGER COMPANIES (for comprehensive coverage)
      // =========================================================================
      { name: 'Cybereason', uid: 'cybereason', token: 'F1.001', industry: 'cybersecurity', size: 'enterprise' },
      { name: 'Snyk', uid: 'snyk', token: 'Snyk', industry: 'cybersecurity', size: 'enterprise' },
      { name: 'Cato Networks', uid: 'cato-networks', token: 'Cato-Networks', industry: 'cybersecurity', size: 'enterprise' },
      { name: 'Next Insurance', uid: 'next-insurance', token: 'Next-Insurance', industry: 'insurtech', size: 'enterprise' },
      { name: 'SentinelOne', uid: 'sentinelone', token: 'SentinelOne', industry: 'cybersecurity', size: 'enterprise' },
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

      const positions: ComeetPosition[] = response.data || [];
      
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
   */
  async searchAllCompanies(query: string): Promise<JobListing[]> {
    console.log('🔍 Fetching jobs from Comeet ATS companies...');
    
    const companies = this.getComeetCompanies();
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
   * Filter companies by industry
   */
  filterByIndustry(industry: string): ComeetCompany[] {
    return this.getComeetCompanies().filter(c => 
      c.industry?.toLowerCase() === industry.toLowerCase()
    );
  }

  /**
   * Get list of available companies
   */
  getAvailableCompanies(): { name: string; industry?: string; size?: string }[] {
    return this.getComeetCompanies().map(c => ({
      name: c.name,
      industry: c.industry,
      size: c.size
    }));
  }
}

export default new ComeetCareersService();

