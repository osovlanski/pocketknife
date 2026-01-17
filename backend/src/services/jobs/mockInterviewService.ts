/**
 * Mock Interview Service
 * 
 * Handles:
 * - Text extraction from images (Hebrew/English)
 * - Translation of Hebrew interview questions to English
 * - AI-powered interview answer generation
 * - Mock interview session management
 */

import claudeService from '../core/claudeService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

export interface InterviewQuestion {
  original: string;
  translated?: string;
  language: 'hebrew' | 'english' | 'unknown';
  category?: 'technical' | 'behavioral' | 'situational' | 'general';
}

export interface InterviewAnswer {
  question: string;
  answer: string;
  tips: string[];
  followUpQuestions?: string[];
  keyPoints?: string[];
}

export interface MockInterviewSession {
  id: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  startedAt: Date;
  feedback?: string;
}

class MockInterviewService {
  /**
   * Extract text from an image using Claude's vision capabilities
   * Also handles Hebrew text and translates to English
   */
  async extractTextFromImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<InterviewQuestion[]> {
    logger.start('Extracting text from image...');

    try {
      const prompt = `Analyze this image and extract any text that appears to be interview questions or prompts.

Instructions:
1. Extract ALL text from the image
2. Identify if the text is in Hebrew, English, or another language
3. If the text is in Hebrew, provide BOTH the original Hebrew AND an English translation
4. Categorize each question (technical, behavioral, situational, or general)
5. Clean up any OCR artifacts or formatting issues

Respond ONLY with valid JSON in this format:
{
  "questions": [
    {
      "original": "original text as it appears",
      "translated": "English translation if not already in English, null otherwise",
      "language": "hebrew" | "english" | "unknown",
      "category": "technical" | "behavioral" | "situational" | "general"
    }
  ]
}

If there are no interview questions in the image, return {"questions": []}`;

      const response = await claudeService.analyzeImage(base64Image, prompt, mimeType);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      logger.success(`Extracted ${parsed.questions.length} questions from image`);
      return parsed.questions;
    } catch (error: any) {
      logger.fail('Failed to extract text from image', { error: error.message });
      throw new Error(`Image text extraction failed: ${error.message}`);
    }
  }

