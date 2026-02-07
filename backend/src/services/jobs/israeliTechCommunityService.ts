/**
 * Israeli Tech Community Service
 * 
 * Aggregates job postings from Israeli tech community sources:
 * - Telegram public channels
 * - Discord servers (via webhook monitoring)
 * - Facebook groups (via public RSS when available)
 * - Israeli tech newsletters and job boards
 * 
 * Focused on Israel-based tech communities for local job opportunities.
 * 
 * NOTE: Communities are now stored in the database (ExternalCommunity table).
 * The hardcoded fallback list is kept for initial migration and offline mode.
 */

import axios from 'axios';
import { configService } from '../core/configService';
import { communityService } from '../core/externalDataService';
import { getPrisma } from '../core/databaseService';

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

interface TelegramChannel {
  name: string;
  username: string;  // @channel_username
  description: string;
  focus: string[];  // e.g., ['software', 'startups', 'cybersecurity']
}

interface CommunitySource {
  name: string;
  type: 'telegram' | 'discord' | 'facebook' | 'newsletter' | 'jobboard';
  url: string;
  apiEndpoint?: string;
  description: string;
}

class IsraeliTechCommunityService {
  private readonly userAgent = 'PocketknifeJobAgent/1.0';

  /**
   * Get Telegram channels from database, fallback to hardcoded
   */
  async getTelegramChannelsAsync(): Promise<TelegramChannel[]> {
    try {
      const prisma = getPrisma();
      if (!prisma) return this.getFallbackTelegramChannels();
      
      const dbChannels = await (prisma as any).externalCommunity.findMany({
        where: {
          type: 'TELEGRAM',
          status: 'ACTIVE',
          country: 'IL'
        }
      });
      
      if (dbChannels.length > 0) {
        return dbChannels.map((c: any) => ({
          name: c.name,
          username: c.identifier,
          description: c.description || '',
          focus: c.focus || []
        }));
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch Telegram channels from database');
    }
    
    return this.getFallbackTelegramChannels();
  }

  /**
   * Get community sources from database, fallback to hardcoded
   */
  async getCommunitySourcesAsync(): Promise<CommunitySource[]> {
    try {
      const prisma = getPrisma();
      if (!prisma) return this.getFallbackCommunitySources();
      
      const dbSources = await (prisma as any).externalCommunity.findMany({
        where: {
          status: 'ACTIVE',
          country: 'IL',
          type: { not: 'TELEGRAM' }
        }
      });
      
      if (dbSources.length > 0) {
        return dbSources.map((c: any) => ({
          name: c.name,
          type: c.type.toLowerCase() as CommunitySource['type'],
          url: c.url || '',
          apiEndpoint: c.apiEndpoint,
          description: c.description || ''
        }));
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch community sources from database');
    }
    
    return this.getFallbackCommunitySources();
  }

  /**
   * Migrate hardcoded communities to database
   */
  async migrateToDatabase(): Promise<number> {
    const channels = this.getFallbackTelegramChannels();
    const sources = this.getFallbackCommunitySources();
    
    let count = 0;
    
    // Migrate Telegram channels
    for (const channel of channels) {
      try {
        await communityService.create({
          name: channel.name,
          type: 'TELEGRAM',
          identifier: channel.username,
          url: `https://t.me/${channel.username}`,
          description: channel.description,
          focus: channel.focus,
          country: 'IL',
          discoverySource: 'migration'
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating channel ${channel.name}:`, error.message);
        }
      }
    }
    
    // Migrate other sources
    for (const source of sources) {
      try {
        const typeMap: Record<string, any> = {
          'facebook': 'FACEBOOK',
          'discord': 'DISCORD',
          'newsletter': 'NEWSLETTER',
          'jobboard': 'JOBBOARD'
        };
        
        await communityService.create({
          name: source.name,
          type: typeMap[source.type] || 'JOBBOARD',
          identifier: source.url,
          url: source.url,
          description: source.description,
          country: 'IL',
          discoverySource: 'migration'
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating source ${source.name}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Migrated ${count} communities to database`);
    return count;
  }

  /**
   * Fallback: Known Israeli tech Telegram channels for job postings
   * These are public channels that post job opportunities
   */
  private getFallbackTelegramChannels(): TelegramChannel[] {
    return [
      {
        name: 'Israel High-Tech Jobs',
        username: 'israel_hightech_jobs',
        description: 'General Israeli tech job postings',
        focus: ['software', 'general']
      },
      {
        name: 'Israel Startups Jobs',
        username: 'israelstartupsjobs',
        description: 'Startup-focused job opportunities in Israel',
        focus: ['startups', 'software']
      },
      {
        name: 'Israeli Cyber Jobs',
        username: 'israeli_cyber_jobs',
        description: 'Cybersecurity positions in Israel',
        focus: ['cybersecurity', 'security']
      },
      {
        name: 'Dev Jobs IL',
        username: 'devjobsil',
        description: 'Developer jobs in Israel',
        focus: ['software', 'development']
      },
      {
        name: 'Tech Jobs Israel',
        username: 'techjobsisrael',
        description: 'General tech positions',
        focus: ['tech', 'general']
      }
    ];
  }

  /**
   * Fallback: Israeli tech community sources (job boards, Facebook groups, newsletters)
   * NOTE: Use getCommunitySourcesAsync() for database-first approach
   */
  private getFallbackCommunitySources(): CommunitySource[] {
    return [
      // Job Boards with APIs or RSS
      {
        name: 'Startup Nation Finder',
        type: 'jobboard',
        url: 'https://finder.startupnationcentral.org/startups',
        description: 'Israeli startup ecosystem database'
      },
      {
        name: 'Made in Israel',
        type: 'jobboard',
        url: 'https://www.madeinisrael.org/jobs',
        description: 'Israeli tech company job listings'
      },
      // Facebook Groups (public info only - no API access without auth)
      {
        name: 'Israel Tech Jobs',
        type: 'facebook',
        url: 'https://www.facebook.com/groups/israelitjobs',
        description: 'Large Israeli tech job community (requires Facebook)'
      },
      {
        name: 'High-Tech Israel',
        type: 'facebook',
        url: 'https://www.facebook.com/groups/hightech.israel',
        description: 'General high-tech community (requires Facebook)'
      },
      {
        name: 'Software Developers Israel',
        type: 'facebook',
        url: 'https://www.facebook.com/groups/softwaredevil',
        description: 'Developer community (requires Facebook)'
      },
      {
        name: 'Cybersecurity Israel',
        type: 'facebook',
        url: 'https://www.facebook.com/groups/cybersecurityisrael',
        description: 'Security professionals community (requires Facebook)'
      },
      // Discord
      {
        name: 'Israel Dev Community',
        type: 'discord',
        url: 'https://discord.gg/israel-dev',
        description: 'Israeli developer Discord server'
      },
      // Newsletters
      {
        name: 'Geektime Newsletter',
        type: 'newsletter',
        url: 'https://www.geektime.co.il/newsletter',
        description: 'Weekly Israeli tech newsletter with job section'
      },
      {
        name: 'Startup Camel',
        type: 'newsletter',
        url: 'https://www.startupcamel.com/',
        description: 'Israeli startup ecosystem newsletter'
      }
    ];
  }

  /**
   * Fetch jobs from Telegram public channels via rsshub or similar services
   * Note: Direct Telegram API requires bot token & channel access
   */
  async fetchTelegramJobs(query: string): Promise<JobListing[]> {
    const jobs: JobListing[] = [];
    // Try database first, fallback to hardcoded
    const channels = await this.getTelegramChannelsAsync();
    const timeout = configService.get('job.community.timeoutMs', 10000);

    // Filter channels by query focus
    const queryLower = query.toLowerCase();
    const relevantChannels = channels.filter(ch => 
      ch.focus.some(f => queryLower.includes(f)) || 
      queryLower.includes('developer') || 
      queryLower.includes('software') ||
      ch.focus.includes('general')
    );

    // Try to fetch from RSSHub (a public RSS generator for Telegram channels)
    // This is an alternative way to get public channel content
    for (const channel of relevantChannels.slice(0, configService.get('limits.jobs.community.discord.channels.maxResults', 3) as number)) {
      try {
        // RSSHub Telegram route: /telegram/channel/:username
        const rssUrl = `https://rsshub.app/telegram/channel/${channel.username}`;
        
        const response = await axios.get(rssUrl, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/rss+xml, application/xml'
          },
          timeout,
          validateStatus: (status) => status < 500
        });

        if (response.status !== 200) continue;

        // Parse RSS (simple regex extraction for job-related items)
        const items = this.parseRssItems(response.data, channel.name);
        
        // Filter for job-related posts
        const jobPosts = items.filter(item => 
          this.isJobPosting(item.title + ' ' + item.description, queryLower)
        );

        jobs.push(...jobPosts.slice(0, configService.get('limits.jobs.community.discord.jobs.maxResults', 10) as number));
      } catch (error: any) {
        // RSSHub may not work for all channels - silently continue
        console.debug(`⚠️ Telegram channel ${channel.name}: ${error.message}`);
      }
    }

    return jobs;
  }

  /**
   * Check if text appears to be a job posting
   */
  private isJobPosting(text: string, query: string): boolean {
    const jobIndicators = configService.get('keywords.jobs.classification.jobIndicators', [
      'looking for', 'hiring', 'opening', 'position', 'job', 'role',
      'developer', 'engineer', 'designer', 'manager', 'we\'re hiring',
      'join us', 'join our team', 'salary', 'remote', 'full-time', 'part-time',
      'משרה', 'דרושים', 'מחפשים', 'גיוס'
    ]) as string[];

    const textLower = text.toLowerCase();
    const hasJobIndicator = jobIndicators.some(ind => textLower.includes(ind));
    const matchesQuery = query.split(/\s+/).some(word => 
      word.length > 3 && textLower.includes(word)
    );

    return hasJobIndicator && (matchesQuery || query === '');
  }

  /**
   * Simple RSS parser for job items
   */
  private parseRssItems(xml: string, sourceName: string): JobListing[] {
    const items: JobListing[] = [];
    
    // Simple regex-based extraction (works for basic RSS)
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const matches = xml.match(itemRegex) || [];

    for (let i = 0; i < Math.min(matches.length, 20); i++) {
      const item = matches[i];
      
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        const title = this.stripHtml(titleMatch[1]);
        const description = descMatch ? this.stripHtml(descMatch[1]) : '';
        
        // Extract company name from description or title
        const companyMatch = description.match(/(?:at|@|in|for)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+(?:is|are|we|,|\.|-))/i);
        const company = companyMatch ? companyMatch[1].trim() : 'Various (Community Post)';

        items.push({
          id: `community-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${i}-${Date.now()}`,
          source: `Community: ${sourceName}`,
          title: title.substring(0, 100),
          company,
          location: 'Israel',
          remote: title.toLowerCase().includes('remote') || description.toLowerCase().includes('remote'),
          description: description.substring(0, 500),
          applyUrl: linkMatch[1],
          postedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
          tags: ['community', 'israel']
        });
      }
    }

    return items;
  }

  /**
   * Fetch from Startup Nation Central (Israeli startup database)
   * They have a public API for startup listings
   */
  async fetchStartupNationJobs(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching from Startup Nation Central...');
      const timeout = configService.get('job.community.timeoutMs', 10000);

      // Startup Nation Central public API
      const response = await axios.get('https://finder.startupnationcentral.org/api/v2/startups', {
        params: {
          q: query,
          hiring: true,  // Only companies that are hiring
          limit: configService.get('limits.jobs.community.startupNation.limit', 20) as number
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200 || !response.data) return [];

      const startups = response.data.results || response.data.data || [];
      
      return startups
        .filter((s: any) => s.is_hiring || s.open_positions > 0)
        .slice(0, configService.get('limits.jobs.community.lobsters.maxResults', 15) as number)
        .map((startup: any, idx: number) => ({
          id: `snc-${startup.id || idx}-${Date.now()}`,
          source: 'Startup Nation Central',
          title: `Open Positions at ${startup.name}`,
          company: startup.name,
          location: startup.location || 'Israel',
          remote: startup.remote_friendly || false,
          description: `${startup.description || ''}\n\nIndustry: ${startup.industry || 'Tech'}\nFunding: ${startup.funding_stage || 'N/A'}`,
          applyUrl: startup.careers_url || startup.website || `https://finder.startupnationcentral.org/startup/${startup.slug}`,
          postedAt: new Date().toISOString(),
          tags: [startup.industry, 'israel', 'startup'].filter(Boolean),
          companySize: this.detectSize(startup.employees),
          industry: startup.industry ? [startup.industry] : undefined
        }));
    } catch (error: any) {
      console.debug('⚠️ Startup Nation Central fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Get curated list of Israeli tech community resources
   * Returns links for manual exploration (Facebook groups, Discord, etc.)
   */
  getCommunityResources(): { name: string; url: string; type: string; description: string }[] {
    return this.getFallbackCommunitySources().map(source => ({
      name: source.name,
      url: source.url,
      type: source.type,
      description: source.description
    }));
  }

  /**
   * Get Telegram channel recommendations
   */
  getTelegramChannels_Public(): { name: string; username: string; description: string }[] {
    return this.getFallbackTelegramChannels().map(ch => ({
      name: ch.name,
      username: `@${ch.username}`,
      description: ch.description
    }));
  }

  /**
   * Aggregate jobs from all community sources
   */
  async searchAllCommunities(query: string): Promise<JobListing[]> {
    console.log('🇮🇱 Searching Israeli tech communities...');
    
    const results = await Promise.allSettled([
      this.fetchTelegramJobs(query),
      this.fetchStartupNationJobs(query)
    ]);

    const allJobs: JobListing[] = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
      }
    });

    // Deduplicate by title similarity
    const unique = allJobs.filter((job, index, self) =>
      index === self.findIndex(j => 
        this.similarityScore(j.title, job.title) > 0.8
      )
    );

    console.log(`✅ Found ${unique.length} jobs from Israeli tech communities`);
    return unique;
  }

  /**
   * Simple string similarity (Jaccard index)
   */
  private similarityScore(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  /**
   * Detect company size from employee count
   */
  private detectSize(employees?: number | string): 'startup' | 'midsize' | 'enterprise' | undefined {
    if (!employees) return undefined;
    
    const count = typeof employees === 'string' ? parseInt(employees) : employees;
    if (isNaN(count)) return undefined;
    
    if (count <= 50) return 'startup';
    if (count <= 500) return 'midsize';
    return 'enterprise';
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
}

export default new IsraeliTechCommunityService();

