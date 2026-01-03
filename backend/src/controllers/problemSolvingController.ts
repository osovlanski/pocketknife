import { Request, Response } from 'express';
import problemSolvingService from '../services/problemSolving/problemSolvingService';
import { getCompanyProfile, getAllCompanyNames } from '../data/companyMappings';
import { BLIND_75, NEETCODE_EXTRA, GRIND_75 } from '../data/curatedProblems';

/**
 * Search for coding problems from various sources
 */
export async function searchProblems(req: Request, res: Response) {
  try {
    const { query, difficulty, company, source } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`🔍 Problem search request: "${query}" | Company: ${company || 'Any'} | Difficulty: ${difficulty || 'Any'}`);

    const problems = await problemSolvingService.searchProblems({
      query,
      difficulty,
      company,
      source
    });

    res.json({
      success: true,
      query,
      count: problems.length,
      problems
    });
  } catch (error: any) {
    console.error('❌ Problem search error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search problems'
    });
  }
}

/**
 * Generate hints for a coding problem
 */
export async function generateHints(req: Request, res: Response) {
  try {
    const { problemTitle, problemDescription } = req.body;

    if (!problemTitle || !problemDescription) {
      return res.status(400).json({ error: 'Problem title and description are required' });
    }

    console.log(`💡 Generating hints for: ${problemTitle}`);

    const hints = await problemSolvingService.generateHints(problemTitle, problemDescription);

    res.json({
      success: true,
      problemTitle,
      hints
    });
  } catch (error: any) {
    console.error('❌ Hint generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate hints'
    });
  }
}

/**
 * Get full problem description for a LeetCode problem
 */
export async function getProblemDescription(req: Request, res: Response) {
  try {
    const { titleSlug } = req.params;

    if (!titleSlug) {
      return res.status(400).json({ error: 'Problem title slug is required' });
    }

    console.log(`📄 Fetching description for: ${titleSlug}`);

    const description = await problemSolvingService.getProblemDescription(titleSlug);

    res.json({
      success: true,
      titleSlug,
      description: description || 'Problem description not available. Please visit the LeetCode website.'
    });
  } catch (error: any) {
    console.error('❌ Problem description fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch problem description'
    });
  }
}

/**
 * Evaluate submitted code for a problem
 */
export async function evaluateCode(req: Request, res: Response) {
  try {
    const { problemTitle, problemDescription, code, language } = req.body;

    if (!problemTitle || !problemDescription) {
      return res.status(400).json({ error: 'Problem title and description are required' });
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Code is required' });
    }

    console.log(`📝 Evaluating code for: ${problemTitle} (${language})`);

    const evaluation = await problemSolvingService.evaluateCode(
      problemTitle,
      problemDescription,
      code,
      language || 'javascript'
    );

    res.json({
      success: true,
      problemTitle,
      language: language || 'javascript',
      evaluation
    });
  } catch (error: any) {
    console.error('❌ Code evaluation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to evaluate code'
    });
  }
}

/**
 * Generate problem-specific method signature
 */
export async function generateSignature(req: Request, res: Response) {
  try {
    const { problemTitle, problemDescription, language } = req.body;

    if (!problemTitle || !problemDescription) {
      return res.status(400).json({ error: 'Problem title and description are required' });
    }

    console.log(`🔧 Generating signature for: ${problemTitle} (${language})`);

    const signature = await problemSolvingService.generateSignature(
      problemTitle,
      problemDescription,
      language || 'javascript'
    );

    res.json({
      success: true,
      problemTitle,
      language: language || 'javascript',
      signature
    });
  } catch (error: any) {
    console.error('❌ Signature generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate signature'
    });
  }
}

/**
 * Generate improved code based on suggestions
 */
export async function generateImprovedCode(req: Request, res: Response) {
  try {
    const { problemTitle, problemDescription, currentCode, language, suggestions } = req.body;

    if (!problemTitle || !problemDescription) {
      return res.status(400).json({ error: 'Problem title and description are required' });
    }

    if (!currentCode || typeof currentCode !== 'string') {
      return res.status(400).json({ error: 'Current code is required' });
    }

    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({ error: 'Suggestions are required' });
    }

    console.log(`✨ Generating improved code for: ${problemTitle}`);

    const improvedCode = await problemSolvingService.generateImprovedCode(
      problemTitle,
      problemDescription,
      currentCode,
      language || 'javascript',
      suggestions
    );

    res.json({
      success: true,
      problemTitle,
      language: language || 'javascript',
      improvedCode
    });
  } catch (error: any) {
    console.error('❌ Code improvement error:', error);
    res.status(500).json({
      error: error.message || 'Failed to improve code'
    });
  }
}

/**
 * Get company interview profile and tips
 */
export async function getCompanyInterviewProfile(req: Request, res: Response) {
  try {
    const { companyName } = req.params;

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    console.log(`🏢 Fetching interview profile for: ${companyName}`);

    const profile = getCompanyProfile(companyName);

    if (!profile) {
      return res.status(404).json({
        error: `No interview profile found for "${companyName}"`,
        availableCompanies: getAllCompanyNames().slice(0, 10)
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error: any) {
    console.error('❌ Company profile fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch company profile'
    });
  }
}

/**
 * Get all available companies
 */
export async function getAllCompanies(req: Request, res: Response) {
  try {
    const companies = getAllCompanyNames();

    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error: any) {
    console.error('❌ Get companies error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get companies'
    });
  }
}

/**
 * Get curated problem lists info
 */
export async function getCuratedLists(req: Request, res: Response) {
  try {
    const lists = {
      blind75: {
        name: 'Blind 75',
        description: 'Top 75 LeetCode problems asked at FAANG companies',
        count: BLIND_75.length,
        categories: [...new Set(BLIND_75.map(p => p.category))]
      },
      neetcode150: {
        name: 'NeetCode 150',
        description: 'Expanded curated list with 150 essential problems',
        count: BLIND_75.length + NEETCODE_EXTRA.length,
        categories: [...new Set([...BLIND_75, ...NEETCODE_EXTRA].map(p => p.category))]
      },
      grind75: {
        name: 'Grind 75',
        description: 'Optimized study plan for efficient interview prep',
        count: GRIND_75.length,
        categories: [...new Set(GRIND_75.map(p => p.category))]
      }
    };

    res.json({
      success: true,
      lists
    });
  } catch (error: any) {
    console.error('❌ Get curated lists error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get curated lists'
    });
  }
}
