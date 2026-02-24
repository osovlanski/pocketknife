import axios from 'axios';
import { configService } from '../core/configService';

// Get timeout from config
const JOB_API_TIMEOUT = () => configService.get('jobs.api.timeoutMs', 15000);

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

class AdditionalJobAPIs {
  /**
   * Fetch jobs from The Muse API (FREE, 500 requests/month)
   * High-quality tech jobs, company profiles, editorial content
   * API: https://www.themuse.com/developers/api/v2
   */
  async fetchTheMuse(query: string, location?: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from The Muse...');
      
      const response = await axios.get('https://www.themuse.com/api/public/jobs', {
        params: {
          category: 'Engineering',
          page: 0,
          descending: true,
          api_key: 'public'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: JOB_API_TIMEOUT(),
        validateStatus: (status) => status < 500 // Accept 4xx errors
      });

      // Handle auth/access errors gracefully
      if (response.status === 401 || response.status === 403) {
        console.log('⚠️ The Muse API blocked - skipping');
        return [];
      }

      const jobs = response.data.results || [];
      
      // Filter by query
      const queryLower = query.toLowerCase();
      const filtered = jobs
        .filter((job: any) => {
          const text = `${job.name} ${job.contents}`.toLowerCase();
          return text.includes(queryLower) || 
                 queryLower.split(' ').some(word => text.includes(word));
        })
        .slice(0, configService.get('limits.jobs.apis.theMuse.maxResults', 20) as number)
        .map((job: any) => {
          // Parse location
          const jobLocation = job.locations?.[0]?.name || 'Remote';
          const isRemote = jobLocation.toLowerCase().includes('remote') || 
                          jobLocation.toLowerCase().includes('flexible');

          return {
            id: `themuse-${job.id}`,
            source: 'The Muse',
            title: job.name,
            company: job.company?.name || 'Unknown',
            location: jobLocation,
            remote: isRemote,
            description: job.contents || '',
            applyUrl: job.refs?.landing_page || `https://www.themuse.com/jobs/${job.id}`,
            postedAt: job.publication_date || new Date().toISOString(),
            tags: job.tags || [],
            companySize: this.detectCompanySize(job.company?.size),
            experienceLevel: this.detectExperienceLevel(job.name, job.contents)
          };
        });

      console.log(`✅ Found ${filtered.length} jobs from The Muse`);
      return filtered;
    } catch (error: any) {
      console.error('❌ Error fetching from The Muse:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Findwork.dev (FREE, unlimited)
   * Developer-focused remote jobs
   * API: https://findwork.dev/developers/
   */
  async fetchFindwork(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from Findwork.dev...');
      
      const response = await axios.get('https://findwork.dev/api/jobs/', {
        headers: {
          'Authorization': 'Token public', // Public access token
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: JOB_API_TIMEOUT(),
        validateStatus: (status) => status < 500 // Accept 4xx errors
      });

      // Handle auth errors gracefully
      if (response.status === 401 || response.status === 403) {
        console.log('⚠️ Findwork.dev API requires authentication - skipping');
        return [];
      }

      const jobs = response.data.results || [];
      
      // Filter by query
      const queryLower = query.toLowerCase();
      const filtered = jobs
        .filter((job: any) => {
          const text = `${job.role} ${job.text}`.toLowerCase();
          return text.includes(queryLower) || 
                 queryLower.split(' ').some(word => word.length > 3 && text.includes(word));
        })
        .slice(0, configService.get('limits.jobs.apis.arbeitnow.maxResults', 20) as number)
        .map((job: any) => ({
          id: `findwork-${job.id}`,
          source: 'Findwork.dev',
          title: job.role,
          company: job.company_name || 'Unknown',
          location: job.location || 'Remote',
          remote: job.remote || true,
          description: job.text || '',
          applyUrl: job.url || `https://findwork.dev/job/${job.id}`,
          salary: job.salary_range,
          postedAt: job.date_posted || new Date().toISOString(),
          tags: job.keywords || [],
          experienceLevel: this.detectExperienceLevel(job.role, job.text),
          jobType: job.employment_type?.toLowerCase().includes('contract') ? 'contract' : 'fulltime'
        }));

      console.log(`✅ Found ${filtered.length} jobs from Findwork.dev`);
      return filtered;
    } catch (error: any) {
      console.error('❌ Error fetching from Findwork.dev:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Himalayas (FREE, community-driven)
   * Remote tech jobs with great company info
   * API: https://himalayas.app/companies/api
   */
  async fetchHimalayas(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from Himalayas...');
      
      // Note: Himalayas doesn't have a public API, but we can try their endpoint
      // This might need to be updated based on their actual API availability
      const response = await axios.get('https://himalayas.app/jobs.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: JOB_API_TIMEOUT(),
        validateStatus: (status) => status < 500 // Accept 4xx errors
      });

      // Handle auth/access errors gracefully
      if (response.status === 401 || response.status === 403) {
        console.log('⚠️ Himalayas API blocked - skipping');
        return [];
      }

      // Validate response data is an array
      let jobs = response.data;
      
      if (!jobs) {
        console.log('⚠️ Himalayas returned empty response - skipping');
        return [];
      }

      // Handle different response formats
      if (jobs.jobs && Array.isArray(jobs.jobs)) {
        jobs = jobs.jobs;
      } else if (jobs.data && Array.isArray(jobs.data)) {
        jobs = jobs.data;
      } else if (!Array.isArray(jobs)) {
        console.log('⚠️ Himalayas response is not an array - skipping');
        return [];
      }
      
      // Filter by query
      const queryLower = query.toLowerCase();
      const filtered = jobs
        .filter((job: any) => {
          const text = `${job.title} ${job.description}`.toLowerCase();
          return text.includes(queryLower) || 
                 queryLower.split(' ').some(word => word.length > 3 && text.includes(word));
        })
        .slice(0, configService.get('limits.jobs.apis.himalayas.maxResults', 20) as number)
        .map((job: any) => ({
          id: `himalayas-${job.id || job.slug}`,
          source: 'Himalayas',
          title: job.title,
          company: job.company?.name || 'Unknown',
          location: job.location || 'Remote',
          remote: true,
          description: job.description || '',
          applyUrl: job.apply_url || `https://himalayas.app/jobs/${job.slug}`,
          salary: job.salary_range,
          postedAt: job.published_at || new Date().toISOString(),
          tags: job.tags || [],
          companySize: this.detectCompanySize(job.company?.size),
          experienceLevel: this.detectExperienceLevel(job.title, job.description)
        }));

      console.log(`✅ Found ${filtered.length} jobs from Himalayas`);
      return filtered;
    } catch (error: any) {
      console.error('❌ Error fetching from Himalayas:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Jobicy (FREE, no auth required)
   * Remote tech jobs with tag-based search
   * API: https://jobicy.com/api/v2/remote-jobs
   */
  async fetchJobicy(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from Jobicy...');

      // Jobicy uses tag-based search — use first meaningful keyword
      const keyword = query.split(' ').find(word => word.length > 3) || query;

      const response = await axios.get('https://jobicy.com/api/v2/remote-jobs', {
        params: {
          count: 50,
          tag: keyword
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: JOB_API_TIMEOUT(),
        validateStatus: (status) => status < 500
      });

      if (response.status === 401 || response.status === 403) {
        console.log('⚠️ Jobicy API blocked - skipping');
        return [];
      }

      const jobs: any[] = response.data?.jobs || [];

      const queryLower = query.toLowerCase();
      const formatted = jobs
        .filter((job: any) => {
          const text = `${job.jobTitle} ${job.jobDescription}`.toLowerCase();
          return text.includes(queryLower) ||
                 queryLower.split(' ').some(word => word.length > 3 && text.includes(word));
        })
        .slice(0, configService.get('limits.jobs.apis.himalayas.maxResults', 20) as number)
        .map((job: any) => ({
          id: `jobicy-${job.id}`,
          source: 'Jobicy',
          title: job.jobTitle,
          company: job.companyName || 'Unknown',
          location: job.jobGeo || 'Remote',
          remote: true,
          description: job.jobDescription || '',
          applyUrl: job.url || `https://jobicy.com/jobs/${job.id}`,
          salary: job.annualSalaryMin && job.annualSalaryMax
            ? `$${Number(job.annualSalaryMin).toLocaleString()} - $${Number(job.annualSalaryMax).toLocaleString()}`
            : undefined,
          postedAt: job.pubDate || new Date().toISOString(),
          tags: job.jobIndustry ? [job.jobIndustry] : [],
          companySize: this.detectCompanySize(undefined),
          experienceLevel: this.detectExperienceLevel(job.jobTitle, job.jobDescription)
        }));

      console.log(`✅ Found ${formatted.length} jobs from Jobicy`);
      return formatted;
    } catch (error: any) {
      console.error('❌ Error fetching from Jobicy:', error.message);
      return [];
    }
  }

  /**
   * Detect company size from text
   */
  private detectCompanySize(size?: string): 'startup' | 'midsize' | 'enterprise' | undefined {
    if (!size) return undefined;
    
    const sizeLower = size.toLowerCase();
    if (sizeLower.includes('1-50') || sizeLower.includes('startup') || sizeLower.includes('small')) {
      return 'startup';
    }
    if (sizeLower.includes('51-500') || sizeLower.includes('medium') || sizeLower.includes('mid')) {
      return 'midsize';
    }
    if (sizeLower.includes('500+') || sizeLower.includes('enterprise') || sizeLower.includes('large')) {
      return 'enterprise';
    }
    return undefined;
  }

  /**
   * Detect experience level from text
   */
  private detectExperienceLevel(title: string, description: string): 'junior' | 'mid' | 'senior' | undefined {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.match(/\b(senior|sr\.|lead|principal|staff|architect)\b/)) {
      return 'senior';
    }
    if (text.match(/\b(junior|jr\.|entry|graduate|intern)\b/)) {
      return 'junior';
    }
    if (text.match(/\b(mid|intermediate|3-5 years)\b/)) {
      return 'mid';
    }
    
    return undefined;
  }
}

export default new AdditionalJobAPIs();
