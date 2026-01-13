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
          // Match if any keyword matches (more permissive for startups)
          return query.split(/\s+/).some(word => 
            word.length > 2 && text.includes(word.toLowerCase())
          );
        })
        .slice(0, 50) // Increased limit for startup jobs
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
   * Scrape jobs from Goozali (popular Israeli tech job aggregator)
   * https://www.goozali.com / https://en.goozali.com
   */
  async scrapeGoozali(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Goozali...');
      
      // Goozali aggregates jobs via Google Sheets - try their public data endpoint
      const url = 'https://script.google.com/macros/s/AKfycbwZ5m5aqYqvlvHEcjk8kQM5q8lKwfY3L3X7N4kEpB1L4qNm3YM/exec';
      
      const response = await axios.get(url, {
        params: {
          action: 'getJobs',
          limit: 50
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        console.log('⚠️ Goozali API not available, trying alternative...');
        return this.scrapeGoozaliAlternative(query);
      }

      const jobs = response.data?.jobs || response.data || [];
      
      const formatted = jobs
        .filter((job: any) => {
          if (!query) return true;
          const text = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
          return query.split(/\s+/).some(word => word.length > 2 && text.includes(word.toLowerCase()));
        })
        .slice(0, 30)
        .map((job: any, idx: number) => ({
          id: `goozali-${job.id || idx}-${Date.now()}`,
          source: 'Goozali',
          title: job.title || job.position,
          company: job.company || job.company_name,
          location: job.location || 'Israel',
          remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
          description: job.description || `${job.title} position at ${job.company}`,
          applyUrl: job.url || job.apply_url || job.link || 'https://en.goozali.com',
          postedAt: job.date || job.posted_at || new Date().toISOString(),
          tags: ['startup', 'israel', ...(job.tags || [])]
        }));

      console.log(`✅ Found ${formatted.length} jobs from Goozali`);
      return formatted;
    } catch (error: any) {
      console.error('❌ Goozali fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Alternative Goozali scraping via their website
   */
  private async scrapeGoozaliAlternative(query?: string): Promise<ScrapedJob[]> {
    try {
      // Goozali main website
      const response = await axios.get('https://en.goozali.com/', {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      // Parse job cards from the page
      $('[class*="job"], [class*="position"], .card, .listing').each((i, elem) => {
        if (i >= 30) return;
        
        const title = $(elem).find('h2, h3, .title, [class*="title"]').first().text().trim();
        const company = $(elem).find('[class*="company"], .employer').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title && (company || link)) {
          const matchesQuery = !query || 
            `${title} ${company}`.toLowerCase().includes(query.toLowerCase());
          
          if (matchesQuery) {
            jobs.push({
              id: `goozali-alt-${i}-${Date.now()}`,
              source: 'Goozali',
              title,
              company: company || 'Israeli Startup',
              location: 'Israel',
              remote: false,
              description: `${title} position at ${company || 'Israeli Startup'}`,
              applyUrl: link.startsWith('http') ? link : `https://en.goozali.com${link}`,
              postedAt: new Date().toISOString(),
              tags: ['startup', 'israel']
            });
          }
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from Goozali (alternative)`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Goozali alternative also failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from F6S (global startup platform with Israeli startups)
   * https://www.f6s.com/jobs/jobs-in-israel
   */
  async scrapeF6S(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from F6S...');
      
      const url = 'https://api.f6s.com/jobs';
      
      const response = await axios.get(url, {
        params: {
          location: 'Israel',
          limit: 30
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200 || !response.data) {
        console.log('⚠️ F6S API not publicly available');
        return [];
      }

      const jobs = response.data.jobs || response.data || [];
      
      const formatted = jobs
        .filter((job: any) => {
          if (!query) return true;
          const text = `${job.title} ${job.company_name} ${job.description}`.toLowerCase();
          return query.split(/\s+/).some(word => word.length > 2 && text.includes(word.toLowerCase()));
        })
        .slice(0, 30)
        .map((job: any, idx: number) => ({
          id: `f6s-${job.id || idx}-${Date.now()}`,
          source: 'F6S',
          title: job.title,
          company: job.company_name || job.startup_name,
          location: job.location || 'Israel',
          remote: job.remote || false,
          description: job.description || '',
          applyUrl: job.url || `https://www.f6s.com/jobs/${job.slug}`,
          postedAt: job.created_at || new Date().toISOString(),
          tags: ['startup', 'f6s', ...(job.tags || [])]
        }));

      console.log(`✅ Found ${formatted.length} jobs from F6S`);
      return formatted;
    } catch (error: any) {
      console.debug('⚠️ F6S fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from Drushim.co.il (major Israeli job board)
   */
  async scrapeDrushim(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Drushim...');
      
      const searchQuery = encodeURIComponent(query || 'software developer');
      const url = `https://www.drushim.co.il/jobs/search/${searchQuery}/`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      // Parse job cards
      $('[class*="job-item"], .job-card, .result-item, [data-job-id]').each((i, elem) => {
        if (i >= 30) return;
        
        const title = $(elem).find('h2, h3, .job-title, [class*="title"]').first().text().trim();
        const company = $(elem).find('.company, .employer, [class*="company"]').first().text().trim();
        const location = $(elem).find('.location, [class*="location"]').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title) {
          jobs.push({
            id: `drushim-${i}-${Date.now()}`,
            source: 'Drushim',
            title,
            company: company || 'Company Name Hidden',
            location: location || 'Israel',
            remote: location?.toLowerCase().includes('מרחוק') || location?.toLowerCase().includes('remote'),
            description: `${title} at ${company || 'Israeli Company'}`,
            applyUrl: link.startsWith('http') ? link : `https://www.drushim.co.il${link}`,
            postedAt: new Date().toISOString(),
            tags: ['israel', 'drushim']
          });
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from Drushim`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Drushim fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from Wellfound (formerly AngelList Talent)
   * Great for startup jobs
   * https://wellfound.com/location/israel
   */
  async scrapeWellfound(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Wellfound (AngelList)...');
      
      // Wellfound GraphQL API endpoint
      const url = 'https://wellfound.com/graphql';
      
      const response = await axios.post(url, {
        operationName: 'JobSearchResults',
        variables: {
          page: 1,
          perPage: 30,
          locations: ['Israel', 'Tel Aviv'],
          query: query || 'software engineer'
        },
        query: `query JobSearchResults($page: Int, $perPage: Int, $locations: [String], $query: String) {
          talent { jobListings(page: $page, perPage: $perPage, locations: $locations, query: $query) {
            edges { node { id title company { name } remoteOk locationNames description applyUrl postedAt } }
          }}
        }`
      }, {
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200 || !response.data?.data) {
        console.log('⚠️ Wellfound GraphQL not publicly available');
        return [];
      }

      const edges = response.data.data?.talent?.jobListings?.edges || [];
      
      const jobs = edges.map((edge: any, idx: number) => {
        const job = edge.node;
        return {
          id: `wellfound-${job.id || idx}-${Date.now()}`,
          source: 'Wellfound',
          title: job.title,
          company: job.company?.name || 'Startup',
          location: job.locationNames?.join(', ') || 'Israel',
          remote: job.remoteOk || false,
          description: job.description || '',
          applyUrl: job.applyUrl || `https://wellfound.com/jobs/${job.id}`,
          postedAt: job.postedAt || new Date().toISOString(),
          tags: ['startup', 'wellfound']
        };
      });

      console.log(`✅ Found ${jobs.length} jobs from Wellfound`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Wellfound fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from Secret Tel Aviv Jobs
   * Community-driven job board for internationals in Israel
   * https://www.secrettelaviv.com/best/jobs
   */
  async scrapeSecretTelAviv(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Secret Tel Aviv...');
      
      const url = 'https://www.secrettelaviv.com/best/jobs';
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      // Parse job listings
      $('[class*="job"], [class*="listing"], .post, article').each((i, elem) => {
        if (i >= 30) return;
        
        const title = $(elem).find('h2, h3, .title, [class*="title"]').first().text().trim();
        const company = $(elem).find('[class*="company"], .author, .employer').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';
        const description = $(elem).find('p, .excerpt, .description').first().text().trim();

        if (title && title.length > 5) {
          // Filter by query if provided
          const matchesQuery = !query || 
            `${title} ${company} ${description}`.toLowerCase().includes(query.toLowerCase());
          
          if (matchesQuery) {
            jobs.push({
              id: `secrettlv-${i}-${Date.now()}`,
              source: 'Secret Tel Aviv',
              title,
              company: company || 'Company in Israel',
              location: 'Tel Aviv, Israel',
              remote: title.toLowerCase().includes('remote') || description.toLowerCase().includes('remote'),
              description: description || `${title} position`,
              applyUrl: link.startsWith('http') ? link : `https://www.secrettelaviv.com${link}`,
              postedAt: new Date().toISOString(),
              tags: ['tel-aviv', 'international', 'community']
            });
          }
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from Secret Tel Aviv`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Secret Tel Aviv fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape from HiTech Jobs Israel
   * Specialized Israeli high-tech job board
   */
  async scrapeHiTechJobs(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from HiTech Jobs Israel...');
      
      const searchQuery = encodeURIComponent(query || 'software developer');
      const url = `https://www.hitech-jobs.co.il/jobs?q=${searchQuery}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('[class*="job"], .listing, .result-item').each((i, elem) => {
        if (i >= 30) return;
        
        const title = $(elem).find('h2, h3, .job-title, [class*="title"]').first().text().trim();
        const company = $(elem).find('.company, [class*="company"]').first().text().trim();
        const location = $(elem).find('.location, [class*="location"]').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title) {
          jobs.push({
            id: `hitechjobs-${i}-${Date.now()}`,
            source: 'HiTech Jobs IL',
            title,
            company: company || 'Israeli Tech Company',
            location: location || 'Israel',
            remote: location?.toLowerCase().includes('remote') || location?.toLowerCase().includes('מרחוק'),
            description: `${title} at ${company || 'Israeli Tech Company'}`,
            applyUrl: link.startsWith('http') ? link : `https://www.hitech-jobs.co.il${link}`,
            postedAt: new Date().toISOString(),
            tags: ['israel', 'hitech']
          });
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from HiTech Jobs Israel`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ HiTech Jobs Israel fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Aggregate jobs from all Israeli tech sources
   */
  async getAllIsraeliJobs(query?: string): Promise<ScrapedJob[]> {
    console.log('🇮🇱 Fetching from Israeli tech job sources (startups focus)...');
    
    const results = await Promise.allSettled([
      this.scrapeGeektime(query),       // Startup-focused tech news jobs
      this.scrapeAllJobs(query),        // Major Israeli job board
      this.scrapeGoozali(query),        // Israeli tech community aggregator
      this.scrapeDrushim(query),        // Popular Israeli job board
      this.scrapeF6S(query),            // Global startup platform
      this.scrapeWellfound(query),      // AngelList/Wellfound startups
      this.scrapeSecretTelAviv(query),  // Community job board for internationals
      this.scrapeHiTechJobs(query)      // Israeli high-tech specialized board
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

    console.log(`✅ Total Israeli startup jobs: ${unique.length}`);
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

