/**
 * External Company Service
 * 
 * Manages external company records (Comeet, Greenhouse, Lever, etc.)
 * Provides discovery, enrichment, and CRUD operations.
 */

import { ATSProvider, CompanySizeCategory, ExternalCompanyStatus, Prisma } from '@prisma/client';
import axios from 'axios';
import { configService } from '../core/configService';
import { getPrisma } from '../core/databaseService';

/**
 * Get Prisma client or throw if not available
 */
const getPrismaOrThrow = () => {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not initialized');
  }
  return prisma;
};

interface DiscoveredCompany {
  name: string;
  atsProvider: ATSProvider;
  atsCompanyId: string;
  atsToken?: string;
  discoveryUrl?: string;
  industry?: string;
}

interface CompanyEnrichmentData {
  description?: string;
  industry?: string;
  industries?: string[];
  employeeCountMin?: number;
  employeeCountMax?: number;
  employeeCount?: string;
  fundingStage?: string;
  totalFunding?: string;
  totalFundingUsd?: number;
  lastFundingDate?: Date;
  investors?: string[];
  founded?: string;
  headquarters?: string;
  locations?: string[];
  website?: string;
  crunchbaseUrl?: string;
  linkedinUrl?: string;
  glassdoorUrl?: string;
  glassdoorRating?: number;
  growthScore?: number;
  heatScore?: number;
  companyScore?: number;
}

interface CreateCompanyInput {
  name: string;
  atsProvider: ATSProvider;
  atsCompanyId: string;
  atsToken?: string;
  industry?: string;
  size?: CompanySizeCategory;
  employeeCountMin?: number;
  employeeCountMax?: number;
  discoverySource?: string;
  discoveryUrl?: string;
}

interface CompanySearchOptions {
  atsProvider?: ATSProvider;
  status?: ExternalCompanyStatus;
  size?: CompanySizeCategory;
  industry?: string;
  minEmployees?: number;
  maxEmployees?: number;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

class ExternalCompanyService {
  private readonly CRUNCHBASE_API_URL = 'https://api.crunchbase.com/api/v4';
  private readonly GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';

  /**
   * Create a new external company record
   */
  async createCompany(input: CreateCompanyInput): Promise<any> {
    const slug = this.generateSlug(input.name);
    
    try {
      const company = await (getPrismaOrThrow() as any).externalCompany.create({
        data: {
          name: input.name,
          slug,
          atsProvider: input.atsProvider,
          atsCompanyId: input.atsCompanyId,
          atsToken: input.atsToken,
          industry: input.industry,
          size: input.size,
          employeeCountMin: input.employeeCountMin,
          employeeCountMax: input.employeeCountMax,
          discoverySource: input.discoverySource || 'manual',
          discoveryUrl: input.discoveryUrl,
          status: 'PENDING'
        }
      });
      
      console.log(`✅ Created external company: ${company.name} (${company.atsProvider})`);
      return company;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - company already exists
        const existing = await (getPrismaOrThrow() as any).externalCompany.findFirst({
          where: {
            atsProvider: input.atsProvider,
            atsCompanyId: input.atsCompanyId
          }
        });
        console.log(`ℹ️ Company already exists: ${input.name}`);
        return existing;
      }
      throw error;
    }
  }

