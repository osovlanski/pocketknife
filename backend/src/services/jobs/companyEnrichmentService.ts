import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { CompanySizeCategory } from '@prisma/client';
import { getPrisma } from '../core/databaseService';
import { configService } from '../core/configService';

// Get timeout from config
const ENRICHMENT_TIMEOUT = () => configService.get('jobs.enrichment.timeoutMs', 10000);

interface CompanyInfo {
  name: string;
  description?: string;
  industry?: string;
  size?: 'startup' | 'midsize' | 'enterprise';
  founded?: string;
  isPublic?: boolean;
  stockSymbol?: string;
  fundingStage?: string;
  totalFunding?: string;
  employeeCount?: string;
  employeeCountMin?: number; // Parsed minimum employee count
  employeeCountMax?: number; // Parsed maximum employee count
  headquarters?: string;
  website?: string;
  growthScore?: number; // 1-10
  heatScore?: number; // 1-10 (how "hot" the company is)
  companyScore?: number; // 1-100 (overall company rating like Glassdoor)
  glassdoorRating?: number; // 1-5 star rating
  crunchbaseUrl?: string; // Link to Crunchbase profile
  linkedinUrl?: string; // Link to LinkedIn page
}

// Cache for company info to avoid repeated API calls
const companyCache = new Map<string, CompanyInfo>();

/**
 * Map database size enum to local type
 */
const mapDbSizeToLocal = (size: CompanySizeCategory | null): 'startup' | 'midsize' | 'enterprise' | undefined => {
  if (!size) return undefined;
  const mapping: Record<CompanySizeCategory, 'startup' | 'midsize' | 'enterprise'> = {
    'STARTUP': 'startup',
    'MIDSIZE': 'midsize',
    'ENTERPRISE': 'enterprise'
  };
  return mapping[size];
};

class CompanyEnrichmentService {
  private anthropicClient: Anthropic | null = null;

  private initializeAnthropic() {
    if (this.anthropicClient) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return;
    
    this.anthropicClient = new Anthropic({ apiKey });
  }

  /**
   * Parse employee count string to numeric range
   * Examples: "180,000+", "50-100", "1,500+", "500", "5000+"
   */
  parseEmployeeCount(employeeCount?: string): { min: number; max: number } | null {
    if (!employeeCount) return null;
    
    const cleaned = employeeCount.replace(/,/g, '').toLowerCase();
    
    // Pattern: "500+" or "5000+"
    const plusMatch = cleaned.match(/(\d+)\+/);
    if (plusMatch) {
      const min = parseInt(plusMatch[1]);
      return { min, max: min * 2 }; // Estimate max as 2x min
    }
    
    // Pattern: "50-100" or "1000-5000"
    const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
    }
    
    // Pattern: single number "500"
    const singleMatch = cleaned.match(/^(\d+)$/);
    if (singleMatch) {
      const count = parseInt(singleMatch[1]);
      return { min: count, max: count };
    }
    
