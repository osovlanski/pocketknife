import { Request, Response } from 'express';
import problemSolvingService from '../services/problemSolving/problemSolvingService';
import { getCompanyProfile, getAllCompanyNames } from '../data/companyMappings';
import { BLIND_75, NEETCODE_EXTRA, GRIND_75 } from '../data/curatedProblems';
import { databaseService, getPrisma } from '../services/core/databaseService';

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

/**
 * Save a solved problem to the database
 */
export async function saveSolvedProblem(req: Request, res: Response) {
  try {
    const { 
      problemId, 
      title, 
      source, 
      difficulty, 
      language, 
      code, 
      score,
      topics,
      companyTags,
      listTags,
      hints,
      attempts
    } = req.body;

    // Validation
    if (!problemId || !title || !source || !difficulty || !language || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields: problemId, title, source, difficulty, language, code' 
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ 
        error: 'Database not available. Your solution was evaluated but not saved.' 
      });
    }

    // Get or create default user
    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.status(500).json({ error: 'Failed to get/create user' });
    }

    console.log(`💾 Saving solved problem: "${title}" for user ${user.email}`);

    // Upsert the solved problem (update if exists, create if not)
    const solvedProblem = await prisma.solvedProblem.upsert({
      where: {
        userId_problemId_source: {
          userId: user.id,
          problemId: problemId,
          source: source
        }
      },
      update: {
        code: code,
        language: language,
        score: score || null,
        topics: topics || [],
        companyTags: companyTags || [],
        listTags: listTags || [],
        hints: hints || 0,
        attempts: { increment: 1 },
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        problemId: problemId,
        title: title,
        source: source,
        difficulty: difficulty,
        language: language,
        code: code,
        score: score || null,
        topics: topics || [],
        companyTags: companyTags || [],
        listTags: listTags || [],
        hints: hints || 0,
        attempts: attempts || 1
      }
    });

    // Log activity
    await databaseService.logActivity({
      userId: user.id,
      agent: 'problem',
      action: 'save_solution',
      details: `Saved solution for "${title}" in ${language}`,
      metadata: { problemId, source, score, difficulty },
      status: 'success'
    });

    console.log(`✅ Problem saved successfully: ${solvedProblem.id}`);

    res.json({
      success: true,
      message: 'Solution saved successfully',
      solvedProblem: {
        id: solvedProblem.id,
        problemId: solvedProblem.problemId,
        title: solvedProblem.title,
        score: solvedProblem.score,
        attempts: solvedProblem.attempts,
        solvedAt: solvedProblem.solvedAt
      }
    });
  } catch (error: any) {
    console.error('❌ Save solved problem error:', error);
    res.status(500).json({
      error: error.message || 'Failed to save solution'
    });
  }
}

/**
 * Get user's solved problems
 */
export async function getSolvedProblems(req: Request, res: Response) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.status(500).json({ error: 'Failed to get user' });
    }

    const { source, difficulty, limit } = req.query;

    const where: any = { userId: user.id };
    if (source) where.source = source;
    if (difficulty) where.difficulty = difficulty;

    const solvedProblems = await prisma.solvedProblem.findMany({
      where,
      orderBy: { solvedAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      select: {
        id: true,
        problemId: true,
        title: true,
        source: true,
        difficulty: true,
        language: true,
        score: true,
        attempts: true,
        hints: true,
        topics: true,
        companyTags: true,
        listTags: true,
        solvedAt: true
      }
    });

    res.json({
      success: true,
      count: solvedProblems.length,
      solvedProblems
    });
  } catch (error: any) {
    console.error('❌ Get solved problems error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get solved problems'
    });
  }
}

/**
 * Get a specific solved problem's code
 */
export async function getSolvedProblemCode(req: Request, res: Response) {
  try {
    const { problemId, source } = req.params;

    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await databaseService.getDefaultUser();
    if (!user) {
      return res.status(500).json({ error: 'Failed to get user' });
    }

    const solvedProblem = await prisma.solvedProblem.findFirst({
      where: {
        userId: user.id,
        problemId: problemId,
        source: source || undefined
      }
    });

    if (!solvedProblem) {
      return res.status(404).json({ error: 'Solved problem not found' });
    }

    res.json({
      success: true,
      solvedProblem
    });
  } catch (error: any) {
    console.error('❌ Get solved problem code error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get solved problem code'
    });
  }
}

/**
 * Run code against local test cases
 */
export async function runTests(req: Request, res: Response) {
  try {
    const { code, language, testCases } = req.body;

    if (!code || !language || !testCases || !Array.isArray(testCases)) {
      return res.status(400).json({ 
        error: 'Code, language, and testCases array are required' 
      });
    }

    console.log(`🧪 Running ${testCases.length} test cases for ${language} code`);

    // Use Claude to simulate running the tests
    const claudeService = (await import('../services/core/claudeService')).default;
    
    const prompt = `You are a code execution simulator. Analyze this ${language} code and determine what it would output for each test case.

CODE:
\`\`\`${language}
${code}
\`\`\`

TEST CASES:
${testCases.map((tc: { input: string; expected: string }, i: number) => 
  `Test ${i + 1}: Input = ${tc.input}, Expected = ${tc.expected}`
).join('\n')}

For each test case, simulate running the code and determine:
1. What the actual output would be
2. Whether it matches the expected output

IMPORTANT: 
- Parse the input correctly (e.g., "[1,1,1,2,2,3]" is a list)
- For the given code, identify the main function and call it with the parsed input
- Return the result in the exact format expected

Respond in this JSON format only:
{
  "results": [
    {
      "testCase": 1,
      "input": "the input value",
      "expected": "the expected value",
      "actual": "the simulated output",
      "passed": true/false,
      "explanation": "brief explanation of what happened"
    }
  ],
  "summary": {
    "total": number,
    "passed": number,
    "failed": number
  },
  "codeIssues": ["any issues found in the code, like syntax errors or missing self parameter"]
}`;

    const response = await claudeService.generateText(prompt);
    
    // Try to parse the JSON response
    let testResults;
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        testResults = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, return a formatted error response
      testResults = {
        results: testCases.map((tc: { input: string; expected: string }, i: number) => ({
          testCase: i + 1,
          input: tc.input,
          expected: tc.expected,
          actual: 'Unable to simulate',
          passed: false,
          explanation: 'Code simulation failed - check for syntax errors'
        })),
        summary: {
          total: testCases.length,
          passed: 0,
          failed: testCases.length
        },
        codeIssues: ['Could not parse test results - please verify code syntax'],
        rawResponse: response
      };
    }

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'problems',
        action: 'run-tests',
        details: `Ran ${testCases.length} test cases`,
        metadata: {
          language,
          testCount: testCases.length,
          passed: testResults.summary?.passed || 0,
          failed: testResults.summary?.failed || 0
        },
        status: 'success'
      });
    }

    res.json({
      success: true,
      ...testResults
    });
  } catch (error: any) {
    console.error('❌ Run tests error:', error);
    res.status(500).json({
      error: error.message || 'Failed to run tests'
    });
  }
}