  /**
   * Update an external company
   */
  async updateCompany(id: string, data: Partial<CreateCompanyInput & CompanyEnrichmentData>): Promise<any> {
    return (getPrismaOrThrow() as any).externalCompany.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete an external company
   */
  async deleteCompany(id: string): Promise<void> {
    await (getPrismaOrThrow() as any).externalCompany.delete({
      where: { id }
    });
    console.log(`🗑️ Deleted external company: ${id}`);
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<any> {
    return (getPrismaOrThrow() as any).externalCompany.findUnique({
      where: { id },
      include: { jobs: { where: { isActive: true }, take: 50 } }
    });
  }

  /**
   * Get company by slug
   */
  async getCompanyBySlug(slug: string): Promise<any> {
    return (getPrismaOrThrow() as any).externalCompany.findUnique({
      where: { slug },
      include: { jobs: { where: { isActive: true }, take: 50 } }
    });
  }

  /**
   * Search and list companies with filters
   */
  async searchCompanies(options: CompanySearchOptions = {}): Promise<any[]> {
    const where: Prisma.ExternalCompanyWhereInput = {};
    
    if (options.atsProvider) where.atsProvider = options.atsProvider;
    if (options.status) where.status = options.status;
    if (options.size) where.size = options.size;
    if (options.industry) where.industry = { contains: options.industry, mode: 'insensitive' };
    
    if (options.minEmployees !== undefined) {
      where.employeeCountMax = { gte: options.minEmployees };
    }
    if (options.maxEmployees !== undefined) {
      where.employeeCountMin = { lte: options.maxEmployees };
    }
    
    if (options.searchTerm) {
      where.OR = [
        { name: { contains: options.searchTerm, mode: 'insensitive' } },
        { industry: { contains: options.searchTerm, mode: 'insensitive' } },
        { description: { contains: options.searchTerm, mode: 'insensitive' } }
      ];
    }

    return (getPrismaOrThrow() as any).externalCompany.findMany({
      where,
      orderBy: { name: 'asc' },
      take: options.limit || 100,
      skip: options.offset || 0
    });
  }

  /**
   * Get all active companies for job fetching
   */
  async getActiveCompanies(atsProvider?: ATSProvider): Promise<any[]> {
    const where: Prisma.ExternalCompanyWhereInput = {
      status: 'ACTIVE'
    };
    if (atsProvider) where.atsProvider = atsProvider;
    
    return (getPrismaOrThrow() as any).externalCompany.findMany({
      where,
      orderBy: { lastJobFetchAt: 'asc' } // Oldest fetch first
    });
  }

  /**
   * Discover new Comeet companies using Google Search
   */
  async discoverComeetCompanies(query: string = 'Israel tech startup'): Promise<DiscoveredCompany[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      console.warn('⚠️ Google Search API not configured for company discovery');
      return [];
    }

    const discovered: DiscoveredCompany[] = [];
    
    try {
      // Search for Comeet job pages
      const searchQuery = `site:www.comeet.com/jobs ${query}`;
      
      const response = await axios.get(this.GOOGLE_SEARCH_API_URL, {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: searchQuery,
          num: 10
        },
        timeout: 15000
      });

      const items = response.data.items || [];
      
      for (const item of items) {
        const parsed = this.parseComeetUrl(item.link);
        if (parsed) {
          // Extract company name from title or snippet
          const name = this.extractCompanyName(item.title, item.snippet);
          
          discovered.push({
            name: name || parsed.companyId,
            atsProvider: 'COMEET',
            atsCompanyId: parsed.companyId,
            atsToken: parsed.token,
            discoveryUrl: item.link
          });
        }
      }
      
      console.log(`🔍 Discovered ${discovered.length} Comeet companies for query: ${query}`);
    } catch (error: any) {
      console.error('❌ Error discovering Comeet companies:', error.message);
    }

    return discovered;
  }

  /**
   * Run discovery and save new companies to database
   */
  async runDiscovery(queries: string[] = ['Israel tech startup', 'Israel cybersecurity', 'Israel fintech', 'Israel AI']): Promise<number> {
    let newCompaniesCount = 0;
    
    for (const query of queries) {
      const discovered = await this.discoverComeetCompanies(query);
      
      for (const company of discovered) {
        try {
          const existing = await (getPrismaOrThrow() as any).externalCompany.findFirst({
            where: {
              atsProvider: company.atsProvider,
              atsCompanyId: company.atsCompanyId
            }
          });
          
          if (!existing) {
            await this.createCompany({
              name: company.name,
              atsProvider: company.atsProvider,
              atsCompanyId: company.atsCompanyId,
              atsToken: company.atsToken,
              discoverySource: 'google_search',
              discoveryUrl: company.discoveryUrl
            });
            newCompaniesCount++;
          }
        } catch (error: any) {
          console.error(`❌ Error saving discovered company ${company.name}:`, error.message);
        }
      }
      
      // Rate limiting
      await this.sleep(1000);
    }
    
    console.log(`✅ Discovery complete. Found ${newCompaniesCount} new companies.`);
    return newCompaniesCount;
  }

