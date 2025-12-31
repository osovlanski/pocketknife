import axios from 'axios';
import additionalJobAPIs from './additionalJobAPIs';
import israeliJobsService from './israeliJobsService';

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

interface SearchOptions {
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  radius?: number; // in km
  companySize?: 'startup' | 'midsize' | 'enterprise' | 'any';
  industry?: 'fintech' | 'cybersecurity' | 'healthtech' | 'ecommerce' | 'saas' | 'ai' | 'gaming' | 'any';
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'any';
  jobType?: 'fulltime' | 'contract' | 'freelance' | 'internship' | 'any';
}

class JobSourceService {
  /**
   * Detect company size from job description or company name
   */
  private detectCompanySize(job: any): 'startup' | 'midsize' | 'enterprise' | undefined {
    const text = `${job.company} ${job.description}`.toLowerCase();
    
    // Enterprise indicators
    if (text.match(/fortune (500|1000)|enterprise|global leader|multinational|10000\+ employees|established (19|20)\d{2}/)) {
      return 'enterprise';
    }
    
    // Startup indicators
    if (text.match(/startup|early.stage|seed funded|series [abc]|founded 20(1[5-9]|2[0-5])|50.employees|stealth mode/)) {
      return 'startup';
    }
    
    // Mid-size indicators
    if (text.match(/scale.up|growing (company|team)|series [def]|established company|500.employees/)) {
      return 'midsize';
    }
    
    return undefined;
  }

  /**
   * Detect industry from job description and title
   */
  private detectIndustry(job: any): string[] {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const industries: string[] = [];
    
    if (text.match(/fintech|financial technology|banking|payments|trading|cryptocurrency|blockchain/)) {
      industries.push('fintech');
    }
    if (text.match(/cyber.?security|security engineer|penetration test|soc analyst|threat|vulnerability/)) {
      industries.push('cybersecurity');
    }
    if (text.match(/health.?tech|medical|healthcare|telemedicine|biotech|pharmaceutical/)) {
      industries.push('healthtech');
    }
    if (text.match(/e.?commerce|retail|marketplace|shopify|woocommerce|online store/)) {
      industries.push('ecommerce');
    }
    if (text.match(/\bsaas\b|software as a service|b2b software|enterprise software|cloud platform/)) {
      industries.push('saas');
    }
    if (text.match(/\bai\b|machine learning|artificial intelligence|deep learning|nlp|computer vision|llm/)) {
      industries.push('ai');
    }
    if (text.match(/gaming|game dev|unity|unreal|playstation|xbox|mobile games/)) {
      industries.push('gaming');
    }
    
    return industries;
  }

  /**
   * Detect experience level from title and description
   */
  private detectExperienceLevel(job: any): 'junior' | 'mid' | 'senior' | undefined {
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    // Senior level
    if (text.match(/\b(senior|sr\.|lead|principal|staff|architect|head of|director)\b/)) {
      return 'senior';
    }
    
    // Junior level
    if (text.match(/\b(junior|jr\.|entry.level|graduate|intern|associate)\b/)) {
      return 'junior';
    }
    
    // Mid level (or check for years of experience)
    if (text.match(/\b(mid.level|intermediate|3.5 years|4.6 years)\b/)) {
      return 'mid';
    }
    
    // Check years of experience in description
    const yearsMatch = text.match(/(\d+)[\s\-+]*years?.*experience/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years <= 2) return 'junior';
      if (years <= 5) return 'mid';
      return 'senior';
    }
    
