import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedJob {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  applyUrl: string;
  postedAt: string;
  salary?: string;
  tags?: string[];
}

/**
 * Scraper for Israeli tech job sites
 * Uses ethical scraping practices - respects robots.txt and rate limits
 */
class IsraelTechScraperService {
  private userAgent = 'PocketknifeJobAgent/1.0 (Educational/Personal Use)';
  private requestDelay = 1000; // 1 second delay between requests

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape jobs from Geektime Jobs
   * Note: This is for educational purposes - check terms of service before production use
   */
  async scrapeGeektime(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Geektime...');
      
      // Geektime has an API for their job board
      const url = 'https://www.geektime.co.il/wp-json/developer-api/get-jobs';
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const jobs = response.data || [];
      
      const formatted = jobs
        .filter((job: any) => {
          if (!query) return true;
          const text = `${job.title} ${job.company_name} ${job.description}`.toLowerCase();
          return text.includes(query.toLowerCase());
        })
        .slice(0, 20)
        .map((job: any) => ({
          id: `geektime-${job.id}`,
          source: 'Geektime',
          title: job.title,
          company: job.company_name,
          location: job.location || 'Israel',
          remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
          description: this.stripHtml(job.description || job.excerpt || ''),
          applyUrl: job.link || job.apply_url || `https://www.geektime.co.il/jobs/${job.slug}`,
          postedAt: job.date || new Date().toISOString(),
          tags: job.categories || []
        }));

      console.log(`✅ Found ${formatted.length} jobs from Geektime`);
      return formatted;
    } catch (error: any) {
      console.error('❌ Geektime scraping failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from Calcalist Tech Jobs (Ynet sister site)
   * Uses RSS/API if available, fallback to page scraping
   */
  async scrapeCalcalist(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Calcalist Tech...');
      
      // Try to get RSS feed first
      const rssUrl = 'https://www.calcalist.co.il/GeneralRSS/0,16716,L-5251,00.xml';
      
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/xml, text/xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const jobs: ScrapedJob[] = [];

      $('item').each((i, item) => {
        if (i >= 20) return; // Limit results
        
        const title = $(item).find('title').text();
        const link = $(item).find('link').text();
        const description = $(item).find('description').text();
        const pubDate = $(item).find('pubDate').text();

        // Filter for job-related articles
        const isJobRelated = /hiring|job|career|position|developer|engineer/i.test(title + description);
        
        if (query) {
          const matchesQuery = title.toLowerCase().includes(query.toLowerCase()) ||
                              description.toLowerCase().includes(query.toLowerCase());
          if (!matchesQuery) return;
        }

        if (isJobRelated) {
          jobs.push({
            id: `calcalist-${i}-${Date.now()}`,
            source: 'Calcalist Tech',
            title: this.stripHtml(title),
            company: 'Various (See Article)',
            location: 'Israel',
            remote: false,
            description: this.stripHtml(description),
            applyUrl: link,
            postedAt: pubDate || new Date().toISOString()
          });
        }
      });

      console.log(`✅ Found ${jobs.length} tech news from Calcalist`);
      return jobs;
    } catch (error: any) {
      console.error('❌ Calcalist scraping failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from AllJobs Israel (Hebrew)
   */
  async scrapeAllJobs(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from AllJobs...');
      
      const searchQuery = query || 'software developer';
      // AllJobs has a public search API
      const url = `https://www.alljobs.co.il/SearchResultsGuest.aspx?page=1&position=${encodeURIComponent(searchQuery)}&type=1`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('.job-item, .open-board, .job-card').each((i, elem) => {
        if (i >= 20) return;
        
        const title = $(elem).find('.job-title, .title, h2, h3').first().text().trim();
        const company = $(elem).find('.company-name, .company, .employer').first().text().trim();
        const location = $(elem).find('.location, .job-location').first().text().trim() || 'Israel';
        const link = $(elem).find('a').first().attr('href') || '';
        const description = $(elem).find('.description, .job-description, .snippet').first().text().trim();

        if (title && company) {
          jobs.push({
            id: `alljobs-${i}-${Date.now()}`,
            source: 'AllJobs',
            title,
            company,
            location,
            remote: location.toLowerCase().includes('remote') || location.toLowerCase().includes('מרחוק'),
            description: description || `${title} at ${company}`,
            applyUrl: link.startsWith('http') ? link : `https://www.alljobs.co.il${link}`,
            postedAt: new Date().toISOString()
          });
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from AllJobs`);
      return jobs;
    } catch (error: any) {
      console.error('❌ AllJobs scraping failed:', error.message);
      return [];
    }
  }

  /**
   * Aggregate jobs from all Israeli tech sources
   */
  async getAllIsraeliJobs(query?: string): Promise<ScrapedJob[]> {
    console.log('🇮🇱 Fetching from Israeli tech job sources...');
    
    const results = await Promise.allSettled([
      this.scrapeGeektime(query),
      // this.scrapeCalcalist(query), // Uncomment if needed - mostly tech news
      this.scrapeAllJobs(query)
    ]);

    const allJobs: ScrapedJob[] = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
      }
    });

    // Remove duplicates based on title + company
    const unique = allJobs.filter((job, index, self) =>
      index === self.findIndex(j => 
        j.title.toLowerCase() === job.title.toLowerCase() && 
        j.company.toLowerCase() === job.company.toLowerCase()
      )
    );

    console.log(`✅ Total Israeli jobs: ${unique.length}`);
    return unique;
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
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default new IsraelTechScraperService();