  /**
   * Enrich company data from Crunchbase
   */
  async enrichFromCrunchbase(companyId: string): Promise<boolean> {
    const apiKey = process.env.CRUNCHBASE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Crunchbase API key not configured');
      return false;
    }

    const company = await (getPrismaOrThrow() as any).externalCompany.findUnique({
      where: { id: companyId }
    });
    
    if (!company) return false;

    try {
      // Search for company in Crunchbase
      const searchResponse = await axios.get(`${this.CRUNCHBASE_API_URL}/autocompletes`, {
        params: {
          query: company.name,
          collection_ids: 'organizations',
          limit: 1
        },
        headers: {
          'X-cb-user-key': apiKey
        },
        timeout: 10000
      });

      const entities = searchResponse.data.entities || [];
      if (entities.length === 0) {
        console.log(`ℹ️ No Crunchbase match for: ${company.name}`);
        return false;
      }

      const cbCompany = entities[0];
      const permalink = cbCompany.identifier?.permalink;
      
      if (!permalink) return false;

      // Fetch detailed company info
      const detailResponse = await axios.get(`${this.CRUNCHBASE_API_URL}/entities/organizations/${permalink}`, {
        params: {
          field_ids: 'short_description,founded_on,num_employees_enum,funding_total,last_funding_type,location_identifiers,website_url,linkedin,crunchbase_rank,num_funding_rounds,categories,investor_identifiers'
        },
        headers: {
          'X-cb-user-key': apiKey
        },
        timeout: 10000
      });

      const properties = detailResponse.data.properties || {};
      
      // Map Crunchbase data to our schema
      const enrichmentData: CompanyEnrichmentData = {
        description: properties.short_description,
        founded: properties.founded_on?.value?.split('-')[0],
        website: properties.website_url,
        crunchbaseUrl: `https://www.crunchbase.com/organization/${permalink}`,
        fundingStage: properties.last_funding_type,
        totalFunding: properties.funding_total?.value_usd ? `$${(properties.funding_total.value_usd / 1000000).toFixed(1)}M` : undefined,
        totalFundingUsd: properties.funding_total?.value_usd,
        industries: properties.categories?.map((c: any) => c.value) || [],
        headquarters: properties.location_identifiers?.[0]?.value
      };

      // Parse employee count
      const employeeData = this.parseEmployeeEnum(properties.num_employees_enum);
      if (employeeData) {
        enrichmentData.employeeCountMin = employeeData.min;
        enrichmentData.employeeCountMax = employeeData.max;
        enrichmentData.employeeCount = employeeData.label;
      }

      // Calculate company score
      enrichmentData.companyScore = this.calculateScore(enrichmentData, properties);

      // Update database
      await (getPrismaOrThrow() as any).externalCompany.update({
        where: { id: companyId },
        data: {
          ...enrichmentData,
          industry: enrichmentData.industries?.[0],
          size: this.deriveSize(employeeData?.max),
          lastEnrichedAt: new Date()
        }
      });

      console.log(`✅ Enriched company from Crunchbase: ${company.name}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error enriching ${company.name} from Crunchbase:`, error.message);
      return false;
    }
  }

  /**
   * Refresh all companies that need enrichment
   */
  async refreshCompanyData(maxCompanies: number = 50): Promise<number> {
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 7); // 7 days old
    
    const companies = await (getPrismaOrThrow() as any).externalCompany.findMany({
      where: {
        OR: [
          { lastEnrichedAt: null },
          { lastEnrichedAt: { lt: staleThreshold } }
        ],
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      take: maxCompanies,
      orderBy: { lastEnrichedAt: 'asc' }
    });

    let enrichedCount = 0;
    
    for (const company of companies) {
      const success = await this.enrichFromCrunchbase(company.id);
      if (success) enrichedCount++;
      
      // Rate limiting
      await this.sleep(500);
    }

    console.log(`✅ Refreshed ${enrichedCount}/${companies.length} companies`);
    return enrichedCount;
  }

  /**
   * Verify and activate a company (check if ATS credentials work)
   */
  async verifyCompany(id: string, adminUserId?: string): Promise<boolean> {
    const company = await (getPrismaOrThrow() as any).externalCompany.findUnique({
      where: { id }
    });
    
    if (!company) return false;

    try {
      // Test the ATS API
      if (company.atsProvider === 'COMEET') {
        const testUrl = `https://www.comeet.com/careers-api/2.0/company/${company.atsCompanyId}/positions`;
        const response = await axios.get(testUrl, {
          params: { token: company.atsToken, details: false },
          timeout: 10000
        });
        
        if (response.status === 200) {
          await (getPrismaOrThrow() as any).externalCompany.update({
            where: { id },
            data: {
              status: 'ACTIVE',
              isVerified: true,
              verifiedAt: new Date(),
              verifiedBy: adminUserId,
              jobFetchErrors: 0,
              lastErrorMessage: null
            }
          });
          console.log(`✅ Verified company: ${company.name}`);
          return true;
        }
      }
      
      // Mark as invalid
      await (getPrismaOrThrow() as any).externalCompany.update({
        where: { id },
        data: {
          status: 'INVALID',
          lastErrorMessage: 'Failed to verify ATS credentials'
        }
      });
      return false;
    } catch (error: any) {
      await (getPrismaOrThrow() as any).externalCompany.update({
        where: { id },
        data: {
          status: 'INVALID',
          lastErrorMessage: error.message
        }
      });
      return false;
    }
  }

  /**
   * Migrate hardcoded companies to database
   */
  async migrateHardcodedCompanies(companies: Array<{
    name: string;
    uid: string;
    token: string;
    industry?: string;
    size?: 'startup' | 'midsize' | 'enterprise';
    employeeCountMin?: number;
    employeeCountMax?: number;
  }>): Promise<number> {
    let migratedCount = 0;
    
    for (const company of companies) {
      try {
        const size = this.mapSizeToEnum(company.size);
        
        await this.createCompany({
          name: company.name,
          atsProvider: 'COMEET',
          atsCompanyId: company.uid,
          atsToken: company.token,
          industry: company.industry,
          size,
          employeeCountMin: company.employeeCountMin,
          employeeCountMax: company.employeeCountMax,
          discoverySource: 'migration'
        });
        
        migratedCount++;
      } catch (error: any) {
        console.error(`❌ Error migrating ${company.name}:`, error.message);
      }
    }
    
    console.log(`✅ Migrated ${migratedCount}/${companies.length} hardcoded companies`);
    return migratedCount;
  }

  /**
   * Get statistics about external companies
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    bySize: Record<string, number>;
    needingEnrichment: number;
  }> {
    const [total, byStatus, byProvider, bySize, needingEnrichment] = await Promise.all([
      (getPrismaOrThrow() as any).externalCompany.count(),
      (getPrismaOrThrow() as any).externalCompany.groupBy({
        by: ['status'],
        _count: true
      }),
      (getPrismaOrThrow() as any).externalCompany.groupBy({
        by: ['atsProvider'],
        _count: true
      }),
      (getPrismaOrThrow() as any).externalCompany.groupBy({
        by: ['size'],
        _count: true
      }),
      (getPrismaOrThrow() as any).externalCompany.count({
        where: {
          OR: [
            { lastEnrichedAt: null },
            { lastEnrichedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          ]
        }
      })
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byProvider: Object.fromEntries(byProvider.map(p => [p.atsProvider, p._count])),
      bySize: Object.fromEntries(bySize.filter(s => s.size).map(s => [s.size!, s._count])),
      needingEnrichment
    };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private parseComeetUrl(url: string): { companyId: string; token?: string } | null {
    // Parse URLs like: https://www.comeet.com/jobs/piiano/Piiano.007
    const match = url.match(/comeet\.com\/jobs\/([^\/]+)(?:\/([^\/\?]+))?/);
    if (match) {
      return {
        companyId: match[1],
        token: match[2]
      };
    }
    return null;
  }

  private extractCompanyName(title: string, snippet: string): string {
    // Try to extract company name from Google result
    // Title format: "Company Name - Open Positions | Comeet"
    const titleMatch = title.match(/^([^-|]+)/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    return '';
  }

  private parseEmployeeEnum(enumValue?: string): { min: number; max: number; label: string } | null {
    if (!enumValue) return null;
    
    const mappings: Record<string, { min: number; max: number; label: string }> = {
      'c_00001_00010': { min: 1, max: 10, label: '1-10' },
      'c_00011_00050': { min: 11, max: 50, label: '11-50' },
      'c_00051_00100': { min: 51, max: 100, label: '51-100' },
      'c_00101_00250': { min: 101, max: 250, label: '101-250' },
      'c_00251_00500': { min: 251, max: 500, label: '251-500' },
      'c_00501_01000': { min: 501, max: 1000, label: '501-1000' },
      'c_01001_05000': { min: 1001, max: 5000, label: '1001-5000' },
      'c_05001_10000': { min: 5001, max: 10000, label: '5001-10000' },
      'c_10001_max': { min: 10001, max: 100000, label: '10000+' }
    };
    
    return mappings[enumValue] || null;
  }

  private deriveSize(maxEmployees?: number): CompanySizeCategory | undefined {
    if (!maxEmployees) return undefined;
    if (maxEmployees <= 50) return 'STARTUP';
    if (maxEmployees <= 500) return 'MIDSIZE';
    return 'ENTERPRISE';
  }

  private mapSizeToEnum(size?: string): CompanySizeCategory | undefined {
    if (!size) return undefined;
    const mapping: Record<string, CompanySizeCategory> = {
      'startup': 'STARTUP',
      'midsize': 'MIDSIZE',
      'enterprise': 'ENTERPRISE'
    };
    return mapping[size.toLowerCase()];
  }

  private calculateScore(data: CompanyEnrichmentData, cbProperties: any): number {
    let score = 50; // Base score
    
    // Funding bonus (up to +20)
    if (data.totalFundingUsd) {
      if (data.totalFundingUsd > 100000000) score += 20;
      else if (data.totalFundingUsd > 50000000) score += 15;
      else if (data.totalFundingUsd > 10000000) score += 10;
      else if (data.totalFundingUsd > 1000000) score += 5;
    }
    
    // Growth stage bonus (up to +15)
    const stage = data.fundingStage?.toLowerCase() || '';
    if (stage.includes('ipo') || stage.includes('public')) score += 15;
    else if (stage.includes('series d') || stage.includes('series e')) score += 12;
    else if (stage.includes('series c')) score += 10;
    else if (stage.includes('series b')) score += 8;
    else if (stage.includes('series a')) score += 5;
    
    // Crunchbase rank bonus (up to +10)
    const rank = cbProperties.crunchbase_rank;
    if (rank && rank < 10000) score += 10;
    else if (rank && rank < 50000) score += 5;
    
    // Glassdoor bonus (up to +5)
    if (data.glassdoorRating) {
      score += Math.round((data.glassdoorRating - 3) * 2.5);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const externalCompanyService = new ExternalCompanyService();
export default externalCompanyService;
