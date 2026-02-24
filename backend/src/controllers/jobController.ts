import { Request, Response } from 'express';
import { configService } from '../services/core/configService';
import cvAnalysisService from '../services/jobs/cvAnalysisService';
import jobSourceService from '../services/jobs/jobSourceService';
import jobMatchingService from '../services/jobs/jobMatchingService';
import aiJobSearchService from '../services/jobs/aiJobSearchService';
import israelTechScraperService from '../services/jobs/israelTechScraperService';
import companyEnrichmentService from '../services/jobs/companyEnrichmentService';
import processControlService from '../services/core/processControlService';
import { databaseService } from '../services/core/databaseService';
import jobApplicationService from '../services/jobs/jobApplicationService';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Helper for consistent logging
const emitLog = (io: any, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  if (io) {
    io.emit('log', { message, type, agent: 'jobs' });
    io.emit('job-log', { message, type }); // Keep legacy event for backward compatibility
  }
};

// Simple file-based storage for MVP
const STORAGE_PATH = path.join(process.cwd(), 'data');
const CV_DATA_FILE = path.join(STORAGE_PATH, 'cv-data.json');
const JOB_LISTINGS_FILE = path.join(STORAGE_PATH, 'job-listings.json');

// Ensure data directory exists
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

export const uploadCV = async (req: Request, res: Response) => {
  try {
    const { cvText } = req.body;
    
    if (!cvText) {
      return res.status(400).json({ error: 'CV text is required' });
    }

    logger.start('Analyzing CV...');
    const io = req.app.get('io');
    emitLog(io, '📄 Analyzing your CV with AI...', 'info');

    // Analyze CV with Claude
    const cvData = await cvAnalysisService.analyzeCV(cvText);
    
    // Generate job preferences
    const preferences = cvAnalysisService.generateJobPreferences(cvData);

    // Save to file
    fs.writeFileSync(CV_DATA_FILE, JSON.stringify({ cvData, preferences }, null, 2));

    emitLog(io, `✅ CV analyzed! Found ${cvData.skills.length} skills and ${cvData.experience.length} experience entries`, 'success');

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'jobs',
        action: 'upload-cv',
        details: `CV analyzed with ${cvData.skills.length} skills`,
        metadata: {
          skillsCount: cvData.skills.length,
          experienceCount: cvData.experience.length,
          educationCount: cvData.education?.length || 0
        },
        status: 'success'
      });
    }

    res.json({
      message: 'CV analyzed successfully',
      cvData,
      preferences
    });
  } catch (error: any) {
    logger.fail('Error uploading CV', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const getCVData = async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CV_DATA_FILE)) {
      return res.status(404).json({ error: 'No CV data found. Please upload a CV first.' });
    }

    const data = JSON.parse(fs.readFileSync(CV_DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (error: any) {
    logger.fail('Error getting CV data', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const searchJobs = async (req: Request, res: Response) => {
  try {
    const { query, location, remoteOnly, companySize, companySizes, industry, industries, salaryMin, salaryMax, experienceLevel, jobType } = req.body;
    const io = req.app.get('io');

    // Start process and track it
    processControlService.startProcess('jobs');

    emitLog(io, '🔍 Starting job search...', 'info');
    
    // Get CV data
    const cvDataPath = path.join(__dirname, '../../data/cv-data.json');
    if (!fs.existsSync(cvDataPath)) {
      return res.status(400).json({ error: 'Please upload your CV first' });
    }

    // CV file contains { cvData, preferences } - extract the actual cvData
    const fileContent = JSON.parse(fs.readFileSync(cvDataPath, 'utf-8'));
    const cvData = fileContent.cvData || fileContent; // Handle both new and old format
    
    // Debug: Log CV skills for verification
    logger.found(`CV loaded: ${cvData.name || 'Unknown'}`, { skills: cvData.skills?.length || 0, experience: cvData.experience?.length || 0 });
    
    // =========================================================================
    // MULTI-QUERY EXPANSION: Generate multiple search queries for better results
    // =========================================================================
    const baseQuery = query || cvData.jobSearchQuery || `${cvData.seniorityLevel || ''} ${cvData.currentRole || 'developer'}`.trim();
    
    // Build array of search queries to maximize results
    const searchQueries: string[] = [baseQuery];
    
    // Add industry-specific queries if industries selected
    const selectedIndustries = industries || (industry && industry !== 'any' ? [industry] : []);
    if (selectedIndustries.length > 0) {
      selectedIndustries.forEach((ind: string) => {
        // Add "role + industry" query (e.g., "backend developer fintech")
        const industryQuery = `${baseQuery} ${ind}`;
        if (!searchQueries.includes(industryQuery)) {
          searchQueries.push(industryQuery);
        }
      });
      emitLog(io, `🏢 Industries selected: ${selectedIndustries.join(', ')}`, 'info');
    }
    
    // Log company size filters - ALWAYS log for debugging
    const effectiveCompanySizes = companySizes?.length ? companySizes : (companySize && companySize !== 'any' ? [companySize] : []);
    console.log('📏 DEBUG companySizes:', JSON.stringify({ companySizes, companySize, effectiveCompanySizes }));
    if (effectiveCompanySizes.length > 0) {
      emitLog(io, `📏 Company sizes filter: ${effectiveCompanySizes.join(', ')}`, 'info');
    } else {
      console.log('⚠️ No company size filter applied!');
    }
    
    // Add skill-based queries from CV top skills
    const topSkills = cvData.skills?.slice(0, configService.get('limits.jobs.controller.cv.topSkills.maxResults', 3) as number) || [];
    if (topSkills.length > 0) {
      const skillQuery = `${cvData.seniorityLevel || ''} ${topSkills.join(' ')} developer`.trim();
      if (!searchQueries.includes(skillQuery) && skillQuery !== baseQuery) {
        searchQueries.push(skillQuery);
      }
    }
    
    emitLog(io, `🎯 Search Queries (${searchQueries.length}): ${searchQueries.map(q => `"${q}"`).join(', ')}`, 'info');
    
    // Extract location preferences from CV
    const preferredLocations = cvData.preferredLocations || [];
    if (cvData.location && !preferredLocations.includes(cvData.location)) {
      preferredLocations.push(cvData.location);
    }
    
    if (preferredLocations.length > 0) {
      emitLog(io, `📍 Preferred Locations (from CV): ${preferredLocations.join(', ')}`, 'info');
    }

    // Get job preferences
    const preferences = cvAnalysisService.generateJobPreferences(cvData);

    // Notify about API status
    if (process.env.RAPIDAPI_KEY) {
      emitLog(io, '✨ JSearch API enabled (LinkedIn, Glassdoor, Indeed)', 'success');
    } else {
      emitLog(io, '💡 Tip: Add RAPIDAPI_KEY for LinkedIn/Glassdoor/Indeed jobs', 'info');
    }

    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      emitLog(io, '✨ Adzuna API enabled (International job boards)', 'success');
    } else {
      emitLog(io, '💡 Tip: Add ADZUNA credentials for more job sources', 'info');
    }

    emitLog(io, '📡 Fetching jobs from all sources with multiple queries...', 'info');

    // =========================================================================
    // MULTI-QUERY SEARCH: Search with all queries and combine results
    // =========================================================================
    const allJobsMap = new Map<string, any>(); // Use map to dedupe by job ID
    
    for (const searchQuery of searchQueries) {
      emitLog(io, `🔍 Searching: "${searchQuery}"...`, 'info');
      
      const queryJobs = await jobSourceService.searchAllSources(searchQuery, {
        location: preferredLocations[0] || location,
        remoteOnly: remoteOnly,
        radius: 50,
        companySize,
        companySizes, // Support multi-select company sizes
        industry: selectedIndustries.length === 1 ? selectedIndustries[0] : undefined, // Only filter if single industry
        salaryMin,
        salaryMax,
        experienceLevel,
        jobType
      }, io);
      
      // Add to map (dedupes by ID)
      queryJobs.forEach(job => {
        if (!allJobsMap.has(job.id)) {
          allJobsMap.set(job.id, job);
        }
      });
      
      emitLog(io, `  ↳ Found ${queryJobs.length} jobs, total unique: ${allJobsMap.size}`, 'info');
    }
    
    const jobs = Array.from(allJobsMap.values());
    
    if (jobs.length === 0) {
      emitLog(io, '❌ No jobs found matching your criteria', 'error');
      emitLog(io, '💡 Try: Different keywords, broader location, or remove filters', 'info');
      return res.json({
        message: 'No jobs found matching your criteria',
        jobs: [],
        stats: { total: 0, matched: 0 }
      });
    }

    emitLog(io, `✅ Found ${jobs.length} unique job listings!`, 'success');

    // Show breakdown by source
    const sourceBreakdown = jobs.reduce((acc: any, job) => {
      acc[job.source] = (acc[job.source] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(sourceBreakdown).forEach(([source, count]) => {
      emitLog(io, `  📌 ${source}: ${count} jobs`, 'info');
    });

    emitLog(io, '🤖 AI is analyzing job matches (this may take a moment)...', 'info');
    emitLog(io, '✨ Good matches (75%+) will appear in real-time below!', 'info');

    // Match jobs using AI with real-time streaming (75% threshold for streaming)
    // Pass shouldStop callback to allow cancellation
    const matchedJobs = await jobMatchingService.matchMultipleJobs(
      jobs, 
      cvData, 
      io, 
      75,
      () => processControlService.shouldStop('jobs')
    );
    
    // Calculate statistics
    const highMatch = matchedJobs.filter(j => j.matchScore >= 80).length;
    const mediumMatch = matchedJobs.filter(j => j.matchScore >= 60 && j.matchScore < 80).length;
    const lowMatch = matchedJobs.filter(j => j.matchScore < 60).length;
    
    // Filter by threshold
    const goodMatches = matchedJobs.filter(j => j.matchScore >= preferences.notificationThreshold);
    
    // Save results
    fs.writeFileSync(JOB_LISTINGS_FILE, JSON.stringify(matchedJobs, null, 2));

    // Generate summary report
    const summary = jobSourceService.generateJobSummary(matchedJobs, cvData);
    const summaryFile = path.join(STORAGE_PATH, 'job-summary.md');
    fs.writeFileSync(summaryFile, summary);

    // Detailed results logging
    emitLog(io, '✅ AI Matching Complete!', 'success');
    emitLog(io, '📊 Match Distribution:', 'info');
    emitLog(io, `  🟢 High Match (80%+): ${highMatch} jobs`, 'success');
    emitLog(io, `  🟡 Medium Match (60-79%): ${mediumMatch} jobs`, 'info');
    emitLog(io, `  🔴 Low Match (<60%): ${lowMatch} jobs`, 'info');
    emitLog(io, `✨ ${goodMatches.length} jobs meet your ${preferences.notificationThreshold}% threshold`, 'success');
    emitLog(io, `📋 Summary report: ${path.basename(summaryFile)}`, 'info');

    // Check if process was stopped
    const wasStopped = processControlService.shouldStop('jobs');
    processControlService.completeProcess('jobs', wasStopped);

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'jobs',
        action: 'search',
        details: `Job search: ${searchQueries.join(', ')}`,
        metadata: {
          queries: searchQueries,
          location: location || preferredLocations.join(', '),
          totalJobs: jobs.length,
          matchedJobs: goodMatches.length,
          highMatchCount: highMatch,
          mediumMatchCount: mediumMatch
        },
        status: wasStopped ? 'warning' : 'success'
      });
    }

    res.json({
      message: wasStopped ? 'Job search stopped by user' : 'Job search completed',
      stopped: wasStopped,
      jobs: matchedJobs,
      summary,
      summaryFile,
      stats: {
        total: jobs.length,
        matched: goodMatches.length,
        highMatch: matchedJobs.filter(j => j.matchScore >= 80).length,
        mediumMatch: matchedJobs.filter(j => j.matchScore >= 60 && j.matchScore < 80).length,
        lowMatch: matchedJobs.filter(j => j.matchScore < 60).length
      }
    });
  } catch (error: any) {
    // Make sure to complete the process on error
    processControlService.completeProcess('jobs', false);
    
    logger.fail('Error searching jobs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const getJobListings = async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(JOB_LISTINGS_FILE)) {
      return res.json({ jobs: [] });
    }

    const jobs = JSON.parse(fs.readFileSync(JOB_LISTINGS_FILE, 'utf-8'));
    res.json({ jobs });
  } catch (error: any) {
    logger.fail('Error getting job listings', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateJobPreferences = async (req: Request, res: Response) => {
  try {
    const { preferences } = req.body;
    
    if (!fs.existsSync(CV_DATA_FILE)) {
      return res.status(400).json({ error: 'Please upload your CV first' });
    }

    const data = JSON.parse(fs.readFileSync(CV_DATA_FILE, 'utf-8'));
    data.preferences = { ...data.preferences, ...preferences };
    
    fs.writeFileSync(CV_DATA_FILE, JSON.stringify(data, null, 2));

    res.json({
      message: 'Preferences updated successfully',
      preferences: data.preferences
    });
  } catch (error: any) {
    logger.fail('Error updating preferences', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI-powered job search based on user requirements
 */
export const aiSearch = async (req: Request, res: Response) => {
  try {
    const { prompt, location, remotePreference, salaryRange, companyTypes } = req.body;
    const io = req.app.get('io');

    if (!prompt) {
      return res.status(400).json({ error: 'Please provide your job requirements' });
    }

    emitLog(io, '🤖 AI analyzing your job requirements...', 'info');

    const result = await aiJobSearchService.searchByRequirements({
      prompt,
      location,
      remotePreference,
      salaryRange,
      companyTypes
    });

    emitLog(io, `✅ Found ${result.companies.length} matching companies!`, 'success');
    emitLog(io, `📝 Generated ${result.searchQueries.length} optimized search queries`, 'info');

    res.json({
      success: true,
      companies: result.companies,
      searchQueries: result.searchQueries,
      recommendations: result.recommendations,
      keywords: result.keywords
    });
  } catch (error: any) {
    logger.fail('AI search error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get career path recommendations based on CV
 */
export const getCareerPath = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');

    // Load CV data
    if (!fs.existsSync(CV_DATA_FILE)) {
      return res.status(400).json({ error: 'Please upload your CV first' });
    }

    const fileContent = JSON.parse(fs.readFileSync(CV_DATA_FILE, 'utf-8'));
    const cvData = fileContent.cvData || fileContent;

    emitLog(io, '🎯 Analyzing your career path...', 'info');

    const careerPath = await aiJobSearchService.getCareerPath(cvData);

    emitLog(io, '✅ Career path analysis complete!', 'success');

    res.json({
      success: true,
      careerPath
    });
  } catch (error: any) {
    logger.fail('Career path error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search Israeli tech job sites
 */
export const searchIsraeliJobs = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const io = req.app.get('io');

    emitLog(io, '🇮🇱 Searching Israeli tech job sites...', 'info');

    const jobs = await israelTechScraperService.getAllIsraeliJobs(query);

    emitLog(io, `✅ Found ${jobs.length} jobs from Israeli tech sites`, 'success');

    // Get CV data for matching if available
    let matchedJobs: any[] = jobs;
    if (fs.existsSync(CV_DATA_FILE)) {
      const fileContent = JSON.parse(fs.readFileSync(CV_DATA_FILE, 'utf-8'));
      const cvData = fileContent.cvData || fileContent;
      
      emitLog(io, '🤖 Matching jobs with your CV...', 'info');
      
      // Convert to expected format and match
      const formattedJobs = jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        remote: job.remote,
        applyUrl: job.applyUrl,
        source: job.source,
        postedAt: job.postedAt
      }));

      matchedJobs = await jobMatchingService.matchMultipleJobs(formattedJobs as any, cvData, io, 50);
    }

    res.json({
      success: true,
      jobs: matchedJobs,
      sources: ['Geektime', 'AllJobs']
    });
  } catch (error: any) {
    logger.fail('Israeli jobs search error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get company enrichment info
 */
export const getCompanyInfo = async (req: Request, res: Response) => {
  try {
    const companyName = req.params.companyName as string;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const info = await companyEnrichmentService.getCompanyInfo(companyName);

    if (info) {
      res.json({
        success: true,
        company: info
      });
    } else {
      res.json({
        success: false,
        company: null,
        message: 'Company information not found'
      });
    }
  } catch (error: any) {
    logger.fail('Company info error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Batch enrich multiple companies
 */
export const enrichCompanies = async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;
    
    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ error: 'Array of company names is required' });
    }

    const results = await companyEnrichmentService.enrichMultipleCompanies(companies);

    res.json({
      success: true,
      companies: Object.fromEntries(results)
    });
  } catch (error: any) {
    logger.fail('Company enrichment error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search by company name - find company info and their job openings
 */
export const searchCompany = async (req: Request, res: Response) => {
  try {
    const { companyName, includeJobs = true } = req.body;
    const io = req.app.get('io');

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    emitLog(io, `🔍 Searching for company: ${companyName}...`, 'info');

    // Get company info
    const companyInfo = await companyEnrichmentService.getCompanyInfo(companyName);

    if (companyInfo) {
      emitLog(io, `✅ Found company: ${companyInfo.name}`, 'success');
    } else {
      emitLog(io, `⚠️ Limited info available for: ${companyName}`, 'warning');
    }

    let jobs: any[] = [];
    
    if (includeJobs) {
      emitLog(io, '🔍 Searching for job openings...', 'info');
      
      // Search for jobs at this company
      const allJobs = await jobSourceService.searchAllSources(
        companyName,
        { query: companyName },
        io
      );
      
      // Filter to only include jobs from this company
      const companyNameLower = companyName.toLowerCase();
      jobs = allJobs.filter(job => 
        job.company.toLowerCase().includes(companyNameLower) ||
        companyNameLower.includes(job.company.toLowerCase())
      );

      emitLog(io, `✅ Found ${jobs.length} job openings at ${companyName}`, 'success');
    }

    // Log activity
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'jobs',
        action: 'company-search',
        details: `Company search: ${companyName}`,
        metadata: {
          companyName,
          hasInfo: !!companyInfo,
          jobsFound: jobs.length
        },
        status: 'success'
      });
    }

    res.json({
      success: true,
      company: companyInfo || { name: companyName },
      jobs,
      stats: {
        jobsFound: jobs.length,
        hasCompanyInfo: !!companyInfo
      }
    });
  } catch (error: any) {
    logger.fail('Company search error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get list of companies with job openings (for autocomplete)
 * Supports filtering by: prefix, sizes, industries
 */
export const getCompaniesWithJobs = async (req: Request, res: Response) => {
  try {
    const { prefix, sizes, industries } = req.query;

    // Parse filter arrays
    const sizeFilter = sizes && typeof sizes === 'string' 
      ? sizes.split(',').map(s => s.trim().toLowerCase()) 
      : [];
    const industryFilter = industries && typeof industries === 'string' 
      ? industries.split(',').map(i => i.trim().toLowerCase()) 
      : [];

    logger.info('Company list request', { prefix, sizeFilter, industryFilter });

    // Get companies from Comeet (known to have active job listings)
    const comeetService = await import('../services/jobs/comeetCareersService');
    const comeetCompanies = comeetService.default.getAvailableCompanies();

    // Get companies from Israeli tech service
    const israeliService = await import('../services/jobs/israeliJobsService');
    const israeliCompanies = israeliService.default.getTopIsraeliCompanies();

    // Combine companies with enriched data
    const allCompanies = [
      ...comeetCompanies.map(c => ({ 
        name: c.name, 
        industry: c.industry, 
        size: c.size,
        employeeCountMin: c.employeeCountMin,
        employeeCountMax: c.employeeCountMax
      })),
      ...israeliCompanies.map(c => ({ 
        name: c.name, 
        industry: 'Tech', 
        size: 'enterprise' as const,
        employeeCountMin: 500,
        employeeCountMax: 10000
      }))
    ];

    // Filter by prefix if provided
    let filtered = allCompanies;
    if (prefix && typeof prefix === 'string') {
      const prefixLower = prefix.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(prefixLower)
      );
    }

    // Filter by company size - use employee count ranges
    if (sizeFilter.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => {
        // Define size ranges
        const getSizeCategory = (minEmp?: number, maxEmp?: number, textSize?: string): string | null => {
          // Use employee count if available
          if (maxEmp !== undefined) {
            if (maxEmp <= 50) return 'startup';
            if (maxEmp <= 500) return 'midsize';
            return 'enterprise';
          }
          if (minEmp !== undefined) {
            if (minEmp >= 500) return 'enterprise';
            if (minEmp >= 51) return 'midsize';
            return 'startup';
          }
          // Fall back to text-based size
          if (textSize) return textSize.toLowerCase();
          return null;
        };

        const category = getSizeCategory(c.employeeCountMin, c.employeeCountMax, c.size);
        if (!category) return false; // Exclude if no size info
        
        return sizeFilter.includes(category);
      });
      logger.info('Size filter applied', { 
        sizeFilter, 
        beforeCount, 
        afterCount: filtered.length,
        sample: filtered.slice(0, configService.get('limits.jobs.controller.companies.sample.maxResults', 3) as number).map(c => ({ name: c.name, size: c.size, emp: c.employeeCountMax }))
      });
    }

    // Filter by industry
    if (industryFilter.length > 0) {
      filtered = filtered.filter(c => {
        if (!c.industry) return false;
        const industryLower = c.industry.toLowerCase();
        return industryFilter.some(filter => industryLower.includes(filter));
      });
    }

    // Dedupe by name
    const unique = filtered.filter((c, i, arr) => 
      arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i
    );

    res.json({
      success: true,
      companies: unique.slice(0, configService.get('limits.jobs.controller.companies.maxResults', 50) as number), // Limit to 50
      totalCount: unique.length,
      filters: {
        sizes: sizeFilter,
        industries: industryFilter
      }
    });
  } catch (error: any) {
    logger.fail('Get companies error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get trending companies based on period
 * Shows companies with highest activity/score changes
 */
export const getTrendingCompanies = async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query;
    
    logger.info('Fetching trending companies', { period });

    // Get companies from Comeet service
    const comeetService = await import('../services/jobs/comeetCareersService');
    const comeetCompanies = comeetService.default.getAvailableCompanies();

    // Get companies from Israeli tech service
    const israeliService = await import('../services/jobs/israeliJobsService');
    const israeliCompanies = israeliService.default.getTopIsraeliCompanies();

    // Combine all companies with metadata
    const allCompanies = [
      ...comeetCompanies.map(c => ({
        name: c.name,
        industry: c.industry,
        size: c.size,
        employeeCountMin: c.employeeCountMin,
        employeeCountMax: c.employeeCountMax,
        score: Math.floor(Math.random() * 30) + 70, // Simulated score 70-100 for now
        trend: 'up' as const,
        changePercent: Math.floor(Math.random() * 20) + 1 // Simulated change 1-20%
      })),
      ...israeliCompanies.map(c => ({
        name: c.name,
        industry: 'Tech',
        size: 'enterprise' as const,
        employeeCountMin: 500,
        employeeCountMax: 10000,
        score: Math.floor(Math.random() * 30) + 70,
        trend: 'up' as const,
        changePercent: Math.floor(Math.random() * 15) + 1
      }))
    ];

    // Sort by score (descending) and take top results
    const sorted = allCompanies.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Apply period-based filtering/limiting
    let limit = 12;
    switch (period) {
      case 'day':
        limit = 6;
        break;
      case 'week':
        limit = 12;
        break;
      case 'month':
        limit = 18;
        break;
      case 'year':
        limit = 24;
        break;
    }

    // Dedupe by name
    const unique = sorted.filter((c, i, arr) => 
      arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i
    );

    res.json({
      success: true,
      period,
      companies: unique.slice(0, limit),
      totalCount: unique.length
    });
  } catch (error: any) {
    logger.fail('Get trending companies error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// =============================================================================
// APPLY AI ENDPOINTS
// =============================================================================

export const generateJobApplication = async (req: Request, res: Response) => {
  try {
    const { jobData, tone, additionalContext } = req.body;

    if (!jobData) {
      return res.status(400).json({ error: 'jobData is required' });
    }

    const cvDataPath = path.join(__dirname, '../../data/cv-data.json');
    if (!fs.existsSync(cvDataPath)) {
      return res.status(400).json({ error: 'Please upload your CV first' });
    }

    const fileContent = JSON.parse(fs.readFileSync(cvDataPath, 'utf-8'));
    const cvData = fileContent.cvData || fileContent;

    const applicationPackage = await jobApplicationService.generateApplicationPackage(
      jobData,
      cvData,
      { tone, additionalContext }
    );

    res.json({ success: true, ...applicationPackage });
  } catch (error: any) {
    logger.fail('Generate job application error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const trackJobApplication = async (req: Request, res: Response) => {
  try {
    const { jobId, jobData, status, notes, appliedAt } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.status(400).json({ error: 'No user found' });
    }

    const prisma = databaseService.getClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const jobSource = jobData?.source || 'unknown';

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_jobId_source: { userId: user.id, jobId, source: jobSource }
      },
      update: {
        status: status || 'applied',
        notes: notes || undefined,
        appliedAt: appliedAt ? new Date(appliedAt) : (status === 'applied' ? new Date() : undefined),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        jobId,
        title: jobData?.title || 'Unknown',
        company: jobData?.company || 'Unknown',
        location: jobData?.location,
        salary: jobData?.salary,
        description: jobData?.description,
        url: jobData?.applyUrl,
        source: jobSource,
        matchScore: jobData?.matchScore,
        status: status || 'applied',
        notes,
        appliedAt: status === 'applied' ? new Date() : undefined
      }
    });

    res.json({ success: true, savedJob });
  } catch (error: any) {
    logger.fail('Track job application error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.status(400).json({ error: 'No user found' });
    }

    const prisma = databaseService.getClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const applications = await prisma.savedJob.findMany({
      where: {
        userId: user.id,
        status: { not: 'saved' }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({ success: true, applications });
  } catch (error: any) {
    logger.fail('Get job applications error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// =============================================================================
// MOCK INTERVIEW ENDPOINTS (re-exported from interviewController)
// =============================================================================
export {
  extractInterviewQuestions,
  generateInterviewAnswer,
  evaluateInterviewAnswer,
  getExampleQuestions,
  getPopularCompanyQuestions,
  evaluateSystemDesign,
  getSystemDesignQuestions,
  generateSystemDesignDiagram
} from './interviewController';
