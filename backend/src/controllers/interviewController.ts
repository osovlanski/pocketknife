/**
 * Interview Controller
 * 
 * Handles mock interview, example questions, and system design evaluation endpoints.
 * Split from jobController for better maintainability.
 */

import { Request, Response } from 'express';
import { jobsAgent } from '../agents/JobsAgent';
import logger from '../utils/logger';

// Helper for consistent logging
const emitLog = (io: any, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  if (io) {
    io.emit('log', { message, type, agent: 'jobs' });
    io.emit('job-log', { message, type }); // Keep legacy event for backward compatibility
  }
};

// =============================================================================
// MOCK INTERVIEW ENDPOINTS
// =============================================================================

/**
 * Extract interview questions from an uploaded image
 * Supports Hebrew text extraction and translation
 */
export const extractInterviewQuestions = async (req: Request, res: Response) => {
  try {
    const { imageBase64, imageMimeType } = req.body;
    const io = req.app.get('io');

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data (base64) is required' });
    }

    emitLog(io, '📷 Extracting interview questions from image...', 'info');

    const result = await jobsAgent.execute({
      action: 'extract-interview-questions',
      imageBase64,
      imageMimeType: imageMimeType || 'image/jpeg'
    });

    if (!result.success) {
      emitLog(io, `❌ Extraction failed: ${result.error}`, 'error');
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { questions?: any[] } | undefined;
    const questions = data?.questions || [];
    emitLog(io, `✅ Extracted ${questions.length} questions`, 'success');

    res.json({
      success: true,
      questions
    });
  } catch (error: any) {
    logger.fail('Extract interview questions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate an AI-powered answer for an interview question
 */
export const generateInterviewAnswer = async (req: Request, res: Response) => {
  try {
    const { question, role, experience, skills } = req.body;
    const io = req.app.get('io');

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    emitLog(io, '🎯 Generating interview answer...', 'info');

    const result = await jobsAgent.execute({
      action: 'generate-answer',
      question,
      context: {
        role,
        experience,
        skills
      }
    });

    if (!result.success) {
      emitLog(io, `❌ Answer generation failed: ${result.error}`, 'error');
      return res.status(400).json({ error: result.error });
    }

    emitLog(io, '✅ Interview answer generated', 'success');

    const data = result.data as { answer?: any } | undefined;
    res.json({
      success: true,
      answer: data?.answer
    });
  } catch (error: any) {
    logger.fail('Generate interview answer error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Evaluate a user's interview answer
 */
export const evaluateInterviewAnswer = async (req: Request, res: Response) => {
  try {
    const { question, userAnswer, role, experience } = req.body;
    const io = req.app.get('io');

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and user answer are required' });
    }

    emitLog(io, '📝 Evaluating your interview answer...', 'info');

    const result = await jobsAgent.execute({
      action: 'evaluate-answer',
      question,
      userAnswer,
      context: {
        role,
        experience
      }
    });

    if (!result.success) {
      emitLog(io, `❌ Evaluation failed: ${result.error}`, 'error');
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { evaluation?: any } | undefined;
    const evaluation = data?.evaluation;
    emitLog(io, `✅ Answer evaluated: ${evaluation?.score}/10`, 'success');

    res.json({
      success: true,
      evaluation
    });
  } catch (error: any) {
    logger.fail('Evaluate interview answer error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get example interview questions based on company, role, or category
 * Similar to Glassdoor interview questions feature
 */
export const getExampleQuestions = async (req: Request, res: Response) => {
  try {
    const { company, role, category, industry, experienceLevel, count } = req.body;
    const io = req.app.get('io');

    emitLog(io, '📝 Generating example interview questions...', 'info');

    const result = await jobsAgent.execute({
      action: 'get-example-questions',
      company,
      role,
      category,
      industry,
      experienceLevel,
      count: count || 10
    });

    if (!result.success) {
      emitLog(io, `❌ Failed to generate questions: ${result.error}`, 'error');
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { questions?: any[]; tips?: string[]; source?: string } | undefined;
    const questions = data?.questions || [];
    emitLog(io, `✅ Generated ${questions.length} example questions`, 'success');

    res.json({
      success: true,
      questions: data?.questions,
      tips: data?.tips,
      source: data?.source
    });
  } catch (error: any) {
    logger.fail('Get example questions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get popular company interview questions (pre-defined question banks)
 */
export const getPopularCompanyQuestions = async (req: Request, res: Response) => {
  try {
    const result = await jobsAgent.execute({
      action: 'get-popular-company-questions'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { companies?: any[] } | undefined;
    res.json({
      success: true,
      companies: data?.companies
    });
  } catch (error: any) {
    logger.fail('Get popular company questions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Evaluate a system design diagram
 */
export const evaluateSystemDesign = async (req: Request, res: Response) => {
  try {
    const { imageBase64, jsonData, textAnnotations, question, elapsedTime } = req.body;
    const io = req.app.get('io');

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    emitLog(io, '🏗️ Evaluating system design...', 'info');

    const result = await jobsAgent.execute({
      action: 'evaluate-system-design',
      imageBase64,
      jsonData,
      textAnnotations,
      question,
      elapsedTime
    });

    if (!result.success) {
      emitLog(io, `❌ Evaluation failed: ${result.error}`, 'error');
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { evaluation?: any } | undefined;
    emitLog(io, `✅ System design evaluated: Score ${data?.evaluation?.score}/100`, 'success');

    res.json({
      success: true,
      evaluation: data?.evaluation
    });
  } catch (error: any) {
    logger.fail('System design evaluation error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get example system design questions
 */
export const getSystemDesignQuestions = async (req: Request, res: Response) => {
  try {
    const result = await jobsAgent.execute({
      action: 'get-system-design-questions'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as { questions?: any[] } | undefined;
    res.json({
      success: true,
      questions: data?.questions
    });
  } catch (error: any) {
    logger.fail('Get system design questions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};


