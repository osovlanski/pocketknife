import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

interface CompanyInfo {
  name: string;
  description?: string;
  industry?: string;
  size?: string;
  founded?: string;
  isPublic?: boolean;
  stockSymbol?: string;
  fundingStage?: string;
  totalFunding?: string;
  employeeCount?: string;
  headquarters?: string;
  website?: string;
  growthScore?: number; // 1-10
  heatScore?: number; // 1-10 (how "hot" the company is)
}

// Cache for company info to avoid repeated API calls
const companyCache = new Map<string, CompanyInfo>();

class CompanyEnrichmentService {
  private anthropicClient: Anthropic | null = null;

  private initializeAnthropic() {
    if (this.anthropicClient) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return;
    
    this.anthropicClient = new Anthropic({ apiKey });
  }

  /**
   * Get company info from cache or fetch it
   */
  async getCompanyInfo(companyName: string): Promise<CompanyInfo | null> {
    const normalizedName = companyName.toLowerCase().trim();
    
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
   * Enrich company data using AI (fast fallback when APIs unavailable)
   */
  private async enrichCompanyData(companyName: string): Promise<CompanyInfo | null> {
    this.initializeAnthropic();

    // First, try to identify well-known companies
    const knownCompany = this.getKnownCompanyInfo(companyName);
    if (knownCompany) {
      return knownCompany;
    }

    // Use AI to get basic company info
    if (this.anthropicClient) {
      try {
        const message = await this.anthropicClient.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Provide brief factual information about the company "${companyName}" in JSON format. If you don't have reliable information, use null for unknown fields.

Return ONLY valid JSON (no markdown):
{
  "name": "${companyName}",
  "description": "1-2 sentence description of what they do",
  "industry": "main industry (e.g., SaaS, FinTech, E-commerce)",
  "size": "startup/midsize/enterprise or null",
  "founded": "year or null",
  "isPublic": true/false or null,
  "stockSymbol": "TICKER or null",
  "fundingStage": "Seed/Series A/B/C/D+/IPO/Private or null",
  "totalFunding": "$XXM or $XXB or null",
  "employeeCount": "XX-XX or null",
  "headquarters": "City, Country or null",
  "growthScore": 1-10 (estimated growth potential) or null,
  "heatScore": 1-10 (how trendy/in-demand) or null
}`
          }]
        });

        const firstBlock = message.content[0];
        const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
        const cleanText = responseText.replace(/```json|```/g, '').trim();
        
        return JSON.parse(cleanText);
      } catch (error) {
        console.warn(`Could not enrich data for ${companyName}`);
      }
    }

    return null;
  }

  /**
   * Database of well-known tech companies
   */
  private getKnownCompanyInfo(companyName: string): CompanyInfo | null {
    const name = companyName.toLowerCase();
    
    const knownCompanies: Record<string, CompanyInfo> = {
      'google': {
        name: 'Google',
        description: 'Global technology company specializing in search, cloud, AI, and advertising',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1998',
        isPublic: true,
        stockSymbol: 'GOOGL',
        employeeCount: '180,000+',
        headquarters: 'Mountain View, CA',
        growthScore: 8,
        heatScore: 9
      },
      'microsoft': {
        name: 'Microsoft',
        description: 'Technology corporation developing software, cloud services, and gaming',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1975',
        isPublic: true,
        stockSymbol: 'MSFT',
        employeeCount: '220,000+',
        headquarters: 'Redmond, WA',
        growthScore: 8,
        heatScore: 9
      },
      'amazon': {
        name: 'Amazon',
        description: 'E-commerce and cloud computing giant (AWS)',
        industry: 'E-commerce / Cloud',
        size: 'enterprise',
        founded: '1994',
        isPublic: true,
        stockSymbol: 'AMZN',
        employeeCount: '1,500,000+',
        headquarters: 'Seattle, WA',
        growthScore: 8,
        heatScore: 8
      },
      'meta': {
        name: 'Meta',
        description: 'Social media and metaverse technology company',
        industry: 'Social Media / VR',
        size: 'enterprise',
        founded: '2004',
        isPublic: true,
        stockSymbol: 'META',
        employeeCount: '86,000+',
        headquarters: 'Menlo Park, CA',
        growthScore: 7,
        heatScore: 8
      },
      'apple': {
        name: 'Apple',
        description: 'Consumer electronics and software company',
        industry: 'Technology',
        size: 'enterprise',
        founded: '1976',
        isPublic: true,
        stockSymbol: 'AAPL',
        employeeCount: '160,000+',
        headquarters: 'Cupertino, CA',
        growthScore: 7,
        heatScore: 9
      },
      'netflix': {
        name: 'Netflix',
        description: 'Streaming entertainment service',
        industry: 'Entertainment / Streaming',
        size: 'enterprise',
        founded: '1997',
        isPublic: true,
        stockSymbol: 'NFLX',
        employeeCount: '13,000+',
        headquarters: 'Los Gatos, CA',
        growthScore: 6,
        heatScore: 7
      },
      'wix': {
        name: 'Wix',
        description: 'Website builder and development platform',
        industry: 'SaaS / Web Development',
        size: 'enterprise',
        founded: '2006',
        isPublic: true,
        stockSymbol: 'WIX',
        employeeCount: '5,000+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 7,
        heatScore: 7
      },
      'monday.com': {
        name: 'Monday.com',
        description: 'Work operating system and project management platform',
        industry: 'SaaS / Productivity',
        size: 'midsize',
        founded: '2012',
        isPublic: true,
        stockSymbol: 'MNDY',
        employeeCount: '1,800+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 9,
        heatScore: 9
      },
      'checkmarx': {
        name: 'Checkmarx',
        description: 'Application security testing company',
        industry: 'Cybersecurity',
        size: 'midsize',
        founded: '2006',
        fundingStage: 'Private (acquired)',
        employeeCount: '1,000+',
        headquarters: 'Tel Aviv, Israel',
        growthScore: 7,
        heatScore: 8
      },
      'stripe': {
        name: 'Stripe',
        description: 'Online payment processing platform',
        industry: 'FinTech',
        size: 'enterprise',
        founded: '2010',
        isPublic: false,
        fundingStage: 'Series I',
        totalFunding: '$8.7B',
        employeeCount: '8,000+',
        headquarters: 'San Francisco, CA',
        growthScore: 9,
        heatScore: 10
      },
      'openai': {
        name: 'OpenAI',
        description: 'AI research and deployment company (ChatGPT, GPT-4)',
        industry: 'AI / Research',
        size: 'midsize',
        founded: '2015',
        isPublic: false,
        fundingStage: 'Series D+',
        totalFunding: '$11B+',
        employeeCount: '1,500+',
        headquarters: 'San Francisco, CA',
        growthScore: 10,
        heatScore: 10
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
        employeeCount: '500+',
        headquarters: 'San Francisco, CA',
        growthScore: 10,
        heatScore: 10
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

