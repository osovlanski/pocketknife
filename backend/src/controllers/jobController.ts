import { Request, Response } from 'express';
import cvAnalysisService from '../services/jobs/cvAnalysisService';
import jobSourceService from '../services/jobs/jobSourceService';
import jobMatchingService from '../services/jobs/jobMatchingService';
import aiJobSearchService from '../services/jobs/aiJobSearchService';
import israelTechScraperService from '../services/jobs/israelTechScraperService';
import companyEnrichmentService from '../services/jobs/companyEnrichmentService';
import processControlService from '../services/core/processControlService';
import { databaseService } from '../services/core/databaseService';
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
    const { query, location, remoteOnly, companySize, industry, industries, salaryMin, salaryMax, experienceLevel, jobType } = req.body;
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
    
    // Add skill-based queries from CV top skills
    const topSkills = cvData.skills?.slice(0, 3) || [];
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
  getSystemDesignQuestions
} from './interviewController';