  /**
   * Generate an AI-powered answer for an interview question
   */
  async generateAnswer(question: string, context?: {
    role?: string;
    experience?: string;
    skills?: string[];
    language?: 'hebrew' | 'english';
  }): Promise<InterviewAnswer> {
    logger.start(`Generating answer for: ${question.substring(0, 50)}...`);

    const contextInfo = context ? `
Context about the candidate:
- Target Role: ${context.role || 'Software Developer'}
- Experience Level: ${context.experience || 'Mid-level'}
- Key Skills: ${context.skills?.join(', ') || 'JavaScript, TypeScript, React'}
` : '';

    const responseLanguage = context?.language === 'hebrew' 
      ? 'Respond in Hebrew for the answer, but provide English tips.'
      : 'Respond entirely in English.';

    const prompt = `You are an expert interview coach. Help prepare a strong answer for this interview question.

Question: "${question}"
${contextInfo}

${responseLanguage}

Provide a comprehensive, structured answer that:
1. Directly addresses the question
2. Uses the STAR method for behavioral questions (Situation, Task, Action, Result)
3. Includes specific examples where appropriate
4. Is concise but thorough (2-3 paragraphs max)

Respond ONLY with valid JSON:
{
  "question": "the original question",
  "answer": "a well-structured answer to give in an interview",
  "tips": ["tip 1 for delivering this answer", "tip 2", "tip 3"],
  "followUpQuestions": ["potential follow-up question 1", "potential follow-up 2"],
  "keyPoints": ["key point to emphasize 1", "key point 2"]
}`;

    try {
      const maxTokens = configService.get('mockInterview.ai.answerMaxTokens', 2000);
      const response = await claudeService.generateText(prompt, maxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      logger.success('Interview answer generated successfully');
      return parsed;
    } catch (error: any) {
      logger.fail('Failed to generate interview answer', { error: error.message });
      throw new Error(`Answer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate answers for multiple questions in batch
   */
  async generateBatchAnswers(
    questions: InterviewQuestion[],
    context?: { role?: string; experience?: string; skills?: string[] }
  ): Promise<InterviewAnswer[]> {
    logger.start(`Generating answers for ${questions.length} questions...`);

    const answers: InterviewAnswer[] = [];

    for (const question of questions) {
      const questionText = question.translated || question.original;
      try {
        const answer = await this.generateAnswer(questionText, context);
        answers.push(answer);
      } catch (error) {
        logger.fail(`Failed to generate answer for: ${questionText.substring(0, 30)}...`);
        // Add a placeholder answer on failure
        answers.push({
          question: questionText,
          answer: 'Could not generate an answer for this question.',
          tips: ['Try rephrasing the question or asking separately.'],
          followUpQuestions: [],
          keyPoints: []
        });
      }
    }

    logger.success(`Generated ${answers.length} answers`);
    return answers;
  }

  /**
   * Conduct a mock interview session with AI-generated feedback
   */
  async evaluateAnswer(
    question: string,
    userAnswer: string,
    context?: { role?: string; experience?: string }
  ): Promise<{
    score: number;
    feedback: string;
    improvements: string[];
    strengths: string[];
  }> {
    logger.start('Evaluating interview answer...');

    const prompt = `You are an expert interview coach evaluating a candidate's answer.

Question: "${question}"

Candidate's Answer: "${userAnswer}"

${context?.role ? `Role being interviewed for: ${context.role}` : ''}

Evaluate this answer on a scale of 1-10 based on:
1. Relevance to the question
2. Clarity and structure
3. Use of specific examples
4. Confidence and professionalism
5. Completeness

Respond ONLY with valid JSON:
{
  "score": 7,
  "feedback": "Overall assessment of the answer",
  "improvements": ["specific improvement suggestion 1", "suggestion 2"],
  "strengths": ["what the candidate did well 1", "strength 2"]
}`;

    try {
      const maxTokens = configService.get('mockInterview.ai.evaluationMaxTokens', 1500);
      const response = await claudeService.generateText(prompt, maxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      logger.success(`Answer evaluated with score: ${parsed.score}/10`);
      return parsed;
    } catch (error: any) {
      logger.fail('Failed to evaluate answer', { error: error.message });
      throw new Error(`Answer evaluation failed: ${error.message}`);
    }
  }

  /**
   * Translate text from Hebrew to English
   */
  async translateHebrewToEnglish(hebrewText: string): Promise<string> {
    logger.start('Translating Hebrew text to English...');

    const prompt = `Translate the following Hebrew text to English. 
Preserve the meaning and context accurately.
If the text contains technical terms, keep them accurate.

Hebrew text: "${hebrewText}"

Respond with ONLY the English translation, no explanations or formatting.`;

    try {
      const maxTokens = configService.get('mockInterview.ai.translationMaxTokens', 500);
      const translation = await claudeService.generateText(prompt, maxTokens);
      logger.success('Translation completed');
      return translation.trim();
    } catch (error: any) {
      logger.fail('Translation failed', { error: error.message });
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Get example interview questions based on company, role, or category
   * Similar to Glassdoor interview questions
   */
  async getExampleQuestions(params: {
    company?: string;
    role?: string;
    category?: 'technical' | 'behavioral' | 'situational' | 'system-design' | 'coding';
    industry?: string;
    experienceLevel?: 'junior' | 'mid' | 'senior';
    count?: number;
  }): Promise<{
    questions: InterviewQuestion[];
    tips: string[];
    source: string;
  }> {
    const { company, role, category, industry, experienceLevel = 'mid', count = 10 } = params;
    logger.start('Generating example interview questions...', { company, role, category });

    // Build context for question generation
    let contextParts: string[] = [];
    if (company) contextParts.push(`for ${company}`);
    if (role) contextParts.push(`for a ${role} position`);
    if (industry) contextParts.push(`in the ${industry} industry`);
    if (category) contextParts.push(`focusing on ${category} questions`);
    if (experienceLevel) contextParts.push(`for a ${experienceLevel}-level candidate`);

    const context = contextParts.length > 0 ? contextParts.join(' ') : 'for a general tech interview';

    const prompt = `Generate ${count} realistic interview questions ${context}.

These should be questions that are commonly asked in real interviews based on:
${company ? `- Company culture and interview style of ${company} (based on public knowledge)` : '- General tech industry standards'}
${role ? `- Typical requirements for a ${role} role` : '- General software engineering roles'}
${category ? `- Focus on ${category} questions specifically` : '- Mix of different question types'}

For each question, provide:
1. The question itself
2. Category (technical, behavioral, situational, system-design, or coding)
3. Why this question is commonly asked
4. Key points the interviewer is looking for

Also provide 3-5 general tips for succeeding in this type of interview.

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "original": "The interview question",
      "category": "technical" | "behavioral" | "situational" | "system-design" | "coding",
      "reasoning": "Why this question is asked",
      "keyPoints": ["What interviewers look for 1", "Point 2"]
    }
  ],
  "tips": [
    "General tip 1 for this interview type",
    "Tip 2",
    "Tip 3"
  ]
}`;

    try {
      const maxTokens = configService.get('mockInterview.ai.exampleQuestionsMaxTokens', 3000);
      const response = await claudeService.generateText(prompt, maxTokens);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      const questions: InterviewQuestion[] = parsed.questions.map((q: any) => ({
        original: q.original,
        category: q.category,
        language: 'english',
        reasoning: q.reasoning,
        keyPoints: q.keyPoints
      }));

      logger.success(`Generated ${questions.length} example interview questions`);
      
      return {
        questions,
        tips: parsed.tips || [],
        source: company ? `Based on ${company} interview patterns` : 'AI-generated based on industry standards'
      };
    } catch (error: any) {
      logger.fail('Failed to generate example questions', { error: error.message });
      throw new Error(`Failed to generate example questions: ${error.message}`);
    }
  }

  /**
   * Get common interview questions for popular tech companies
   * Returns pre-defined question banks for major companies
   */
  getPopularCompanyQuestions(): { company: string; categories: string[]; sampleQuestions: string[] }[] {
    return [
      {
        company: 'Google',
        categories: ['coding', 'system-design', 'behavioral'],
        sampleQuestions: [
          'Design a URL shortening service like bit.ly',
          'How would you design Google Search autocomplete?',
          'Tell me about a time you had to deal with ambiguity',
          'Implement LRU Cache',
          'Design a distributed key-value store'
        ]
      },
      {
        company: 'Amazon',
        categories: ['behavioral', 'leadership-principles', 'system-design'],
        sampleQuestions: [
          'Tell me about a time you disagreed with your manager',
          'Describe a situation where you had to dive deep',
          'How would you design Amazon\'s recommendation system?',
          'Tell me about a time you took a calculated risk',
          'Design a package tracking system'
        ]
      },
      {
        company: 'Microsoft',
        categories: ['coding', 'system-design', 'behavioral'],
        sampleQuestions: [
          'Design Microsoft Teams',
          'How would you improve Outlook?',
          'Tell me about your most challenging project',
          'Design a file synchronization service',
          'How do you handle conflicting priorities?'
        ]
      },
      {
        company: 'Meta (Facebook)',
        categories: ['coding', 'system-design', 'product-sense'],
        sampleQuestions: [
          'Design Facebook News Feed',
          'How would you design Instagram Stories?',
          'Tell me about a product you use daily and how you would improve it',
          'Design a real-time chat system',
          'How would you measure the success of a new feature?'
        ]
      },
      {
        company: 'Apple',
        categories: ['technical', 'product-design', 'behavioral'],
        sampleQuestions: [
          'Why do you want to work at Apple?',
          'How would you improve the iPhone?',
          'Tell me about a time you paid attention to small details',
          'Design a feature for the Apple Watch',
          'How do you balance user experience with technical constraints?'
        ]
      },
      {
        company: 'Israeli Startups',
        categories: ['technical', 'culture-fit', 'problem-solving'],
        sampleQuestions: [
          'How do you stay updated with new technologies?',
          'Tell me about a project you built from scratch',
          'How would you handle a tight deadline with changing requirements?',
          'Design a scalable microservices architecture',
          'How do you approach learning a new technology?'
        ]
      }
    ];
  }
}

export const mockInterviewService = new MockInterviewService();
export default mockInterviewService;



