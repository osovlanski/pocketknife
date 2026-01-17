/**
 * Judge0 Code Execution Service
 * 
 * Provides real code execution and evaluation using Judge0 API.
 * Judge0 supports 60+ programming languages for code compilation and execution.
 * 
 * RapidAPI: https://rapidapi.com/judge0-official/api/judge0-ce
 * Self-hosted: https://github.com/judge0/judge0
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CodeSubmission {
  sourceCode: string;
  languageId: number;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
}

export interface SubmissionResult {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
  exitCode: number | null;
}

export interface CodeEvaluation {
  success: boolean;
  passed: boolean;
  output: string;
  expectedOutput?: string;
  executionTime?: number;
  memoryUsed?: number;
  error?: string;
  compileError?: string;
  statusDescription: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface BatchEvaluationResult {
  passed: number;
  failed: number;
  total: number;
  testResults: {
    testCase: TestCase;
    result: CodeEvaluation;
  }[];
  overallSuccess: boolean;
}

// Language IDs for Judge0 CE
export const LANGUAGE_IDS: Record<string, number> = {
  'javascript': 63,
  'typescript': 74,
  'python': 71,
  'python3': 71,
  'java': 62,
  'c': 50,
  'cpp': 54,
  'c++': 54,
  'csharp': 51,
  'c#': 51,
  'go': 60,
  'rust': 73,
  'ruby': 72,
  'swift': 83,
  'kotlin': 78,
  'scala': 81,
  'php': 68,
  'r': 80,
  'sql': 82,
  'bash': 46,
  'shell': 46
};

// Status codes from Judge0
export const STATUS_CODES = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14
};

// =============================================================================
// JUDGE0 SERVICE
// =============================================================================

class Judge0Service {
  private client: AxiosInstance | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.initializeClient();
  }

  private initializeClient(): string {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const selfHostedUrl = process.env.JUDGE0_URL;

    // Prefer self-hosted Judge0 if available
    if (selfHostedUrl) {
      this.client = axios.create({
        baseURL: selfHostedUrl,
        timeout: configService.get('problems.judge0.timeoutMs', 30000)
      });
      logger.init('Judge0 self-hosted client initialized');
      return selfHostedUrl;
    }

    // Use RapidAPI hosted Judge0
    if (rapidApiKey) {
      this.client = axios.create({
        baseURL: 'https://judge0-ce.p.rapidapi.com',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        timeout: configService.get('problems.judge0.timeoutMs', 30000)
      });
      logger.init('Judge0 RapidAPI client initialized');
      return 'https://judge0-ce.p.rapidapi.com';
    }

    logger.warn('Judge0 not configured - code execution disabled');
    return '';
  }

  /**
   * Check if Judge0 is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Get language ID for a language name
   */
  getLanguageId(language: string): number | undefined {
    return LANGUAGE_IDS[language.toLowerCase()];
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_IDS);
  }

  /**
   * Submit code for execution
   */
  async submitCode(submission: CodeSubmission): Promise<string> {
    if (!this.client) {
      throw new Error('Judge0 service not available');
    }

    try {
      // Encode source code to base64
      const encodedCode = Buffer.from(submission.sourceCode).toString('base64');
      const encodedStdin = submission.stdin 
        ? Buffer.from(submission.stdin).toString('base64') 
        : undefined;
      const encodedExpected = submission.expectedOutput
        ? Buffer.from(submission.expectedOutput).toString('base64')
        : undefined;

      const response = await this.client.post('/submissions', {
        source_code: encodedCode,
        language_id: submission.languageId,
        stdin: encodedStdin,
        expected_output: encodedExpected,
        cpu_time_limit: submission.cpuTimeLimit || 5,
        memory_limit: submission.memoryLimit || 128000, // 128MB default
        base64_encoded: true
      }, {
        params: { base64_encoded: 'true', wait: 'false' }
      });

      return response.data.token;
    } catch (error: any) {
      logger.fail('Failed to submit code to Judge0', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submission result by token
   */
  async getSubmissionResult(token: string): Promise<SubmissionResult> {
    if (!this.client) {
      throw new Error('Judge0 service not available');
    }

    try {
      const response = await this.client.get(`/submissions/${token}`, {
        params: { base64_encoded: 'true', fields: '*' }
      });

      const data = response.data;

      // Decode base64 outputs
      return {
        token,
        stdout: data.stdout ? Buffer.from(data.stdout, 'base64').toString() : null,
        stderr: data.stderr ? Buffer.from(data.stderr, 'base64').toString() : null,
        compileOutput: data.compile_output ? Buffer.from(data.compile_output, 'base64').toString() : null,
        message: data.message,
        status: data.status,
        time: data.time,
        memory: data.memory,
        exitCode: data.exit_code
      };
    } catch (error: any) {
      logger.fail('Failed to get submission result', { token, error: error.message });
      throw error;
    }
  }

  /**
   * Submit and wait for result (blocking)
   */
  async executeCode(submission: CodeSubmission, maxWaitMs: number = 15000): Promise<SubmissionResult> {
    const token = await this.submitCode(submission);
    
    const startTime = Date.now();
    const pollInterval = 500; // Poll every 500ms

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getSubmissionResult(token);
      
      // Check if processing is complete
      if (result.status.id !== STATUS_CODES.IN_QUEUE && result.status.id !== STATUS_CODES.PROCESSING) {
        return result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Code execution timed out');
  }

  /**
   * Evaluate code against expected output
   */
  async evaluateCode(
    sourceCode: string,
    language: string,
    stdin: string,
    expectedOutput: string
  ): Promise<CodeEvaluation> {
    const languageId = this.getLanguageId(language);
    if (!languageId) {
      return {
        success: false,
        passed: false,
        output: '',
        error: `Unsupported language: ${language}`,
        statusDescription: 'Unsupported Language'
      };
    }

    try {
      const result = await this.executeCode({
        sourceCode,
        languageId,
        stdin,
        expectedOutput
      });

      const output = result.stdout?.trim() || '';
      const expected = expectedOutput.trim();
      const passed = result.status.id === STATUS_CODES.ACCEPTED || output === expected;

      return {
        success: true,
        passed,
        output,
        expectedOutput: expected,
        executionTime: result.time ? parseFloat(result.time) * 1000 : undefined,
        memoryUsed: result.memory || undefined,
        error: result.stderr || undefined,
        compileError: result.compileOutput || undefined,
        statusDescription: result.status.description
      };
    } catch (error: any) {
      return {
        success: false,
        passed: false,
        output: '',
        error: error.message,
        statusDescription: 'Execution Error'
      };
    }
  }

  /**
   * Run code against multiple test cases
   */
  async runTestCases(
    sourceCode: string,
    language: string,
    testCases: TestCase[]
  ): Promise<BatchEvaluationResult> {
    const results: BatchEvaluationResult['testResults'] = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      const result = await this.evaluateCode(
        sourceCode,
        language,
        testCase.input,
        testCase.expectedOutput
      );

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }

      results.push({ testCase, result });
    }

    return {
      passed,
      failed,
      total: testCases.length,
      testResults: results,
      overallSuccess: failed === 0
    };
  }

  /**
   * Run code without expected output (just execute and return result)
   */
  async runCode(
    sourceCode: string,
    language: string,
    stdin?: string
  ): Promise<CodeEvaluation> {
    const languageId = this.getLanguageId(language);
    if (!languageId) {
      return {
        success: false,
        passed: false,
        output: '',
        error: `Unsupported language: ${language}`,
        statusDescription: 'Unsupported Language'
      };
    }

    try {
      const result = await this.executeCode({
        sourceCode,
        languageId,
        stdin
      });

      const success = result.status.id === STATUS_CODES.ACCEPTED;

      return {
        success,
        passed: success,
        output: result.stdout || '',
        executionTime: result.time ? parseFloat(result.time) * 1000 : undefined,
        memoryUsed: result.memory || undefined,
        error: result.stderr || undefined,
        compileError: result.compileOutput || undefined,
        statusDescription: result.status.description
      };
    } catch (error: any) {
      return {
        success: false,
        passed: false,
        output: '',
        error: error.message,
        statusDescription: 'Execution Error'
      };
    }
  }

  /**
   * Get system languages and their versions (for diagnostics)
   */
  async getLanguages(): Promise<{ id: number; name: string; version?: string }[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.get('/languages');
      return response.data;
    } catch (error: any) {
      logger.fail('Failed to get Judge0 languages', { error: error.message });
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    if (!this.client) {
      return { healthy: false, error: 'Client not initialized' };
    }

    try {
      const response = await this.client.get('/about');
      return { healthy: true, version: response.data?.version };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton
export const judge0Service = new Judge0Service();
export default judge0Service;

