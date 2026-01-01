import axios from 'axios';

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

/**
 * Israeli Job Boards Integration Service
 * 
 * This service provides methods to search Israeli job boards and tech companies.
 * Note: Some Israeli job sites don't have public APIs, so we use alternative methods.
 */
class IsraeliJobsService {
  // Top 100 Israeli tech companies to search for careers
  private topIsraeliCompanies = [
    { name: 'Wix', domain: 'wix.com', careersUrl: 'https://www.wix.com/jobs' },
    { name: 'Check Point', domain: 'checkpoint.com', careersUrl: 'https://careers.checkpoint.com' },
    { name: 'Monday.com', domain: 'monday.com', careersUrl: 'https://monday.com/careers' },
    { name: 'IronSource', domain: 'ironsrc.com', careersUrl: 'https://company.ironsrc.com/careers' },
    { name: 'Fiverr', domain: 'fiverr.com', careersUrl: 'https://www.fiverr.com/jobs' },
    { name: 'Playtika', domain: 'playtika.com', careersUrl: 'https://careers.playtika.com' },
    { name: 'CyberArk', domain: 'cyberark.com', careersUrl: 'https://www.cyberark.com/careers' },
    { name: 'SentinelOne', domain: 'sentinelone.com', careersUrl: 'https://www.sentinelone.com/careers' },
    { name: 'Snyk', domain: 'snyk.io', careersUrl: 'https://snyk.io/careers' },
    { name: 'JFrog', domain: 'jfrog.com', careersUrl: 'https://jfrog.com/careers' },
    { name: 'Papaya Global', domain: 'papayaglobal.com', careersUrl: 'https://www.papayaglobal.com/careers' },
    { name: 'Gong', domain: 'gong.io', careersUrl: 'https://www.gong.io/careers' },
    { name: 'Cloudinary', domain: 'cloudinary.com', careersUrl: 'https://cloudinary.com/careers' },
    { name: 'AppsFlyer', domain: 'appsflyer.com', careersUrl: 'https://www.appsflyer.com/careers' },
    { name: 'Elementor', domain: 'elementor.com', careersUrl: 'https://elementor.com/about/careers' },
    { name: 'Riskified', domain: 'riskified.com', careersUrl: 'https://www.riskified.com/careers' },
    { name: 'Yotpo', domain: 'yotpo.com', careersUrl: 'https://www.yotpo.com/careers' },
    { name: 'Via', domain: 'ridewithvia.com', careersUrl: 'https://ridewithvia.com/careers' },
    { name: 'Taboola', domain: 'taboola.com', careersUrl: 'https://www.taboola.com/careers' },
    { name: 'Outbrain', domain: 'outbrain.com', careersUrl: 'https://www.outbrain.com/careers' },
    { name: 'Cato Networks', domain: 'catonetworks.com', careersUrl: 'https://www.catonetworks.com/careers' },
    { name: 'Orca Security', domain: 'orca.security', careersUrl: 'https://orca.security/about/careers' },
    { name: 'Wiz', domain: 'wiz.io', careersUrl: 'https://www.wiz.io/careers' },
    { name: 'Rapyd', domain: 'rapyd.net', careersUrl: 'https://www.rapyd.net/company/careers' },
    { name: 'Tipalti', domain: 'tipalti.com', careersUrl: 'https://tipalti.com/careers' },
    { name: 'Verbit', domain: 'verbit.ai', careersUrl: 'https://verbit.ai/careers' },
    { name: 'Hibob', domain: 'hibob.com', careersUrl: 'https://www.hibob.com/careers' },
    { name: 'Deel', domain: 'deel.com', careersUrl: 'https://www.deel.com/careers' },
    { name: 'Melio', domain: 'meliopayments.com', careersUrl: 'https://meliopayments.com/careers' },
    { name: 'Next Insurance', domain: 'nextinsurance.com', careersUrl: 'https://www.nextinsurance.com/careers' },
    { name: 'Yext', domain: 'yext.com', careersUrl: 'https://www.yext.com/careers' },
    { name: 'WalkMe', domain: 'walkme.com', careersUrl: 'https://www.walkme.com/careers' },
    { name: 'Forter', domain: 'forter.com', careersUrl: 'https://www.forter.com/careers' },
    { name: 'BigID', domain: 'bigid.com', careersUrl: 'https://bigid.com/company/careers' },
    { name: 'Axonius', domain: 'axonius.com', careersUrl: 'https://www.axonius.com/careers' },
    { name: 'Transmit Security', domain: 'transmitsecurity.com', careersUrl: 'https://www.transmitsecurity.com/careers' },
    { name: 'Aqua Security', domain: 'aquasec.com', careersUrl: 'https://www.aquasec.com/about-us/careers' },
    { name: 'Mobileye', domain: 'mobileye.com', careersUrl: 'https://www.mobileye.com/careers' },
    { name: 'Intel Israel', domain: 'intel.com', careersUrl: 'https://jobs.intel.com' },
    { name: 'Google Israel', domain: 'google.com', careersUrl: 'https://careers.google.com' },
    { name: 'Microsoft Israel', domain: 'microsoft.com', careersUrl: 'https://careers.microsoft.com' },
    { name: 'Amazon Israel', domain: 'amazon.com', careersUrl: 'https://www.amazon.jobs' },
    { name: 'Meta Israel', domain: 'meta.com', careersUrl: 'https://www.metacareers.com' },
    { name: 'Apple Israel', domain: 'apple.com', careersUrl: 'https://jobs.apple.com' },
    { name: 'Nvidia Israel', domain: 'nvidia.com', careersUrl: 'https://nvidia.wd5.myworkdayjobs.com' },
    { name: 'Booking.com Israel', domain: 'booking.com', careersUrl: 'https://careers.booking.com' },
    { name: 'Payoneer', domain: 'payoneer.com', careersUrl: 'https://www.payoneer.com/about/careers' },
    { name: 'Lemonade', domain: 'lemonade.com', careersUrl: 'https://www.lemonade.com/careers' },
    { name: 'Hippo', domain: 'hippo.com', careersUrl: 'https://www.hippo.com/careers' },
    { name: 'Fireblocks', domain: 'fireblocks.com', careersUrl: 'https://www.fireblocks.com/careers' }
  ];

