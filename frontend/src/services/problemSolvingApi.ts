/**
 * Problem Solving API Service
 * 
 * Handles all API calls for the Problem Solving agent including
 * coding patterns, suggestions, and problem management.
 */

import { API_BASE_URL } from '../config';

// ========== TYPES ==========

export interface CodingPattern {
  id: string;
  name: string;
  category: 'array' | 'string' | 'tree' | 'graph' | 'dp' | 'math' | 'design' | 'binary' | 'linkedlist' | 'stack';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  whenToUse: string[];
  keyIndicators: string[];
  timeComplexity: string;
  spaceComplexity: string;
  template: {
    javascript: string;
    python: string;
    java?: string;
  };
  examples: Array<{
    problem: string;
    hint: string;
  }>;
  relatedPatterns: string[];
  commonMistakes: string[];
  tips: string[];
}

export interface WeakProblem {
  problemId: string;
  title: string;
  source: string;
  difficulty: string;
  score: number | null;
  topics: string[];
  attempts: number;
}

export interface SuggestionsResponse {
  success: boolean;
  weakProblems: WeakProblem[];
  suggestedPatterns: CodingPattern[];
  statistics: Array<{
    difficulty: string;
    _avg: { score: number | null };
    _count: number;
  }>;
  recommendation: string;
}

export interface PatternsResponse {
  success: boolean;
  count: number;
  categories: string[];
  patterns: CodingPattern[];
}

export interface PatternDetailResponse {
  success: boolean;
  pattern: CodingPattern;
  relatedPatterns: CodingPattern[];
}

// ========== API FUNCTIONS ==========

/**
 * Get all coding patterns with optional filters
 */
export const getCodingPatterns = async (params?: {
  category?: string;
  difficulty?: string;
  search?: string;
}): Promise<PatternsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
  if (params?.search) queryParams.append('search', params.search);

  const url = `${API_BASE_URL}/problems/patterns${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch coding patterns');
  }
  
  return response.json();
};

/**
 * Get a specific coding pattern by ID
 */
export const getCodingPatternById = async (patternId: string): Promise<PatternDetailResponse> => {
  const response = await fetch(`${API_BASE_URL}/problems/patterns/${patternId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch pattern: ${patternId}`);
  }
  
  return response.json();
};

/**
 * Get suggested problems based on user's weak areas
 */
export const getSuggestedProblems = async (): Promise<SuggestionsResponse> => {
  const response = await fetch(`${API_BASE_URL}/problems/suggestions`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }
  
  return response.json();
};

/**
 * Search for coding problems
 */
export const searchProblems = async (params: {
  query: string;
  difficulty?: string;
  company?: string;
  source?: string[];
  list?: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/problems/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    throw new Error('Failed to search problems');
  }
  
  return response.json();
};

/**
 * Generate hints for a problem
 */
export const generateHints = async (problemTitle: string, problemDescription: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/problems/hints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemTitle, problemDescription })
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate hints');
  }
  
  return response.json();
};

/**
 * Evaluate submitted code
 */
export const evaluateCode = async (params: {
  problemTitle: string;
  problemDescription: string;
  code: string;
  language: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/problems/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    throw new Error('Failed to evaluate code');
  }
  
  return response.json();
};

/**
 * Save solved problem to database
 */
export const saveSolvedProblem = async (params: {
  problemId: string;
  title: string;
  source: string;
  difficulty: string;
  language: string;
  code: string;
  score?: number;
  topics?: string[];
  companyTags?: string[];
  listTags?: string[];
  hints?: number;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/problems/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    throw new Error('Failed to save solution');
  }
  
  return response.json();
};

/**
 * Get user's solved problems
 */
export const getSolvedProblems = async (params?: {
  source?: string;
  difficulty?: string;
  limit?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.source) queryParams.append('source', params.source);
  if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `${API_BASE_URL}/problems/solved${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch solved problems');
  }
  
  return response.json();
};

export default {
  getCodingPatterns,
  getCodingPatternById,
  getSuggestedProblems,
  searchProblems,
  generateHints,
  evaluateCode,
  saveSolvedProblem,
  getSolvedProblems
};