    return undefined;
  }

  /**
   * Detect job type from title and description
   */
  private detectJobType(job: any): 'fulltime' | 'contract' | 'freelance' | 'internship' | undefined {
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (text.match(/\b(internship|intern)\b/)) {
      return 'internship';
    }
    if (text.match(/\b(freelance|freelancer|independent contractor)\b/)) {
      return 'freelance';
    }
    if (text.match(/\b(contract|contractor|temporary|temp|fixed.term)\b/)) {
      return 'contract';
    }
    if (text.match(/\b(full.time|full time|permanent|employee)\b/)) {
      return 'fulltime';
    }
    
    // Default to full-time if not specified
    return 'fulltime';
  }

  /**
   * Enrich job listing with detected metadata
   */
  private enrichJobListing(job: JobListing): JobListing {
    return {
      ...job,
      companySize: this.detectCompanySize(job),
      industry: this.detectIndustry(job),
      experienceLevel: this.detectExperienceLevel(job),
      jobType: this.detectJobType(job)
    };
  }

  /**
   * Filter jobs by advanced criteria
   */
  private filterJobs(jobs: JobListing[], options: SearchOptions): JobListing[] {
    return jobs.filter(job => {
      // Remote filter - more strict
      if (options.remoteOnly === true) {
        // Only include jobs that are explicitly remote
        if (!job.remote) {
          return false;
        }
      } else if (options.remoteOnly === false) {
        // Only include NON-remote jobs (office-based)
        if (job.remote) {
          return false;
        }
      }
      
      // Location filter with proximity check
      if (options.location && !options.remoteOnly) {
        const jobLocation = job.location.toLowerCase();
        const searchLocation = options.location.toLowerCase();
        
        // Skip if job is marked as "Remote" but we want office jobs
        if (jobLocation.includes('remote') && options.remoteOnly === false) {
          return false;
        }
        
        // Check if locations match (city, state, or country)
        const locationParts = searchLocation.split(',').map(s => s.trim());
        const hasMatch = locationParts.some(part => {
          if (part.length < 3) return false; // Skip short abbreviations
          return jobLocation.includes(part);
        });
        
        if (!hasMatch && !jobLocation.includes('remote')) {
          return false;
        }
      }
      
      // Company size filter
      if (options.companySize && options.companySize !== 'any') {
        if (!job.companySize || job.companySize !== options.companySize) {
          return false;
        }
      }
      
      // Industry filter
      if (options.industry && options.industry !== 'any') {
        if (!job.industry || !job.industry.includes(options.industry)) {
          return false;
        }
      }
      
      // Experience level filter
      if (options.experienceLevel && options.experienceLevel !== 'any') {
        if (!job.experienceLevel || job.experienceLevel !== options.experienceLevel) {
          return false;
        }
      }
      
      // Job type filter
      if (options.jobType && options.jobType !== 'any') {
        if (!job.jobType || job.jobType !== options.jobType) {
          return false;
        }
      }
      
      // Salary filter (if salary information available)
      if (options.salaryMin || options.salaryMax) {
        if (!job.salary) return false;
        
        // Extract numeric salary values
        const salaryNumbers = job.salary.match(/\d+[\d,]*/g);
        if (salaryNumbers && salaryNumbers.length > 0) {
          const minSalary = parseInt(salaryNumbers[0].replace(/,/g, ''));
          
          if (options.salaryMin && minSalary < options.salaryMin) {
            return false;
          }
          if (options.salaryMax && minSalary > options.salaryMax) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  /**
   * Smart keyword matching that considers seniority and relevance
   * Enhanced algorithm with fuzzy matching and synonym support
   */
  private matchesQuery(text: string, query: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Common synonyms and variations
    const synonyms: Record<string, string[]> = {
      'developer': ['developer', 'engineer', 'programmer', 'coder', 'software engineer'],
      'frontend': ['frontend', 'front-end', 'front end', 'ui', 'client-side'],
      'backend': ['backend', 'back-end', 'back end', 'server-side', 'api'],
      'fullstack': ['fullstack', 'full-stack', 'full stack', 'frontend and backend'],
      'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter'],
      'devops': ['devops', 'sre', 'site reliability', 'infrastructure'],
      'data': ['data', 'analytics', 'data science', 'ml', 'machine learning'],
      'security': ['security', 'cybersecurity', 'infosec', 'appsec'],
      'manager': ['manager', 'lead', 'head of', 'director', 'vp'],
      'javascript': ['javascript', 'js', 'node', 'nodejs', 'typescript', 'ts'],
      'python': ['python', 'py', 'django', 'flask'],
      'java': ['java', 'spring', 'kotlin'],
      'react': ['react', 'reactjs', 'react.js'],
      'angular': ['angular', 'angularjs'],
      'vue': ['vue', 'vuejs', 'vue.js']
    };
    
    // Extract seniority level from query
    const seniorityLevels = ['senior', 'sr.', 'sr', 'lead', 'principal', 'staff', 'architect', 'expert'];
    const midLevels = ['mid', 'mid-level', 'intermediate', 'experienced'];
    const juniorLevels = ['junior', 'jr.', 'jr', 'entry', 'entry-level', 'graduate', 'associate'];
    
    const querySeniority = seniorityLevels.some(s => lowerQuery.includes(s)) ? 'senior' :
                           midLevels.some(s => lowerQuery.includes(s)) ? 'mid' :
                           juniorLevels.some(s => lowerQuery.includes(s)) ? 'junior' : null;
    
    // If query specifies seniority, job must have matching or higher seniority
    if (querySeniority === 'senior') {
      const hasSeniority = seniorityLevels.some(s => lowerText.includes(s));
      if (!hasSeniority) return false;
    } else if (querySeniority === 'junior') {
      // For junior positions, exclude senior roles
      const hasSenior = seniorityLevels.some(s => lowerText.includes(s));
      if (hasSenior) return false;
    }
    
    // Extract key role words with synonyms
    const roleWords = ['developer', 'engineer', 'architect', 'programmer', 'software', 'designer', 'analyst', 'manager'];
    const queryRoles = roleWords.filter(role => lowerQuery.includes(role));
    
    // Check if job matches any role word (including synonyms)
    if (queryRoles.length > 0) {
      const hasRole = queryRoles.some(role => {
        const variants = synonyms[role] || [role];
        return variants.some(variant => lowerText.includes(variant));
      });
      if (!hasRole) return false;
    }
    
    // Extract technology/specialization words
    const stopWords = ['and', 'or', 'the', 'for', 'with', 'job', 'position', 'role'];
    const techWords = lowerQuery
      .split(/[\s,\/]+/)
      .filter(word => 
        word.length > 2 && 
        !seniorityLevels.includes(word) && 
        !midLevels.includes(word) && 
        !juniorLevels.includes(word) &&
        !roleWords.includes(word) &&
        !stopWords.includes(word)
      );
    
    // Job should match at least some tech words (with synonym support)
    if (techWords.length > 0) {
      let matchedCount = 0;
      
      techWords.forEach(word => {
        // Check direct match
        if (lowerText.includes(word)) {
          matchedCount++;
          return;
        }
        
        // Check synonyms
        const variants = synonyms[word] || [];
        if (variants.some(variant => lowerText.includes(variant))) {
          matchedCount++;
        }
      });
      
      const matchRatio = matchedCount / techWords.length;
      return matchRatio >= 0.25; // At least 25% match (more lenient)
    }
    
    return true;
  }

  /**
   * Fetch jobs from RemoteOK API (FREE, unlimited)
   */
  async fetchRemoteOK(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from RemoteOK...');
      const response = await axios.get('https://remoteok.com/api', {
        headers: {
          'User-Agent': 'JobSearchAgent/1.0'
        }
      });

      const jobs = response.data.slice(1); // First item is metadata
      
      const filtered = jobs
        .filter((job: any) => {
          const searchText = `${job.position} ${job.description}`.toLowerCase();
          return this.matchesQuery(searchText, query);
        })
        .slice(0, 20)
        .map((job: any) => {
          // Safely parse date
          let postedAt = new Date().toISOString();
          if (job.date && typeof job.date === 'number' && job.date > 0) {
            try {
              const dateObj = new Date(job.date * 1000);
              if (!isNaN(dateObj.getTime())) {
                postedAt = dateObj.toISOString();
              }
            } catch (e) {
              // Use default date
            }
          }

          return {
            id: `remoteok-${job.id}`,
            source: 'RemoteOK',
            title: job.position,
            company: job.company,
            location: job.location || 'Remote',
            remote: true,
            description: job.description,
            applyUrl: job.url,
            salary: job.salary_min && job.salary_max 
              ? `$${job.salary_min}k - $${job.salary_max}k` 
              : undefined,
            postedAt,
            tags: job.tags
          };
        });

      console.log(`✅ Found ${filtered.length} jobs from RemoteOK`);
      return filtered;
    } catch (error) {
      console.error('❌ Error fetching from RemoteOK:', error);
      return [];
    }
  }

  /**
   * Fetch jobs from Remotive API (FREE, 100 requests/day)
   * API: https://remotive.com/api/remote-jobs
   */
  async fetchRemotive(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from Remotive...');
      const response = await axios.get('https://remotive.com/api/remote-jobs', {
        headers: {
          'User-Agent': 'JobSearchAgent/1.0'
        }
      });

      const jobs = response.data.jobs || [];
      
      const filtered = jobs
        .filter((job: any) => {
          const searchText = `${job.title} ${job.description} ${job.category}`.toLowerCase();
          return this.matchesQuery(searchText, query);
        })
        .slice(0, 20)
        .map((job: any) => ({
          id: `remotive-${job.id}`,
          source: 'Remotive',
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || 'Remote',
          remote: true,
          description: job.description,
          applyUrl: job.url,
          salary: job.salary || undefined,
          postedAt: job.publication_date,
          tags: [job.category, job.job_type].filter(Boolean)
        }));

      console.log(`✅ Found ${filtered.length} jobs from Remotive`);
      return filtered;
    } catch (error) {
      console.error('❌ Error fetching from Remotive:', error);
      return [];
    }
  }

  /**
   * Fetch jobs from JSearch API (aggregates LinkedIn, Glassdoor, Indeed, ZipRecruiter)
   * FREE tier: 150 requests/month, Basic: $10/month for 1000 requests
   * Sign up: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
   */
  async fetchJSearch(query: string, location?: string): Promise<JobListing[]> {
    try {
      if (!process.env.RAPIDAPI_KEY) {
        console.log('ℹ️ JSearch API key not configured. Skipping JSearch...');
        return [];
      }

      console.log('🔍 Fetching jobs from JSearch (LinkedIn, Glassdoor, Indeed)...');
      
      // Clean API key (remove any quotes)
      const apiKey = process.env.RAPIDAPI_KEY.replace(/['"]/g, '');
      
      // Build search query - be more specific for better LinkedIn results
      const searchQuery = location ? `${query} in ${location}` : query;
      
      // Try multiple search strategies for better LinkedIn coverage
      const searches = [
        {
          query: searchQuery,
          page: '1',
          num_pages: '1',
          date_posted: 'month', // Last month instead of 'all' for fresher results
          remote_jobs_only: location ? 'false' : 'false', // Changed to false to get more results
          employment_types: 'FULLTIME,CONTRACTOR,PARTTIME'
        }
      ];
      
      const allResults: JobListing[] = [];
      
      for (const searchParams of searches) {
        try {
          const response = await axios.get(
            'https://jsearch.p.rapidapi.com/search',
            {
              params: searchParams,
              headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
              },
              timeout: 20000 // Increased timeout to 20 seconds
            }
          );

          const jobs = response.data.data || [];
          
          console.log(`📊 JSearch returned ${jobs.length} raw jobs`);
          
          // Log sample job for debugging
          if (jobs.length > 0) {
            console.log(`📋 Sample job: ${jobs[0].job_title} at ${jobs[0].employer_name} (${jobs[0].job_publisher})`);
          }
          
          const formatted = jobs.slice(0, 30).map((job: any) => {
            // Safely parse salary
            let salary = undefined;
            if (job.job_min_salary && job.job_max_salary) {
              const currency = job.job_salary_currency || 'USD';
              const period = job.job_salary_period || 'YEAR';
              const min = Math.round(job.job_min_salary);
              const max = Math.round(job.job_max_salary);
              salary = `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}/${period}`;
            } else if (job.job_salary) {
              salary = job.job_salary;
            }

            // Build comprehensive description from all available fields
            const descriptionParts = [
              job.job_description || '',
              job.job_highlights?.Qualifications?.join(', ') || '',
              job.job_highlights?.Responsibilities?.join(', ') || '',
              job.job_highlights?.Benefits?.join(', ') || ''
            ].filter(Boolean);

            return {
              id: `jsearch-${job.job_id}`,
              source: job.job_publisher || 'JSearch',
              title: job.job_title,
              company: job.employer_name,
              location: job.job_city && job.job_country 
                ? `${job.job_city}, ${job.job_country}` 
                : job.job_country || job.job_location || 'Remote',
              remote: job.job_is_remote || job.job_location?.toLowerCase().includes('remote') || false,
              description: descriptionParts.join('\n\n'),
              applyUrl: job.job_apply_link || job.job_google_link,
              salary,
              postedAt: job.job_posted_at_datetime_utc || new Date().toISOString(),
              tags: [
                ...(job.job_required_skills || []),
                ...(job.job_employment_type ? [job.job_employment_type] : [])
              ].filter(Boolean)
            };
          });

          allResults.push(...formatted);
        } catch (searchError: any) {
          console.error('❌ JSearch search failed:', searchError.message);
        }
      }

      console.log(`✅ Found ${allResults.length} jobs from JSearch`);
      return allResults;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('❌ JSearch rate limit exceeded. Upgrade plan or wait.');
      } else if (error.code === 'ECONNABORTED') {
        console.error('❌ JSearch request timeout - API is slow or down');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('❌ JSearch authentication failed - check your RAPIDAPI_KEY');
      } else {
        console.error('❌ Error fetching from JSearch:', error.message);
      }
      return [];
    }
  }

  /**
   * Fetch jobs from Adzuna API (supports many countries including Israel)
   * FREE tier available with generous limits
   * Sign up: https://developer.adzuna.com/
   */
  async fetchAdzuna(query: string, location?: string): Promise<JobListing[]> {
    try {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.log('ℹ️ Adzuna API credentials not configured. Skipping Adzuna...');
        return [];
      }

      console.log('🔍 Fetching jobs from Adzuna...');
      
      // Clean API credentials (remove any quotes)
      const appId = process.env.ADZUNA_APP_ID.replace(/['"]/g, '');
      const appKey = process.env.ADZUNA_APP_KEY.replace(/['"]/g, '');
      
      // Determine country code - Adzuna doesn't support Israel, use US/GB instead
      // Supported: at, au, be, br, ca, ch, de, es, fr, gb, in, it, mx, nl, nz, pl, sg, us, za
      let countryCode = 'us';
      if (location?.toLowerCase().includes('uk') || location?.toLowerCase().includes('london')) {
        countryCode = 'gb';
      } else if (location?.toLowerCase().includes('canada')) {
        countryCode = 'ca';
      } else if (location?.toLowerCase().includes('germany')) {
        countryCode = 'de';
      } else if (location?.toLowerCase().includes('israel') || location?.toLowerCase().includes('tel aviv')) {
        countryCode = 'il';
      }
      else{
        console.log(`ℹ️ Adzuna does not support Country ${countryCode}. Skipping...`);
        return [];
      }

      const response = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
        {
          params: {
            app_id: appId,
            app_key: appKey,
            what: query,
            where: location || '',
            results_per_page: 20,
            sort_by: 'relevance'
          },
          timeout: 15000
        }
      );

      const jobs = response.data.results || [];
      
      const formatted = jobs.map((job: any) => {
        let salary = undefined;
        if (job.salary_min && job.salary_max) {
          const currency = countryCode === 'il' ? '₪' : '$';
          salary = `${currency}${job.salary_min.toLocaleString()} - ${currency}${job.salary_max.toLocaleString()}`;
        }

        return {
          id: `adzuna-${job.id}`,
          source: 'Adzuna',
          title: job.title,
          company: job.company.display_name,
          location: job.location.display_name,
          remote: job.location.display_name.toLowerCase().includes('remote'),
          description: job.description,
          applyUrl: job.redirect_url,
          salary,
          postedAt: job.created,
          tags: job.category?.tag ? [job.category.tag] : []
        };
      });

      console.log(`✅ Found ${formatted.length} jobs from Adzuna`);
      return formatted;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.error('❌ Adzuna API endpoint not found - check APP_ID and APP_KEY');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('❌ Adzuna authentication failed - check credentials');
      } else if (error.code === 'ECONNABORTED') {
        console.error('❌ Adzuna request timeout - API is slow or down');
      } else {
        console.error('❌ Error fetching from Adzuna:', error.message);
      }
      return [];
    }
  }

  /**
   * Fetch jobs from Arbeitnow API (FREE, unlimited, works globally)
   * No API key required, supports all locations including Israel
   * API: https://arbeitnow.com/api/job-board-api
   */
  async fetchArbeitnow(query: string): Promise<JobListing[]> {
    try {
      console.log('🔍 Fetching jobs from Arbeitnow...');
      
      const response = await axios.get(
        'https://www.arbeitnow.com/api/job-board-api',
        {
          timeout: 15000
        }
      );

      const jobs = response.data.data || [];
      
      // Filter by query keywords
      const filtered = jobs
        .filter((job: any) => {
          const text = `${job.title} ${job.description}`.toLowerCase();
          return this.matchesQuery(text, query);
        })
        .slice(0, 20);
      
      const formatted = filtered.map((job: any) => ({
        id: `arbeitnow-${job.slug}`,
        source: 'Arbeitnow',
        title: job.title,
        company: job.company_name,
        location: job.location || 'Remote',
        remote: job.remote || false,
        description: job.description,
        applyUrl: job.url,
        postedAt: job.created_at,
        tags: job.tags || []
      }));

      console.log(`✅ Found ${formatted.length} jobs from Arbeitnow`);
      return formatted;
    } catch (error: any) {
      console.error('❌ Error fetching from Arbeitnow:', error.message);
      return [];
    }
  }

  /**
   * Filter jobs by location
   */
  filterByLocation(jobs: JobListing[], userLocation?: string, remoteOnly?: boolean): JobListing[] {
    if (remoteOnly) {
      return jobs.filter(job => job.remote);
    }

    if (!userLocation) {
      return jobs;
    }

    // Normalize location for comparison
    const normalizedUserLocation = userLocation.toLowerCase();

    return jobs.filter(job => {
      if (job.remote) return true; // Always include remote jobs

      const jobLocation = job.location.toLowerCase();
      
      // Check if job location contains user location
      if (jobLocation.includes(normalizedUserLocation)) return true;
      
      // Check common variations
      if (normalizedUserLocation.includes('israel') || normalizedUserLocation.includes('tel aviv')) {
        return jobLocation.includes('israel') || 
               jobLocation.includes('tel aviv') || 
               jobLocation.includes('jerusalem') ||
               jobLocation.includes('haifa');
      }

      return false;
    });
  }

  /**
   * Generate job summary report
   */
  generateJobSummary(jobs: any[], cvData?: any): string {
    const totalJobs = jobs.length;
    const remoteJobs = jobs.filter(j => j.remote).length;
    const sources = [...new Set(jobs.map(j => j.source))];
    const companies = [...new Set(jobs.map(j => j.company))];
    const topSkills = new Map<string, number>();

    // Count skill mentions in job descriptions
    jobs.forEach(job => {
      const desc = job.description.toLowerCase();
      const commonSkills = [
        'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'nodejs',
        'vue', 'angular', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 
        'react native', 'flutter', 'swift', 'kotlin', 'go', 'rust', 'c++', 'c#'
      ];

      commonSkills.forEach(skill => {
        if (desc.includes(skill)) {
          topSkills.set(skill, (topSkills.get(skill) || 0) + 1);
        }
      });
    });

    const sortedSkills = [...topSkills.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let summary = `
# Job Search Summary Report
Generated: ${new Date().toLocaleString()}

## Overview
- **Total Jobs Found**: ${totalJobs}
- **Remote Positions**: ${remoteJobs} (${Math.round(remoteJobs/totalJobs*100)}%)
- **On-site Positions**: ${totalJobs - remoteJobs}
- **Sources**: ${sources.join(', ')}
- **Unique Companies**: ${companies.length}

## Top 10 In-Demand Skills
${sortedSkills.map(([skill, count], idx) => 
  `${idx + 1}. ${skill.toUpperCase()} - mentioned in ${count} jobs (${Math.round(count/totalJobs*100)}%)`
).join('\n')}

## Jobs by Source
${sources.map(source => {
  const count = jobs.filter(j => j.source === source).length;
  return `- ${source}: ${count} jobs`;
}).join('\n')}

## Top Companies Hiring
${companies.slice(0, 15).map((company, idx) => `${idx + 1}. ${company}`).join('\n')}

## Salary Information
${jobs.filter(j => j.salary).length > 0 ? 
  jobs.filter(j => j.salary).slice(0, 10).map(j => 
    `- ${j.title} at ${j.company}: ${j.salary}`
  ).join('\n') : 
  'Salary information not available for most listings'}

## Location Breakdown
${[...new Set(jobs.map(j => j.location))].slice(0, 10).map(loc => {
  const count = jobs.filter(j => j.location === loc).length;
  return `- ${loc}: ${count} jobs`;
}).join('\n')}

## Recommended Actions
1. Focus on skills: ${sortedSkills.slice(0, 3).map(([skill]) => skill).join(', ')}
2. Top hiring companies to research: ${companies.slice(0, 5).join(', ')}
3. ${remoteJobs > totalJobs * 0.5 ? 'Many remote opportunities available!' : 'Consider on-site positions for more options'}

---
*This report was generated automatically by Job Search AI Agent*
`;

    return summary;
  }

  /**
   * Search all job sources with intelligent routing
   * Uses: RemoteOK, Remotive (always) + JSearch + Adzuna (if configured)
   */
  async searchAllSources(
    query: string, 
    options?: SearchOptions | string, // Support both old (string) and new (SearchOptions) signatures
    remoteOnly?: boolean, // Legacy parameter
    io?: any // Socket.io instance for error reporting
  ): Promise<JobListing[]> {
    // Handle legacy signature: searchAllSources(query, location, remoteOnly, io)
    let searchOptions: SearchOptions;
    let socketIo: any;
    
    if (typeof options === 'string') {
      // Legacy: (query, location, remoteOnly, io)
      searchOptions = {
        query,
        location: options,
        remoteOnly: remoteOnly || false
      };
      socketIo = io;
    } else if (options && typeof options === 'object') {
      // New: (query, SearchOptions, io)
      searchOptions = { ...options, query };
      socketIo = remoteOnly as any; // In new signature, io is 3rd param
    } else {
      // No options provided
      searchOptions = { query };
      socketIo = remoteOnly as any;
    }
    
    // Ensure query is defined
    const finalQuery = searchOptions.query || query;
    
    console.log(`🔍 Searching all job sources for: "${finalQuery}"`);
    if (searchOptions.location) console.log(`📍 Location filter: ${searchOptions.location}`);
    if (searchOptions.remoteOnly) console.log(`🏠 Remote only: Yes`);
    
    // Notify frontend about search start
    if (socketIo) {
      socketIo.emit('log', { 
        message: `🔍 Searching for: "${finalQuery}"${searchOptions.location ? ` in ${searchOptions.location}` : ''}`, 
        type: 'info' 
      });
    }
    
    // Track API statuses for frontend
    const apiStatuses: { name: string; success: boolean; error?: string; count?: number }[] = [];
    
    // Build list of APIs to use based on remote preference
    const apiList: string[] = [];
    const promises: Array<Promise<{ source: string; jobs: JobListing[] }>> = [];
    
    // RemoteOK & Remotive are ONLY for remote jobs - skip if office-only requested
    if (searchOptions.remoteOnly !== false) {
      apiList.push('RemoteOK', 'Remotive');
      promises.push(
        this.fetchRemoteOK(finalQuery).then(jobs => ({ source: 'RemoteOK', jobs })),
        this.fetchRemotive(finalQuery).then(jobs => ({ source: 'Remotive', jobs }))
      );
    }
    
    // Arbeitnow has both remote and office jobs
    apiList.push('Arbeitnow');
    promises.push(
      this.fetchArbeitnow(finalQuery).then(jobs => ({ source: 'Arbeitnow', jobs }))
    );
    
    // Additional APIs (may have mixed remote/office jobs)
    apiList.push('The Muse', 'Findwork.dev', 'Himalayas');
    promises.push(
      additionalJobAPIs.fetchTheMuse(finalQuery, searchOptions.location).then(jobs => ({ source: 'The Muse', jobs })),
      additionalJobAPIs.fetchFindwork(finalQuery).then(jobs => ({ source: 'Findwork.dev', jobs })),
      additionalJobAPIs.fetchHimalayas(finalQuery).then(jobs => ({ source: 'Himalayas', jobs }))
    );
    
    // Add Israeli tech companies if location is Israel
    if (searchOptions.location?.toLowerCase().includes('israel') || 
        searchOptions.location?.toLowerCase().includes('tel aviv')) {
      apiList.push('Israeli Tech');
      promises.push(
        israeliJobsService.getIsraeliTechJobs(finalQuery).then(jobs => ({ source: 'Israeli Tech', jobs }))
      );
      
      if (socketIo) {
        socketIo.emit('log', { 
          message: '🇮🇱 Including top Israeli tech companies...', 
          type: 'info' 
        });
      }
    }
    
    // Notify about which APIs will be used
    if (socketIo) {
      const apiCount = apiList.length;
      const modeText = searchOptions.remoteOnly === true ? ' (Remote Only)' : 
                       searchOptions.remoteOnly === false ? ' (Office Only)' : '';
      socketIo.emit('log', { 
        message: `📡 Using ${apiCount} APIs${modeText}: ${apiList.join(' + ')}`, 
        type: 'info' 
      });
    }
    
    // Execute all API calls
    
    // Add premium APIs if configured
    if (process.env.RAPIDAPI_KEY) {
      promises.push(
        this.fetchJSearch(finalQuery, searchOptions.location).then(jobs => ({ source: 'JSearch', jobs }))
      );
      console.log('✨ JSearch API enabled (LinkedIn, Glassdoor, Indeed aggregation)');
      if (socketIo) {
        socketIo.emit('log', { 
          message: '⏰ JSearch API enabled (may be slow)', 
          type: 'info' 
        });
      }
    } else {
      console.log('💡 Tip: Add RAPIDAPI_KEY to .env for LinkedIn/Glassdoor/Indeed jobs');
    }
    
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      // Only use Adzuna if location is not Israel
      if (!searchOptions.location || !searchOptions.location.toLowerCase().includes('israel')) {
        promises.push(
          this.fetchAdzuna(finalQuery, searchOptions.location).then(jobs => ({ source: 'Adzuna', jobs }))
        );
        console.log('✨ Adzuna API enabled');
        if (socketIo) {
          socketIo.emit('log', { 
            message: '✨ Adzuna API enabled', 
            type: 'success' 
          });
        }
      } else {
        console.log('ℹ️ Adzuna skipped (Israel not supported by this API)');
        if (socketIo) {
          socketIo.emit('log', { 
            message: 'ℹ️ Adzuna skipped (Israel not supported)', 
            type: 'info' 
          });
        }
      }
    } else {
      console.log('💡 Tip: Add ADZUNA credentials for US/UK/EU job sources');
    }
    
    // Notify frontend that fetching is in progress
    if (socketIo) {
      socketIo.emit('log', { 
        message: '⏳ Fetching jobs from all sources (please wait)...', 
        type: 'info' 
      });
    }
    
    // Fetch all sources in parallel and track errors
    const results = await Promise.allSettled(promises);
    let allJobs: JobListing[] = [];
    let successCount = 0;
    let failCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { source, jobs } = result.value;
        allJobs = allJobs.concat(jobs);
        apiStatuses.push({ 
          name: source, 
          success: true, 
          count: jobs.length 
        });
        
        // Notify frontend of successful fetch
        if (socketIo && jobs.length > 0) {
          successCount++;
          socketIo.emit('log', { 
            message: `✅ ${source}: Found ${jobs.length} jobs`, 
            type: 'success' 
          });
        } else if (socketIo && jobs.length === 0) {
          socketIo.emit('log', { 
            message: `⚠️ ${source}: No jobs found matching criteria`, 
            type: 'warning' 
          });
        }
      } else {
        failCount++;
        const sourceName = ['RemoteOK', 'Remotive', 'Arbeitnow', 'JSearch', 'Adzuna'][index] || 'Unknown';
        apiStatuses.push({ 
          name: sourceName, 
          success: false, 
          error: result.reason?.message || 'Unknown error' 
        });
        
        // Notify frontend of failed fetch
        if (socketIo) {
          socketIo.emit('log', { 
            message: `❌ ${sourceName}: Failed to fetch jobs`, 
            type: 'error' 
          });
        }
      }
    });
    
    console.log(`📊 Raw results: ${allJobs.length} jobs from ${promises.length} sources`);
    
    // Notify frontend about raw results
    if (socketIo) {
      socketIo.emit('log', { 
        message: `📊 Retrieved ${allJobs.length} jobs from ${successCount} sources`, 
        type: 'info' 
      });
      
      if (failCount > 0) {
        socketIo.emit('log', { 
          message: `⚠️ ${failCount} source(s) failed to respond`, 
          type: 'warning' 
        });
      }
    }
    
    // Apply location filter
    const beforeFilter = allJobs.length;
    allJobs = this.filterByLocation(allJobs, searchOptions.location, searchOptions.remoteOnly);
    
    if (socketIo && beforeFilter !== allJobs.length) {
      socketIo.emit('log', { 
        message: `🎯 Applied location filter: ${beforeFilter} → ${allJobs.length} jobs`, 
        type: 'info' 
      });
    }

    // Remove duplicates based on title + company
    const beforeDedup = allJobs.length;
    const uniqueJobs = allJobs.filter((job, index, self) =>
      index === self.findIndex(j => 
        j.title.toLowerCase() === job.title.toLowerCase() && 
        j.company.toLowerCase() === job.company.toLowerCase()
      )
    );

    // Enrich jobs with detected metadata
    if (socketIo) {
      socketIo.emit('log', { 
        message: '🤖 Analyzing job metadata (company size, industry, level)...', 
        type: 'info' 
      });
    }
    const enrichedJobs = uniqueJobs.map(job => this.enrichJobListing(job));

    // Apply advanced filters
    const beforeAdvancedFilter = enrichedJobs.length;
    const filteredJobs = this.filterJobs(enrichedJobs, searchOptions);
    
    if (socketIo && beforeAdvancedFilter !== filteredJobs.length) {
      const removed = beforeAdvancedFilter - filteredJobs.length;
      socketIo.emit('log', { 
        message: `🎯 Applied advanced filters: ${beforeAdvancedFilter} → ${filteredJobs.length} jobs (-${removed})`, 
        type: 'info' 
      });
    }

    console.log(`✅ Total filtered jobs: ${filteredJobs.length}`);
    
    // Notify frontend about final results
    if (socketIo) {
      const duplicatesRemoved = beforeDedup - beforeAdvancedFilter;
      if (duplicatesRemoved > 0) {
        socketIo.emit('log', { 
          message: `🔄 Removed ${duplicatesRemoved} duplicate job(s)`, 
          type: 'info' 
        });
      }
      
      socketIo.emit('log', { 
        message: `✅ Total jobs matching criteria: ${filteredJobs.length}`, 
        type: filteredJobs.length > 0 ? 'success' : 'warning' 
      });
      
      // Show breakdown by source
      if (filteredJobs.length > 0) {
        const breakdown = filteredJobs.reduce((acc, job) => {
          acc[job.source] = (acc[job.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        socketIo.emit('log', { 
          message: '📋 Jobs by source:', 
          type: 'info' 
        });
        
        Object.entries(breakdown).forEach(([source, count]) => {
          socketIo.emit('log', { 
            message: `   • ${source}: ${count} jobs`, 
            type: 'info' 
          });
        });
      } else {
        socketIo.emit('log', { 
          message: '💡 Try different keywords or remove filters', 
          type: 'info' 
        });
      }
    }
    
    return filteredJobs;
  }
}

export default new JobSourceService();