  /**
   * Get curated list of top Israeli tech companies with careers pages
   */
  getTopIsraeliCompanies() {
    return this.topIsraeliCompanies;
  }

  /**
   * Search GitHub Jobs for Israeli positions (using alternative source)
   * Note: GitHub Jobs API is deprecated, using alternative
   */
  async searchGitHubStyle(query: string): Promise<JobListing[]> {
    // GitHub Jobs API is deprecated, skipping
    return [];
  }

  /**
   * Generate job listings from Israeli tech companies
   * This returns career page URLs for manual search
   */
  async getIsraeliTechJobs(query: string): Promise<JobListing[]> {
    console.log('🇮🇱 Getting Israeli tech company career pages...');

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/);

    // Match companies based on relevance to query
    const relevantCompanies = this.topIsraeliCompanies.filter(company => {
      const companyLower = company.name.toLowerCase();
      // Include if company name matches or if query contains common tech terms
      return keywords.some(kw => companyLower.includes(kw)) || 
             keywords.some(kw => ['developer', 'engineer', 'fullstack', 'frontend', 'backend', 'devops', 'data', 'security'].includes(kw));
    });

    // Take all companies if no specific match (generic developer search)
    const companies = relevantCompanies.length > 0 ? relevantCompanies : this.topIsraeliCompanies;

    return companies.slice(0, 30).map((company, index) => ({
      id: `il-company-${index}`,
      source: 'Israeli Tech',
      title: `${query} positions at ${company.name}`,
      company: company.name,
      location: 'Israel (Tel Aviv, Herzliya, Ra\'anana)',
      remote: false,
      description: `${company.name} is one of Israel's leading tech companies. Visit their careers page to find current openings for ${query} roles. ${company.name} is known for innovation and offers competitive compensation in the Israeli market.`,
      applyUrl: company.careersUrl,
      postedAt: new Date().toISOString(),
      tags: ['israel', 'tech', 'startup'],
      companySize: 'enterprise',
      industry: ['tech', 'startup'],
      experienceLevel: queryLower.includes('senior') ? 'senior' : 
                       queryLower.includes('junior') ? 'junior' : 'mid',
      jobType: 'fulltime'
    }));
  }

  /**
   * Search Glassdoor for Israel (if API available)
   * Note: Glassdoor API requires partnership, using JSearch as alternative
   */
  async searchGlassdoorIsrael(query: string): Promise<JobListing[]> {
    console.log('🔍 Glassdoor Israel search (via JSearch aggregation)...');
    // JSearch already includes Glassdoor data, handled in main service
    return [];
  }

  /**
   * Search LinkedIn for Israel positions
   * Note: LinkedIn API requires OAuth, using JSearch as alternative
   */
  async searchLinkedInIsrael(query: string): Promise<JobListing[]> {
    console.log('🔍 LinkedIn Israel search (via JSearch aggregation)...');
    // JSearch already includes LinkedIn data, handled in main service
    return [];
  }

  /**
   * Generate curated list of job search resources for Israel
   */
  getIsraeliJobResources() {
    return [
      {
        name: 'LinkedIn Israel',
        url: 'https://www.linkedin.com/jobs/search/?location=Israel',
        description: 'Largest professional network with many Israeli tech positions'
      },
      {
        name: 'Glassdoor Israel',
        url: 'https://www.glassdoor.com/Job/israel-jobs-SRCH_IL.0,6_IN119.htm',
        description: 'Job listings with salary and company reviews'
      },
      {
        name: 'Indeed Israel',
        url: 'https://il.indeed.com/',
        description: 'Major job aggregator with Israeli positions'
      },
      {
        name: 'Geektime Jobs',
        url: 'https://www.geektime.co.il/jobs/',
        description: 'Israeli tech news site with job board'
      },
      {
        name: 'Calcalist Jobs',
        url: 'https://www.calcalist.co.il/jobs/',
        description: 'Israeli business news with tech job listings'
      },
      {
        name: 'AllJobs',
        url: 'https://www.alljobs.co.il/',
        description: 'Popular Israeli job board'
      },
      {
        name: 'Drushim',
        url: 'https://www.drushim.co.il/',
        description: 'Israeli job search platform'
      },
      {
        name: 'Startup Nation Central',
        url: 'https://startupnationcentral.org/jobs/',
        description: 'Focused on Israeli startup ecosystem'
      },
      {
        name: 'HiTech Jobs Israel',
        url: 'https://www.hitech-jobs.co.il/',
        description: 'Specialized Israeli high-tech job board'
      },
      {
        name: 'TheMarker Jobs',
        url: 'https://www.themarker.com/jobs',
        description: 'Haaretz business section job listings'
      }
    ];
  }
}

export default new IsraeliJobsService();


