import axios from 'axios';
import { configService } from '../core/configService';

const JOB_API_TIMEOUT = () => configService.get('jobs.api.timeoutMs', 15000);

interface StartupInfo {
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  stage?: string;
  employees?: string;
  location?: string;
}

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

class StartupNationCentralService {
  private readonly baseUrl = 'https://finder.startupnationcentral.org';

  /**
   * Search for Israeli startups on StartupNationCentral.
   * Converts each startup into a JobListing pointing at its careers page.
   * Degrades gracefully if the API is blocked (403/network error).
   */
  async searchStartups(
    query: string,
    options?: { industry?: string; stage?: string; limit?: number }
  ): Promise<JobListing[]> {
    try {
      console.log(`🔍 Searching StartupNationCentral for: "${query}"`);

      const limit = options?.limit ?? configService.get('limits.jobs.apis.himalayas.maxResults', 20) as number;

      const requestBody: Record<string, unknown> = {
        query,
        from: 0,
        size: limit
      };

      if (options?.industry) {
        requestBody.filters = { industry: options.industry };
      }
      if (options?.stage) {
        requestBody.filters = { ...(requestBody.filters as object || {}), stage: options.stage };
      }

      const response = await axios.post(
        `${this.baseUrl}/api/startups/search`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://finder.startupnationcentral.org/startups/search',
            'Origin': 'https://finder.startupnationcentral.org'
          },
          timeout: JOB_API_TIMEOUT(),
          validateStatus: (status) => status < 500
        }
      );

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        console.log(`⚠️ StartupNationCentral API returned ${response.status} - skipping`);
        return [];
      }

      const hits: any[] = response.data?.hits?.hits || response.data?.results || response.data?.data || [];

      if (hits.length === 0) {
        console.log('⚠️ StartupNationCentral returned no results');
        return [];
      }

      const startups: StartupInfo[] = hits.map((hit: any) => {
        const src = hit._source || hit;
        return {
          name: src.name || src.displayName || 'Unknown',
          website: src.websiteUrl || src.website,
          description: src.description || src.shortDescription || '',
          industry: src.industries?.[0] || src.industry,
          stage: src.stage || src.fundingStage,
          employees: src.employeeCount || src.teamSize,
          location: src.location || src.hq || 'Israel'
        };
      });

      const listings = startups.map((startup): JobListing => {
        const careersUrl = startup.website
          ? `${startup.website.replace(/\/$/, '')}/careers`
          : `https://finder.startupnationcentral.org/startups/search`;

        return {
          id: `snc-${startup.name.toLowerCase().replace(/\s+/g, '-')}`,
          source: 'StartupNationCentral',
          title: `Opportunities at ${startup.name}`,
          company: startup.name,
          location: startup.location || 'Israel',
          remote: false,
          description: [
            startup.description,
            startup.industry ? `Industry: ${startup.industry}` : '',
            startup.stage ? `Stage: ${startup.stage}` : '',
            startup.employees ? `Team size: ${startup.employees}` : ''
          ].filter(Boolean).join('\n'),
          applyUrl: careersUrl,
          postedAt: new Date().toISOString(),
          tags: [startup.industry].filter(Boolean) as string[],
          companySize: 'startup',
          industry: startup.industry ? [startup.industry] : []
        };
      });

      console.log(`✅ Found ${listings.length} startups from StartupNationCentral`);
      return listings;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('⚠️ StartupNationCentral: access blocked (403) - skipping');
      } else if (error.code === 'ECONNABORTED') {
        console.log('⚠️ StartupNationCentral: request timeout - skipping');
      } else {
        console.error('❌ StartupNationCentral error:', error.message);
      }
      return [];
    }
  }
}

export default new StartupNationCentralService();
