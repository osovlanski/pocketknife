/**
 * Mock Interview API Service
 * 
 * Handles:
 * - Image upload and text extraction (Hebrew/English)
 * - Interview answer generation
 * - Answer evaluation
 */

import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

// Create axios instance with auth
const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// Types
export interface InterviewQuestion {
  original: string;
  translated?: string;
  language: 'hebrew' | 'english' | 'unknown';
  category?: 'technical' | 'behavioral' | 'situational' | 'general' | 'coding' | 'system-design';
}

export interface InterviewAnswer {
  question: string;
  answer: string;
  tips: string[];
  followUpQuestions?: string[];
  keyPoints?: string[];
}

export interface AnswerEvaluation {
  score: number;
  feedback: string;
  improvements: string[];
  strengths: string[];
}

export interface InterviewContext {
  role?: string;
  experience?: string;
  skills?: string[];
}

// API Functions

/**
 * Convert a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract base64 part (remove data:image/xxx;base64, prefix)
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Extract interview questions from an uploaded image
 */
export const extractQuestionsFromImage = async (
  file: File
): Promise<{ success: boolean; questions: InterviewQuestion[] }> => {
  const base64 = await fileToBase64(file);
  
  const response = await api.post('/jobs/interview/extract', {
    imageBase64: base64,
    imageMimeType: file.type
  });
  
  return response.data;
};

/**
 * Generate an AI-powered answer for an interview question
 */
export const generateAnswer = async (
  question: string,
  context?: InterviewContext
): Promise<{ success: boolean; answer: InterviewAnswer }> => {
  const response = await api.post('/jobs/interview/generate-answer', {
    question,
    ...context
  });
  
  return response.data;
};

/**
 * Evaluate a user's interview answer
 */
export const evaluateAnswer = async (
  question: string,
  userAnswer: string,
  context?: { role?: string; experience?: string }
): Promise<{ success: boolean; evaluation: AnswerEvaluation }> => {
  const response = await api.post('/jobs/interview/evaluate', {
    question,
    userAnswer,
    ...context
  });
  
  return response.data;
};

/**
 * Example question with additional metadata
 */
export interface ExampleQuestion extends InterviewQuestion {
  reasoning?: string;
  keyPoints?: string[];
}

/**
 * Popular company question bank
 */
export interface CompanyQuestionBank {
  company: string;
  categories: string[];
  sampleQuestions: string[];
}

/**
 * Get example interview questions based on company, role, or category
 * Similar to Glassdoor interview questions feature
 */
export const getExampleQuestions = async (params: {
  company?: string;
  role?: string;
  category?: 'technical' | 'behavioral' | 'situational' | 'system-design' | 'coding';
  industry?: string;
  experienceLevel?: 'junior' | 'mid' | 'senior';
  count?: number;
}): Promise<{
  success: boolean;
  questions: ExampleQuestion[];
  tips: string[];
  source: string;
}> => {
  const response = await api.post('/jobs/interview/example-questions', params);
  return response.data;
};

/**
 * Get popular company interview question banks (Google, Amazon, Meta, etc.)
 */
export const getPopularCompanyQuestions = async (): Promise<{
  success: boolean;
  companies: CompanyQuestionBank[];
}> => {
  const response = await api.get('/jobs/interview/popular-companies');
  return response.data;
};

// =============================================================================
// SYSTEM DESIGN
// =============================================================================

export interface SystemDesignQuestion {
  title: string;
  description: string;
  requirements: string[];
  constraints?: string[];
  hints?: string[];
  timeLimit?: number;
  category?: string;
}

export interface SystemDesignEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  missingComponents: string[];
  scalabilityScore: number;
  reliabilityScore: number;
  costEfficiencyScore: number;
  feedback: string;
  detailedAnalysis: {
    dataFlow: string;
    bottlenecks: string[];
    singlePointsOfFailure: string[];
    recommendations: string[];
  };
}

/**
 * Evaluate a system design diagram
 */
export const evaluateSystemDesign = async (
  imageBase64: string,
  jsonData: string,
  textAnnotations: string[],
  question: SystemDesignQuestion,
  elapsedTime?: number
): Promise<{
  success: boolean;
  evaluation: SystemDesignEvaluation;
}> => {
  const response = await api.post('/jobs/interview/system-design/evaluate', {
    imageBase64,
    jsonData,
    textAnnotations,
    question,
    elapsedTime
  });
  return response.data;
};

/**
 * Get example system design questions
 */
export const getSystemDesignQuestions = async (): Promise<{
  success: boolean;
  questions: SystemDesignQuestion[];
}> => {
  const response = await api.get('/jobs/interview/system-design/questions');
  return response.data;
};

