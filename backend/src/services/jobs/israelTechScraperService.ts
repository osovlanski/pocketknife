import axios from 'axios';
import * as cheerio from 'cheerio';
import { configService } from '../core/configService';

// Get timeout and delay from config with fallbacks
const SCRAPER_TIMEOUT = () => configService.get('jobs.scraper.timeoutMs', 15000);
const SCRAPER_DELAY = () => configService.get('jobs.scrapers.requestDelayMs', 1000);

/**
 * Centralized URL lookup for all scraper sources.
 * All URLs are configurable via configService (see apiDefaults.ts).
 * This eliminates hardcoded URLs scattered across 15+ methods.
 */
const scraperUrl = {
  geektime: {
    api: () => configService.get('jobs.scrapers.geektime.apiUrl', 'https://www.geektime.co.il/wp-json/developer-api/get-jobs'),
    base: () => configService.get('jobs.scrapers.geektime.baseUrl', 'https://www.geektime.co.il'),
  },
  geektimeInsider: {
    jobsApi: () => configService.get('jobs.scrapers.geektimeInsider.jobsApiUrl', 'https://insider.geektime.co.il/wp-json/app/v1/rand/jobs'),
    companyApi: () => configService.get('jobs.scrapers.geektimeInsider.companyApiUrl', 'https://insider.geektime.co.il/wp-json/app/v1/rand/company'),
    base: () => configService.get('jobs.scrapers.geektimeInsider.baseUrl', 'https://insider.geektime.co.il'),
  },
  calcalist: {
    career: () => configService.get('jobs.scrapers.calcalist.careerUrl', 'https://www.calcalist.co.il/calcalistech/category/31922'),
    tech: () => configService.get('jobs.scrapers.calcalist.techUrl', 'https://www.calcalist.co.il/calcalistech'),
    base: () => configService.get('jobs.scrapers.calcalist.baseUrl', 'https://www.calcalist.co.il'),
    rss: () => configService.get('jobs.scrapers.calcalist.rssUrls', [
      'https://www.calcalist.co.il/GeneralRSS/0,16716,L-5251,00.xml',
      'https://www.calcalist.co.il/GeneralRSS/0,16716,L-3935,00.xml'
    ]),
  },
  allJobs: {
    base: () => configService.get('jobs.scrapers.allJobs.baseUrl', 'https://www.alljobs.co.il'),
  },
  goozali: {
    api: () => configService.get('jobs.scrapers.goozali.apiUrl', 'https://script.google.com/macros/s/AKfycbwZ5m5aqYqvlvHEcjk8kQM5q8lKwfY3L3X7N4kEpB1L4qNm3YM/exec'),
    base: () => configService.get('jobs.scrapers.goozali.baseUrl', 'https://en.goozali.com'),
  },
  f6s: {
    api: () => configService.get('jobs.scrapers.f6s.apiUrl', 'https://api.f6s.com/jobs'),
    base: () => configService.get('jobs.scrapers.f6s.baseUrl', 'https://www.f6s.com'),
  },
  drushim: {
    base: () => configService.get('jobs.scrapers.drushim.baseUrl', 'https://www.drushim.co.il'),
  },
  wellfound: {
    graphql: () => configService.get('jobs.scrapers.wellfound.graphqlUrl', 'https://wellfound.com/graphql'),
    base: () => configService.get('jobs.scrapers.wellfound.baseUrl', 'https://wellfound.com'),
  },
  secretTelAviv: {
    base: () => configService.get('jobs.scrapers.secretTelAviv.baseUrl', 'https://www.secrettelaviv.com'),
  },
  hiTechJobs: {
    base: () => configService.get('jobs.scrapers.hiTechJobs.baseUrl', 'https://www.hitech-jobs.co.il'),
  },
  wallaJobs: {
    base: () => configService.get('jobs.scrapers.wallaJobs.baseUrl', 'https://jobs.walla.co.il'),
  },
  jobMaster: {
    base: () => configService.get('jobs.scrapers.jobMaster.baseUrl', 'https://www.jobmaster.co.il'),
  },
};

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
      const url = scraperUrl.geektime.api();
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: SCRAPER_TIMEOUT()
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
        .slice(0, configService.get('limits.jobs.scrapers.geektime.maxResults', 50) as number) // Increased limit for startup jobs
        .map((job: any) => ({
          id: `geektime-${job.id}`,
          source: 'Geektime',
          title: job.title,
          company: job.company_name,
          location: job.location || 'Israel',
          remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
          description: this.stripHtml(job.description || job.excerpt || ''),
          applyUrl: job.link || job.apply_url || `${scraperUrl.geektime.base()}/jobs/${job.slug}`,
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
   * Scrape hiring news and job-related articles from Calcalist Tech
   * Calcalist is a tech news site with career/hiring sections, not a job board.
   * We scrape their career category and hiring articles for job leads.
   * https://www.calcalist.co.il/calcalistech/category/31922 (career section)
   */
  async scrapeCalcalist(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching hiring news from Calcalist Tech...');

      // Scrape the career/hiring section of Calcalist Tech
      const urls = [
        scraperUrl.calcalist.career(),
        scraperUrl.calcalist.tech()
      ];

      const jobs: ScrapedJob[] = [];

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'text/html',
              'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
            },
            timeout: SCRAPER_TIMEOUT()
          });

          const $ = cheerio.load(response.data);

          // Calcalist uses article cards with various class patterns
          $('article, [class*="article"], [class*="card"], [class*="item"]').each((i, elem) => {
            if (jobs.length >= 30) return;

            const title = $(elem).find('h2, h3, h4, [class*="title"]').first().text().trim();
            const link = $(elem).find('a').first().attr('href') || '';
            const description = $(elem).find('p, [class*="description"], [class*="excerpt"], [class*="sub"]').first().text().trim();

            if (!title || title.length < 5) return;

            // Check if article is hiring/career related
            const text = `${title} ${description}`.toLowerCase();
            const hiringKeywords = /hiring|recruit|job|career|position|developer|engineer|looking for|מגייס|דרוש|גיוסים|משרה|קריירה|עובדים|הייטק.*עבודה|מחפשים/i;
            const isJobRelated = hiringKeywords.test(text);

            if (!isJobRelated) return;

            // Extract company name from title patterns like "Company X מגייסת" or "Company is hiring"
            let company = 'See Article';
            const companyMatch = title.match(/^(.+?)(?:\s+מגייס|\s+hiring|\s+is hiring|\s+looking|\s+מחפש)/i);
            if (companyMatch) {
              company = companyMatch[1].trim();
            }

            const matchesQuery = !query ||
              text.split(/\s+/).some(word =>
                query.toLowerCase().split(/\s+/).some(qw => qw.length > 2 && word.includes(qw))
              );

            if (matchesQuery) {
              jobs.push({
                id: `calcalist-${jobs.length}-${Date.now()}`,
                source: 'Calcalist Tech',
                title: this.stripHtml(title),
                company,
                location: 'Israel',
                remote: text.includes('remote') || text.includes('מרחוק'),
                description: this.stripHtml(description) || title,
                applyUrl: link.startsWith('http') ? link : `${scraperUrl.calcalist.base()}${link}`,
                postedAt: new Date().toISOString(),
                tags: ['calcalist', 'hiring-news']
              });
            }
          });

          await this.delay(500); // Rate limit between requests
        } catch (innerError: any) {
          console.debug(`⚠️ Calcalist page ${url} failed:`, innerError.message);
        }
      }

      // Also try RSS feed for additional hiring news
      if (jobs.length < 5) {
        const rssJobs = await this.scrapeCalcalistRSS(query);
        jobs.push(...rssJobs);
      }

      console.log(`✅ Found ${jobs.length} hiring articles from Calcalist Tech`);
      return jobs;
    } catch (error: any) {
      console.error('❌ Calcalist scraping failed:', error.message);
      return this.scrapeCalcalistRSS(query);
    }
  }

  /**
   * Fallback: Scrape Calcalist via RSS feed for hiring-related articles
   */
  private async scrapeCalcalistRSS(query?: string): Promise<ScrapedJob[]> {
    try {
      // Try multiple RSS feeds - tech section and general Calcalist
      const rssUrls = scraperUrl.calcalist.rss();

      const jobs: ScrapedJob[] = [];

      for (const rssUrl of rssUrls) {
        try {
          const response = await axios.get(rssUrl, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'application/xml, text/xml'
            },
            timeout: SCRAPER_TIMEOUT()
          });

          const $ = cheerio.load(response.data, { xmlMode: true });

          $('item').each((i, item) => {
            if (jobs.length >= 20) return;

            const title = $(item).find('title').text();
            const link = $(item).find('link').text();
            const description = $(item).find('description').text();
            const pubDate = $(item).find('pubDate').text();

            const text = `${title} ${description}`.toLowerCase();
            const isJobRelated = /hiring|job|career|position|developer|engineer|looking for|מגייס|דרוש|גיוסים|משרה|קריירה/i.test(text);

            if (!isJobRelated) return;

            if (query) {
              const matchesQuery = query.split(/\s+/).some(word =>
                word.length > 2 && text.includes(word.toLowerCase())
              );
              if (!matchesQuery) return;
            }

            jobs.push({
              id: `calcalist-rss-${jobs.length}-${Date.now()}`,
              source: 'Calcalist Tech',
              title: this.stripHtml(title),
              company: 'See Article',
              location: 'Israel',
              remote: false,
              description: this.stripHtml(description),
              applyUrl: link,
              postedAt: pubDate || new Date().toISOString(),
              tags: ['calcalist', 'rss', 'hiring-news']
            });
          });
        } catch (rssError: any) {
          console.debug(`⚠️ Calcalist RSS ${rssUrl} failed:`, rssError.message);
        }
      }

      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Calcalist RSS fallback failed:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Geektime Insider via their REST API
   * https://insider.geektime.co.il/
   * Uses /wp-json/app/v1/rand/jobs for random job listings
   * and /wp-json/app/v1/rand/company for company data
   */
  async scrapeGeektimeInsider(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Geektime Insider (insider.geektime.co.il)...');

      // Fetch both jobs and companies in parallel for comprehensive results
      const [jobsResponse, companiesResponse] = await Promise.allSettled([
        axios.get(scraperUrl.geektimeInsider.jobsApi(), {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
            'Referer': scraperUrl.geektimeInsider.base() + '/'
          },
          timeout: SCRAPER_TIMEOUT()
        }),
        axios.get(scraperUrl.geektimeInsider.companyApi(), {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
            'Referer': scraperUrl.geektimeInsider.base() + '/'
          },
          timeout: SCRAPER_TIMEOUT()
        })
      ]);

      const jobs: ScrapedJob[] = [];

      // Process jobs from the jobs endpoint
      if (jobsResponse.status === 'fulfilled' && jobsResponse.value.data?.posts) {
        const jobPosts = jobsResponse.value.data.posts || [];
        for (const job of jobPosts) {
          const matchesQuery = !query ||
            `${job.title} ${job.company}`.toLowerCase().split(/\s+/).some((word: string) =>
              query.toLowerCase().split(/\s+/).some(qw => qw.length > 2 && word.includes(qw))
            );

          if (matchesQuery) {
            const tagNames = (job.tags || []).map((tag: any) => tag.name).filter(Boolean);
            jobs.push({
              id: `geektime-insider-${job.id_job}`,
              source: 'Geektime Insider',
              title: job.title,
              company: job.company?.replace(/\s*–.*$/, '').trim() || 'Israeli Company',
              location: job.city || 'Israel',
              remote: (job.city || '').toLowerCase().includes('remote') ||
                      (job.city || '').toLowerCase().includes('מרחוק'),
              description: `${job.title} at ${job.company}${tagNames.length ? ` | ${tagNames.join(', ')}` : ''}`,
              applyUrl: `${scraperUrl.geektimeInsider.base()}/?company_id=${job.id_company}`,
              postedAt: new Date().toISOString(),
              tags: ['insider', ...(job.new_job ? ['new'] : []), ...tagNames]
            });
          }
        }
      }

      // Process companies to extract additional job listings
      if (companiesResponse.status === 'fulfilled' && companiesResponse.value.data?.posts) {
        const companies = companiesResponse.value.data.posts || [];
        for (const company of companies) {
          if (company.jobs > 0) {
            const companyName = company.title?.replace(/\s*–.*$/, '').trim() || 'Israeli Company';
            const matchesQuery = !query ||
              `${companyName} ${company.excerpt || ''}`.toLowerCase().includes(query.toLowerCase());

            if (matchesQuery) {
              jobs.push({
                id: `geektime-insider-co-${company.company_id}`,
                source: 'Geektime Insider',
                title: `${company.jobs} open position${company.jobs > 1 ? 's' : ''} at ${companyName}`,
                company: companyName,
                location: company.city || 'Israel',
                remote: false,
                description: this.stripHtml(company.excerpt || '') || `${companyName} - ${company.company_size || 'Tech company'}`,
                applyUrl: company.url || `${scraperUrl.geektimeInsider.base()}/?company_id=${company.company_id}`,
                postedAt: new Date().toISOString(),
                tags: ['insider', 'company-page', ...(company.company_label ? [company.company_label] : [])]
              });
            }
          }
        }
      }

      // Fallback to page scraping if API returned no results
      if (jobs.length === 0) {
        return this.scrapeGeektimeInsiderPage(query);
      }

      console.log(`✅ Found ${jobs.length} jobs from Geektime Insider`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Geektime Insider API failed, trying page scrape:', error.message);
      return this.scrapeGeektimeInsiderPage(query);
    }
  }

  /**
   * Fallback: Scrape Geektime Insider via HTML page
   */
  private async scrapeGeektimeInsiderPage(query?: string): Promise<ScrapedJob[]> {
    try {
      const url = scraperUrl.geektimeInsider.base() + '/';

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: SCRAPER_TIMEOUT()
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('[class*="job"], .card, .listing, article').each((i, elem) => {
        if (i >= 30) return;

        const title = $(elem).find('h2, h3, .title, [class*="title"]').first().text().trim();
        const company = $(elem).find('[class*="company"], .employer').first().text().trim();
        const location = $(elem).find('[class*="location"], [class*="city"]').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title && title.length > 3) {
          const matchesQuery = !query ||
            `${title} ${company}`.toLowerCase().includes(query.toLowerCase());

          if (matchesQuery) {
            jobs.push({
              id: `geektime-insider-page-${i}-${Date.now()}`,
              source: 'Geektime Insider',
              title,
              company: company || 'Israeli Startup',
              location: location || 'Israel',
              remote: location?.toLowerCase().includes('remote') || location?.toLowerCase().includes('מרחוק'),
              description: `${title} at ${company || 'Israeli Startup'}`,
              applyUrl: link.startsWith('http') ? link : `${scraperUrl.geektimeInsider.base()}${link}`,
              postedAt: new Date().toISOString(),
              tags: ['insider', 'premium']
            });
          }
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from Geektime Insider (page)`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Geektime Insider page scrape failed:', error.message);
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
      const url = `${scraperUrl.allJobs.base()}/SearchResultsGuest.aspx?page=1&position=${encodeURIComponent(searchQuery)}&type=1`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: SCRAPER_TIMEOUT()
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
            applyUrl: link.startsWith('http') ? link : `${scraperUrl.allJobs.base()}${link}`,
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
      const url = scraperUrl.goozali.api();
      
      const response = await axios.get(url, {
        params: {
          action: 'getJobs',
          limit: configService.get('limits.jobs.scrapers.geektimeInsider.limit', 50) as number
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: SCRAPER_TIMEOUT(),
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
        .slice(0, configService.get('limits.jobs.scrapers.goozali.maxResults', 30) as number)
        .map((job: any, idx: number) => ({
          id: `goozali-${job.id || idx}-${Date.now()}`,
          source: 'Goozali',
          title: job.title || job.position,
          company: job.company || job.company_name,
          location: job.location || 'Israel',
          remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
          description: job.description || `${job.title} position at ${job.company}`,
          applyUrl: job.url || job.apply_url || job.link || scraperUrl.goozali.base(),
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
      const response = await axios.get(scraperUrl.goozali.base() + '/', {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: SCRAPER_TIMEOUT()
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
              applyUrl: link.startsWith('http') ? link : `${scraperUrl.goozali.base()}${link}`,
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
      
      const url = scraperUrl.f6s.api();
      
      const response = await axios.get(url, {
        params: {
          location: 'Israel',
          limit: configService.get('limits.jobs.scrapers.f6s.limit', 30) as number
        },
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: SCRAPER_TIMEOUT(),
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
        .slice(0, configService.get('limits.jobs.scrapers.f6s.maxResults', 30) as number)
        .map((job: any, idx: number) => ({
          id: `f6s-${job.id || idx}-${Date.now()}`,
          source: 'F6S',
          title: job.title,
          company: job.company_name || job.startup_name,
          location: job.location || 'Israel',
          remote: job.remote || false,
          description: job.description || '',
          applyUrl: job.url || `${scraperUrl.f6s.base()}/jobs/${job.slug}`,
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
      const url = `${scraperUrl.drushim.base()}/jobs/search/${searchQuery}/`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: SCRAPER_TIMEOUT()
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
            applyUrl: link.startsWith('http') ? link : `${scraperUrl.drushim.base()}${link}`,
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
      const url = scraperUrl.wellfound.graphql();
      
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
        timeout: SCRAPER_TIMEOUT(),
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
          applyUrl: job.applyUrl || `${scraperUrl.wellfound.base()}/jobs/${job.id}`,
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
      
      const url = `${scraperUrl.secretTelAviv.base()}/best/jobs`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: SCRAPER_TIMEOUT()
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
              applyUrl: link.startsWith('http') ? link : `${scraperUrl.secretTelAviv.base()}${link}`,
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
      const url = `${scraperUrl.hiTechJobs.base()}/jobs?q=${searchQuery}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: SCRAPER_TIMEOUT()
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
            applyUrl: link.startsWith('http') ? link : `${scraperUrl.hiTechJobs.base()}${link}`,
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
   * Scrape jobs from Walla Jobs (major Israeli portal)
   * https://jobs.walla.co.il/
   */
  async scrapeWallaJobs(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from Walla Jobs...');

      const searchQuery = encodeURIComponent(query || 'software developer');
      const url = `${scraperUrl.wallaJobs.base()}/search?q=${searchQuery}&professional_field=2`; // 2 = hi-tech

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: SCRAPER_TIMEOUT()
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('[class*="job"], [class*="result"], [class*="listing"], article, .card').each((i, elem) => {
        if (i >= 25) return;

        const title = $(elem).find('h2, h3, [class*="title"]').first().text().trim();
        const company = $(elem).find('[class*="company"], [class*="employer"]').first().text().trim();
        const location = $(elem).find('[class*="location"], [class*="area"]').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title && title.length > 3) {
          jobs.push({
            id: `walla-${i}-${Date.now()}`,
            source: 'Walla Jobs',
            title: this.stripHtml(title),
            company: company || 'Israeli Company',
            location: location || 'Israel',
            remote: location?.toLowerCase().includes('remote') || location?.toLowerCase().includes('מרחוק'),
            description: `${title} at ${company || 'Israeli Company'}`,
            applyUrl: link.startsWith('http') ? link : `${scraperUrl.wallaJobs.base()}${link}`,
            postedAt: new Date().toISOString(),
            tags: ['walla', 'israel']
          });
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from Walla Jobs`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ Walla Jobs fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Scrape jobs from JobMaster.co.il (Israeli job board)
   * https://www.jobmaster.co.il/
   */
  async scrapeJobMaster(query?: string): Promise<ScrapedJob[]> {
    try {
      console.log('🔍 Fetching jobs from JobMaster...');

      const searchQuery = encodeURIComponent(query || 'software');
      const url = `${scraperUrl.jobMaster.base()}/code/newSearch.asp?type=FREETEXT&text=${searchQuery}&branchId=37`; // 37 = hi-tech

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        },
        timeout: SCRAPER_TIMEOUT()
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('[class*="job"], [class*="result"], .listing, article').each((i, elem) => {
        if (i >= 25) return;

        const title = $(elem).find('h2, h3, [class*="title"], [class*="name"]').first().text().trim();
        const company = $(elem).find('[class*="company"], [class*="employer"]').first().text().trim();
        const location = $(elem).find('[class*="location"], [class*="area"]').first().text().trim();
        const link = $(elem).find('a').first().attr('href') || '';

        if (title && title.length > 3) {
          jobs.push({
            id: `jobmaster-${i}-${Date.now()}`,
            source: 'JobMaster',
            title: this.stripHtml(title),
            company: company || 'Israeli Company',
            location: location || 'Israel',
            remote: location?.toLowerCase().includes('remote') || location?.toLowerCase().includes('מרחוק'),
            description: `${title} at ${company || 'Israeli Company'}`,
            applyUrl: link.startsWith('http') ? link : `${scraperUrl.jobMaster.base()}${link}`,
            postedAt: new Date().toISOString(),
            tags: ['jobmaster', 'israel']
          });
        }
      });

      console.log(`✅ Found ${jobs.length} jobs from JobMaster`);
      return jobs;
    } catch (error: any) {
      console.debug('⚠️ JobMaster fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Aggregate jobs from all Israeli tech sources
   */
  async getAllIsraeliJobs(query?: string): Promise<ScrapedJob[]> {
    console.log('🇮🇱 Fetching from Israeli tech job sources (startups focus)...');

    const results = await Promise.allSettled([
      this.scrapeGeektime(query),         // Startup-focused tech news jobs
      this.scrapeGeektimeInsider(query),  // Premium Geektime Insider jobs (insider.geektime.co.il)
      this.scrapeCalcalist(query),        // Calcalist Tech hiring news
      this.scrapeAllJobs(query),          // Major Israeli job board
      this.scrapeGoozali(query),          // Israeli tech community aggregator
      this.scrapeDrushim(query),          // Popular Israeli job board
      this.scrapeF6S(query),              // Global startup platform
      this.scrapeWellfound(query),        // AngelList/Wellfound startups
      this.scrapeSecretTelAviv(query),    // Community job board for internationals
      this.scrapeHiTechJobs(query),       // Israeli high-tech specialized board
      this.scrapeWallaJobs(query),        // Walla Jobs portal
      this.scrapeJobMaster(query)         // JobMaster.co.il
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