    return null;
  }

  /**
   * Derive company size category from employee count
   * Startup: 1-50, Midsize: 51-500, Enterprise: 500+
   */
  deriveCompanySize(employeeCount?: string): 'startup' | 'midsize' | 'enterprise' | undefined {
    const parsed = this.parseEmployeeCount(employeeCount);
    if (!parsed) return undefined;
    
    // Use the minimum count for categorization
    const count = parsed.min;
    
    if (count <= 50) return 'startup';
    if (count <= 500) return 'midsize';
    return 'enterprise';
  }

  /**
   * Calculate company score (0-100) based on various factors
   * Similar to Glassdoor-style rating but as a percentile
   */
  calculateCompanyScore(info: Partial<CompanyInfo>): number {
    let score = 50; // Base score
    
    // Growth score contributes +/- 15 points
    if (info.growthScore) {
      score += (info.growthScore - 5) * 3; // -15 to +15
    }
    
    // Heat score contributes +/- 10 points
    if (info.heatScore) {
      score += (info.heatScore - 5) * 2; // -10 to +10
    }
    
    // Public company bonus
    if (info.isPublic) {
      score += 5;
    }
    
    // Funding stage bonus
    const fundingBonus: Record<string, number> = {
      'seed': 2,
      'series a': 5,
      'series b': 8,
      'series c': 10,
      'series d': 12,
      'series d+': 15,
      'ipo': 15,
      'public': 15
    };
    if (info.fundingStage) {
      const stage = info.fundingStage.toLowerCase();
      for (const [key, bonus] of Object.entries(fundingBonus)) {
        if (stage.includes(key)) {
          score += bonus;
          break;
        }
      }
    }
    
    // Glassdoor rating bonus (1-5 stars)
    if (info.glassdoorRating) {
      score += (info.glassdoorRating - 3) * 5; // -10 to +10
    }
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Fetch company info from Crunchbase (if API key available)
   */
  async fetchCrunchbaseInfo(companyName: string): Promise<Partial<CompanyInfo> | null> {
    const apiKey = process.env.CRUNCHBASE_API_KEY?.trim();
    if (!apiKey) {
      console.debug('Crunchbase API key not configured');
      return null;
    }

    try {
      // Crunchbase Basic API endpoint
      const searchUrl = `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(companyName)}&collection_ids=organizations&limit=1`;
      
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'X-cb-user-key': apiKey
        },
        timeout: ENRICHMENT_TIMEOUT()
      });

      const entities = searchResponse.data?.entities || [];
      if (entities.length === 0) return null;

      const orgPermalink = entities[0].identifier?.permalink;
      if (!orgPermalink) return null;

      // Fetch detailed org info
      const detailUrl = `https://api.crunchbase.com/api/v4/entities/organizations/${orgPermalink}?field_ids=short_description,categories,num_employees_enum,founded_on,funding_total,last_funding_type,ipo_status,stock_symbol,location_identifiers,website_url`;
      
      const detailResponse = await axios.get(detailUrl, {
        headers: {
          'X-cb-user-key': apiKey
        },
        timeout: ENRICHMENT_TIMEOUT()
      });

      const properties = detailResponse.data?.properties || {};
      
      // Parse employee count from Crunchbase enum
      const employeeEnumToCount: Record<string, string> = {
        'c_00001_00010': '1-10',
        'c_00011_00050': '11-50',
        'c_00051_00100': '51-100',
        'c_00101_00250': '101-250',
        'c_00251_00500': '251-500',
        'c_00501_01000': '501-1000',
        'c_01001_05000': '1001-5000',
        'c_05001_10000': '5001-10000',
        'c_10001_max': '10000+'
      };

      const employeeCount = employeeEnumToCount[properties.num_employees_enum] || undefined;
      
      return {
        description: properties.short_description,
        industry: properties.categories?.[0]?.value || undefined,
        employeeCount,
        employeeCountMin: this.parseEmployeeCount(employeeCount)?.min,
        employeeCountMax: this.parseEmployeeCount(employeeCount)?.max,
        size: this.deriveCompanySize(employeeCount),
        founded: properties.founded_on?.split('-')[0], // Year only
        totalFunding: properties.funding_total?.value_usd 
          ? `$${(properties.funding_total.value_usd / 1000000).toFixed(0)}M` 
          : undefined,
        fundingStage: properties.last_funding_type || undefined,
        isPublic: properties.ipo_status === 'public',
        stockSymbol: properties.stock_symbol || undefined,
        headquarters: properties.location_identifiers?.[0]?.value || undefined,
        website: properties.website_url || undefined,
        crunchbaseUrl: `https://www.crunchbase.com/organization/${orgPermalink}`
      };
    } catch (error: any) {
      console.debug(`Crunchbase API error for ${companyName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get company info from cache or fetch it
   */
  async getCompanyInfo(companyName: string): Promise<CompanyInfo | null> {
    const normalizedName = companyName.toLowerCase().trim();
    
    // Skip enrichment for invalid or too-short company names
    // These are likely country codes (e.g., 'ge', 'il') or parsing errors
    if (normalizedName.length <= 2 || normalizedName === 'unknown company') {
      return null;
    }
    
    // Skip common words that aren't company names
    const invalidNames = ['jobs', 'careers', 'hiring', 'job', 'career', 'glassdoor', 'linkedin', 'indeed'];
    if (invalidNames.includes(normalizedName)) {
      return null;
    }
    
    // Check cache first
    if (companyCache.has(normalizedName)) {
      return companyCache.get(normalizedName)!;
    }

    // Try to get info from various sources
    const info = await this.enrichCompanyData(companyName);
    
    if (info) {
      companyCache.set(normalizedName, info);
    }
    
    return info;
  }

  /**
   * Enrich company data using multiple sources: known companies, Crunchbase, AI
   */
  private async enrichCompanyData(companyName: string): Promise<CompanyInfo | null> {
    this.initializeAnthropic();

    // First, try to find company in database (ExternalCompany table)
    const dbCompany = await this.getCompanyFromDatabase(companyName);
    if (dbCompany) {
      dbCompany.companyScore = this.calculateCompanyScore(dbCompany);
      return dbCompany;
    }

    // Second, try hardcoded well-known companies (fallback)
    const knownCompany = this.getKnownCompanyInfo(companyName);
    if (knownCompany) {
      // Enhance known company with parsed employee counts
      const parsed = this.parseEmployeeCount(knownCompany.employeeCount);
      if (parsed) {
        knownCompany.employeeCountMin = parsed.min;
        knownCompany.employeeCountMax = parsed.max;
        knownCompany.size = this.deriveCompanySize(knownCompany.employeeCount);
      }
      knownCompany.companyScore = this.calculateCompanyScore(knownCompany);
      return knownCompany;
    }

    // Try Crunchbase API if available
    const crunchbaseInfo = await this.fetchCrunchbaseInfo(companyName);
    if (crunchbaseInfo && crunchbaseInfo.description) {
      const info: CompanyInfo = {
        name: companyName,
        ...crunchbaseInfo,
        companyScore: this.calculateCompanyScore(crunchbaseInfo)
      } as CompanyInfo;
      return info;
    }

    // Use AI to get basic company info as fallback
    if (this.anthropicClient) {
      try {
        const message = await this.anthropicClient.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Provide brief factual information about the company "${companyName}" in JSON format. If you don't have reliable information, use null for unknown fields.

IMPORTANT: For employeeCount, provide an accurate range like "1-50", "51-200", "500-1000", "5000+" based on what you know.

Return ONLY valid JSON (no markdown):
{
  "name": "${companyName}",
  "description": "1-2 sentence description of what they do",
  "industry": "main industry (e.g., SaaS, FinTech, Cybersecurity)",
  "founded": "year or null",
  "isPublic": true/false or null,
  "stockSymbol": "TICKER or null",
  "fundingStage": "Seed/Series A/B/C/D+/IPO/Private or null",
  "totalFunding": "$XXM or $XXB or null",
  "employeeCount": "XX-XX (e.g. 1-50, 51-200, 500-1000, 5000+) or null",
  "headquarters": "City, Country or null",
  "growthScore": 1-10 (estimated growth potential) or null,
  "heatScore": 1-10 (how trendy/in-demand) or null,
  "glassdoorRating": 1-5 (if known, approximate company rating) or null
}`
          }]
        });

        const firstBlock = message.content[0];
        const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
        const cleanText = responseText.replace(/```json|```/g, '').trim();
        
        const aiInfo = JSON.parse(cleanText);
        
        // Parse employee count and derive size
        const parsed = this.parseEmployeeCount(aiInfo.employeeCount);
        if (parsed) {
          aiInfo.employeeCountMin = parsed.min;
          aiInfo.employeeCountMax = parsed.max;
        }
        aiInfo.size = this.deriveCompanySize(aiInfo.employeeCount);
        aiInfo.companyScore = this.calculateCompanyScore(aiInfo);
        
        return aiInfo;
      } catch (error) {
        console.warn(`Could not enrich data for ${companyName}`);
      }
    }

    return null;
  }

  /**
   * Fetch company info from database (ExternalCompany table)
   * This is the primary source, with fallback to hardcoded list
   */
  private async getCompanyFromDatabase(companyName: string): Promise<CompanyInfo | null> {
    try {
      const prisma = getPrisma();
      if (!prisma) return null;
      
      const dbCompany = await (prisma as any).externalCompany.findFirst({
        where: {
          OR: [
            { name: { equals: companyName, mode: 'insensitive' } },
            { slug: { equals: companyName.toLowerCase().replace(/\s+/g, '-') } }
          ]
        }
      });

      if (!dbCompany) return null;

      return {
        name: dbCompany.name,
        description: dbCompany.description || undefined,
        industry: dbCompany.industry || undefined,
        size: mapDbSizeToLocal(dbCompany.size),
        founded: dbCompany.founded || undefined,
        isPublic: dbCompany.fundingStage?.toLowerCase().includes('ipo') || false,
        fundingStage: dbCompany.fundingStage || undefined,
        totalFunding: dbCompany.totalFunding || undefined,
        employeeCount: dbCompany.employeeCount || undefined,
        employeeCountMin: dbCompany.employeeCountMin || undefined,
        employeeCountMax: dbCompany.employeeCountMax || undefined,
        headquarters: dbCompany.headquarters || undefined,
        website: dbCompany.website || undefined,
        growthScore: dbCompany.growthScore || undefined,
        heatScore: dbCompany.heatScore || undefined,
        companyScore: dbCompany.companyScore || undefined,
        glassdoorRating: dbCompany.glassdoorRating || undefined,
        crunchbaseUrl: dbCompany.crunchbaseUrl || undefined,
        linkedinUrl: dbCompany.linkedinUrl || undefined
      };
    } catch (error) {
      console.warn('⚠️ Could not fetch company from database:', error);
      return null;
    }
  }

  /**
   * Database of well-known tech companies with accurate employee counts
   * NOTE: This is a FALLBACK when database is empty or company not found
   * Prefer using the ExternalCompany database table for production
   */
  private getKnownCompanyInfo(companyName: string): CompanyInfo | null {
    const name = companyName.toLowerCase();
    
    const knownCompanies: Record<string, CompanyInfo> = {
      // =========================================================================
      // FAANG / Big Tech (Enterprise - 500+)
      // =========================================================================
      'google': {
        name: 'Google',
        description: 'Global technology company specializing in search, cloud, AI, and advertising',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1998',
        isPublic: true,
        stockSymbol: 'GOOGL',
        employeeCount: '180000+',
        headquarters: 'Mountain View, CA',
        growthScore: 8,
        heatScore: 9,
        glassdoorRating: 4.3,
        linkedinUrl: 'https://www.linkedin.com/company/google'
      },
      'microsoft': {
        name: 'Microsoft',
        description: 'Technology corporation developing software, cloud services, and gaming',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1975',
        isPublic: true,
        stockSymbol: 'MSFT',
        employeeCount: '220000+',
        headquarters: 'Redmond, WA',
        growthScore: 8,
        heatScore: 9,
        glassdoorRating: 4.2
      },
      'amazon': {
        name: 'Amazon',
        description: 'E-commerce and cloud computing giant (AWS)',
        industry: 'E-commerce / Cloud',
        size: 'enterprise',
        founded: '1994',
        isPublic: true,
        stockSymbol: 'AMZN',
        employeeCount: '1500000+',
        headquarters: 'Seattle, WA',
        growthScore: 8,
        heatScore: 8,
        glassdoorRating: 3.8
      },
      'meta': {
        name: 'Meta',
        description: 'Social media and metaverse technology company',
        industry: 'Social Media / VR',
        size: 'enterprise',
        founded: '2004',
        isPublic: true,
        stockSymbol: 'META',
        employeeCount: '86000+',
        headquarters: 'Menlo Park, CA',
        growthScore: 7,
        heatScore: 8,
        glassdoorRating: 4.0
      },
      'apple': {
        name: 'Apple',
        description: 'Consumer electronics and software company',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1976',
        isPublic: true,
        stockSymbol: 'AAPL',
        employeeCount: '160000+',
        headquarters: 'Cupertino, CA',
        growthScore: 7,
        heatScore: 9,
        glassdoorRating: 4.2
      },
      'netflix': {
        name: 'Netflix',
        description: 'Streaming entertainment service',
        industry: 'Entertainment / Streaming',
        size: 'enterprise',
        founded: '1997',
        isPublic: true,
        stockSymbol: 'NFLX',
        employeeCount: '13000+',
        headquarters: 'Los Gatos, CA',
        growthScore: 6,
        heatScore: 7,
        glassdoorRating: 4.0
      },
      
      // =========================================================================
      // Israeli Tech Companies
      // =========================================================================
      'wix': {
        name: 'Wix',
        description: 'Website builder and development platform',
        industry: 'SaaS / Web Development',
        size: 'enterprise',
        founded: '2006',
        isPublic: true,
        stockSymbol: 'WIX',
        employeeCount: '5000+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 7,
        heatScore: 7,
        glassdoorRating: 4.1
      },
      'monday.com': {
        name: 'Monday.com',
        description: 'Work operating system and project management platform',
        industry: 'SaaS / Productivity',
        size: 'enterprise',
        founded: '2012',
        isPublic: true,
        stockSymbol: 'MNDY',
        employeeCount: '1800+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 9,
        heatScore: 9,
        glassdoorRating: 4.5
      },
      'checkmarx': {
        name: 'Checkmarx',
        description: 'Application security testing company',
        industry: 'Cybersecurity',
        size: 'enterprise',
        founded: '2006',
        fundingStage: 'Private (acquired)',
        employeeCount: '1000+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 7,
        heatScore: 8,
        glassdoorRating: 3.9
      },
      
      // =========================================================================
      // Hot Startups / Unicorns
      // =========================================================================
      'stripe': {
        name: 'Stripe',
        description: 'Online payment processing platform',
        industry: 'FinTech',
        size: 'enterprise',
        founded: '2010',
        isPublic: false,
        fundingStage: 'Series I',
        totalFunding: '$8.7B',
        employeeCount: '8000+',
        headquarters: 'San Francisco, CA',
        growthScore: 9,
        heatScore: 10,
        glassdoorRating: 4.2
      },
      'openai': {
        name: 'OpenAI',
        description: 'AI research and deployment company (ChatGPT, GPT-4)',
        industry: 'AI / Research',
        size: 'enterprise',
        founded: '2015',
        isPublic: false,
        fundingStage: 'Series D+',
        totalFunding: '$11B+',
        employeeCount: '1500+',
        headquarters: 'San Francisco, CA',
        growthScore: 10,
        heatScore: 10,
        glassdoorRating: 4.3
      },
      'anthropic': {
        name: 'Anthropic',
        description: 'AI safety company (Claude)',
        industry: 'AI / Research',
        size: 'midsize',
        founded: '2021',
        isPublic: false,
        fundingStage: 'Series D',
        totalFunding: '$4B+',
        employeeCount: '400-600',
        headquarters: 'San Francisco, CA',
        growthScore: 10,
        heatScore: 10,
        glassdoorRating: 4.5
      },
      
      // =========================================================================
      // True Startups (1-50 employees) - Israeli
      // =========================================================================
      'piiano': {
        name: 'Piiano',
        description: 'Data privacy infrastructure for developers',
        industry: 'Privacy / Security',
        size: 'startup',
        founded: '2021',
        isPublic: false,
        fundingStage: 'Series A',
        totalFunding: '$9M',
        employeeCount: '20-50',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 8,
        heatScore: 7,
        glassdoorRating: 4.2
      },
      'groundcover': {
        name: 'Groundcover',
        description: 'Cloud-native observability platform',
        industry: 'Observability / DevOps',
        size: 'startup',
        founded: '2021',
        isPublic: false,
        fundingStage: 'Series A',
        totalFunding: '$20M',
        employeeCount: '30-50',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 9,
        heatScore: 8,
        glassdoorRating: 4.3
      },
      'komodor': {
        name: 'Komodor',
        description: 'Kubernetes troubleshooting platform',
        industry: 'DevOps',
        size: 'startup',
        founded: '2020',
        isPublic: false,
        fundingStage: 'Series B',
        totalFunding: '$42M',
        employeeCount: '40-60',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 8,
        heatScore: 8,
        glassdoorRating: 4.4
      },
      
      // =========================================================================
      // Mid-size Companies (51-500 employees)
      // =========================================================================
      'cyera': {
        name: 'Cyera',
        description: 'Cloud data security platform',
        industry: 'Cybersecurity',
        size: 'midsize',
        founded: '2021',
        isPublic: false,
        fundingStage: 'Series B',
        totalFunding: '$160M',
        employeeCount: '100-200',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 9,
        heatScore: 9,
        glassdoorRating: 4.5
      },
      'lightrun': {
        name: 'Lightrun',
        description: 'Developer observability platform',
        industry: 'DevTools',
        size: 'midsize',
        founded: '2019',
        isPublic: false,
        fundingStage: 'Series B',
        totalFunding: '$70M',
        employeeCount: '60-100',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 8,
        heatScore: 8,
        glassdoorRating: 4.3
      },
      'torq': {
        name: 'Torq',
        description: 'Security automation platform',
        industry: 'Cybersecurity',
        size: 'midsize',
        founded: '2020',
        isPublic: false,
        fundingStage: 'Series B',
        totalFunding: '$78M',
        employeeCount: '80-120',
        headquarters: 'Portland, OR / Tel Aviv',
        growthScore: 9,
        heatScore: 9,
        glassdoorRating: 4.4
      }
    };

    // Check for exact match or partial match
    for (const [key, info] of Object.entries(knownCompanies)) {
      if (name.includes(key) || key.includes(name)) {
        return info;
      }
    }

    return null;
  }

  /**
   * Batch enrich multiple companies
   */
  async enrichMultipleCompanies(companyNames: string[]): Promise<Map<string, CompanyInfo>> {
    const results = new Map<string, CompanyInfo>();
    
    // Process in parallel with limit
    const batchSize = 5;
    for (let i = 0; i < companyNames.length; i += batchSize) {
      const batch = companyNames.slice(i, i + batchSize);
      const promises = batch.map(async (name) => {
        const info = await this.getCompanyInfo(name);
        if (info) {
          results.set(name, info);
        }
      });
      await Promise.all(promises);
    }
    
    return results;
  }
}

export default new CompanyEnrichmentService();

