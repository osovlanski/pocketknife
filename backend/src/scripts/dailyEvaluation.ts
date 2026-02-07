/**
 * Daily Evaluation Script
 *
 * Orchestrates the daily quality evaluation pipeline:
 * 1. Load curated benchmark questions
 * 2. Get previous day's weak areas
 * 3. Generate synthetic questions (optional)
 * 4. Run all questions through evaluation
 * 5. Generate and save report
 *
 * Usage: npm run evaluate:daily
 * Or:    npx tsx src/scripts/dailyEvaluation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateClaudeMessage, isAnthropicConfigured } from '../utils/anthropicClient';
import { configService } from '../services/core/configService';
import logger from '../utils/logger';
import { evaluationService, syntheticGenerator } from '../services/evaluation';
import { toQuestionCategory, toDifficulty } from '../services/evaluation/types';
import type {
  EvaluationResult,
  BenchmarkQuestion,
  BenchmarkFile,
  ChatExecutionResult,
  QuestionCategory
} from '../services/evaluation';

// Load environment variables
import 'dotenv/config';

const REPORTS_DIR = path.join(__dirname, '../../../docs/quality-reports');
const BENCHMARK_PATH = path.join(__dirname, '../data/benchmark-questions.json');

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_SUCCESS_RATE = 0.3; // Abort if >70% of evaluations fail

// =============================================================================
// HELPERS
// =============================================================================

const sleep = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const loadBenchmarkQuestions = async (): Promise<BenchmarkQuestion[]> => {
  try {
    const content = fs.readFileSync(BENCHMARK_PATH, 'utf8');
    const data: BenchmarkFile = JSON.parse(content);
    return data.questions;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not load benchmark questions, using defaults', { error: message });
    return [
      { id: 'default-1', question: 'What can you help me with?', category: 'general', difficulty: 1, expectedAgents: [] },
      { id: 'default-2', question: 'Find me remote developer jobs', category: 'jobs', difficulty: 2, expectedAgents: ['jobs'] },
      { id: 'default-3', question: 'Suggest a quick dinner recipe', category: 'cooking', difficulty: 2, expectedAgents: ['cooking'] }
    ];
  }
};

const getLastReport = async (): Promise<{ avgScore: number; weakCategories: QuestionCategory[] } | null> => {
  try {
    if (!fs.existsSync(REPORTS_DIR)) return null;

    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf8');
    const overallMatch = content.match(/Overall.*?(\d+\.?\d*)/);
    const avgScore = overallMatch ? parseFloat(overallMatch[1]) : 3.0;

    return { avgScore, weakCategories: [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not load last report', { error: message });
    return null;
  }
};

/**
 * Execute a chat interaction for evaluation purposes.
 *
 * NOTE: This currently uses a standalone Claude call rather than the full
 * assistant service pipeline. Agent detection is keyword-based rather than
 * actual agent invocation. This keeps evaluation costs low and avoids
 * side effects from real agent calls (API quotas, external requests).
 *
 * TODO: Integrate with actual assistantService.handleMessage() for accurate
 * agent routing evaluation once evaluation budget allows.
 *
 * @param question - The benchmark question to test
 * @returns The response text and list of detected agent categories
 */
const executeChat = async (question: string): Promise<ChatExecutionResult> => {
  if (!isAnthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const maxTokens = configService.get('evaluation.chat.maxTokens', 800);
  const model = configService.get('evaluation.ai.model', 'claude-3-5-haiku-latest');

  const text = await generateClaudeMessage(question, {
    model,
    maxTokens,
    systemPrompt: `You are Pocketknife, a helpful AI assistant with specialized agents for:
- Cooking: Recipe suggestions, meal planning
- Jobs: Job search, career advice
- Travel: Trip planning, flight/hotel search
- Learning: Educational resources, tutorials
- Shopping: Deal finding, price comparison
- Problems: Coding practice problems
- ToDo: Task management

Respond helpfully to the user's question.`
  });

  // Keyword-based agent detection (simplified -- see function JSDoc)
  const agentsUsed: string[] = [];
  const lowerQ = question.toLowerCase();
  if (lowerQ.includes('recipe') || lowerQ.includes('cook') || lowerQ.includes('dinner') || lowerQ.includes('meal')) agentsUsed.push('cooking');
  if (lowerQ.includes('job') || lowerQ.includes('career') || lowerQ.includes('hiring')) agentsUsed.push('jobs');
  if (lowerQ.includes('trip') || lowerQ.includes('travel') || lowerQ.includes('flight') || lowerQ.includes('hotel')) agentsUsed.push('travel');
  if (lowerQ.includes('learn') || lowerQ.includes('tutorial') || lowerQ.includes('resource')) agentsUsed.push('learning');
  if (lowerQ.includes('price') || lowerQ.includes('deal') || lowerQ.includes('buy') || lowerQ.includes('headphone')) agentsUsed.push('shopping');
  if (lowerQ.includes('problem') || lowerQ.includes('leetcode') || lowerQ.includes('coding')) agentsUsed.push('problems');
  if (lowerQ.includes('task') || lowerQ.includes('todo') || lowerQ.includes('organize')) agentsUsed.push('todo');

  return { response: text, agentsUsed };
};

const generateReport = (results: EvaluationResult[], errorCount: number, date: string): string => {
  const averages = evaluationService.calculateAverages(results);
  const byCategory = evaluationService.groupByCategory(results);
  const successCount = results.filter(r => !r.scores.isError).length;

  let report = `# Daily Quality Report - ${date}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Score |\n`;
  report += `|--------|-------|\n`;
  report += `| Accuracy | ${averages.accuracy.toFixed(2)}/5 |\n`;
  report += `| Helpfulness | ${averages.helpfulness.toFixed(2)}/5 |\n`;
  report += `| Completeness | ${averages.completeness.toFixed(2)}/5 |\n`;
  report += `| Clarity | ${averages.clarity.toFixed(2)}/5 |\n`;
  report += `| Safety | ${averages.safety.toFixed(2)}/5 |\n`;
  if (averages.agentUsage !== null) {
    report += `| Agent Usage | ${averages.agentUsage.toFixed(2)}/5 |\n`;
  }
  report += `| **Overall** | **${averages.overall.toFixed(2)}/5** |\n\n`;

  report += `## Evaluation Stats\n\n`;
  report += `- Questions evaluated: ${results.length}\n`;
  report += `- Successful: ${successCount}\n`;
  report += `- Errors (excluded from scores): ${errorCount}\n\n`;

  report += `## Category Breakdown\n\n`;
  for (const [category, catResults] of Object.entries(byCategory)) {
    if (!catResults) continue;
    const catAvg = evaluationService.calculateAverages(catResults);
    report += `- **${category}**: ${catAvg.overall.toFixed(2)}/5 (${catResults.length} questions)\n`;
  }

  report += `\n## Detailed Results\n\n`;
  const validResults = results.filter(r => !r.scores.isError);
  for (const r of validResults.slice(0, 10)) {
    report += `### ${r.question.substring(0, 60)}...\n`;
    report += `- **Category**: ${r.category}\n`;
    report += `- **Scores**: Accuracy ${r.scores.accuracy}, Helpfulness ${r.scores.helpfulness}, Clarity ${r.scores.clarity}\n`;
    report += `- **Overall**: ${r.scores.overall.toFixed(2)}/5\n`;
    if (r.scores.feedback) {
      report += `- **Feedback**: ${r.scores.feedback}\n`;
    }
    report += `\n`;
  }

  if (validResults.length > 10) {
    report += `*...and ${validResults.length - 10} more questions*\n\n`;
  }

  report += `---\n*Generated by Daily Quality Evaluation workflow*\n`;

  return report;
};

// =============================================================================
// MAIN
// =============================================================================

const main = async (): Promise<void> => {
  logger.start('Starting daily quality evaluation...');

  // 1. Load benchmark questions
  const benchmarkQuestions = await loadBenchmarkQuestions();
  logger.found('Loaded benchmark questions', { count: benchmarkQuestions.length });

  // 2. Get last report info
  const lastReport = await getLastReport();
  const avgScore = lastReport?.avgScore ?? 3.0;
  const weakCategories = lastReport?.weakCategories ?? [];

  // 3. Optionally generate synthetic questions
  let syntheticQuestions: BenchmarkQuestion[] = [];
  const skipSynthetic = process.env.SKIP_SYNTHETIC === 'true';
  const syntheticCount = configService.get('evaluation.synthetic.count', 5);

  if (!skipSynthetic && isAnthropicConfigured()) {
    const difficulty = syntheticGenerator.calculateDifficulty(avgScore);
    syntheticQuestions = await syntheticGenerator.generateQuestions(syntheticCount, {
      weakCategories,
      currentDifficulty: difficulty,
      recentQuestions: benchmarkQuestions.slice(0, 10).map(q => q.question)
    });
    logger.found('Generated synthetic questions', { count: syntheticQuestions.length });
  }

  // 4. Limit questions for evaluation
  const rawQuestionCount = parseInt(process.env.QUESTION_COUNT || '20', 10);
  const questionCount = Number.isNaN(rawQuestionCount) ? 20 : rawQuestionCount;
  const allQuestions = [...benchmarkQuestions, ...syntheticQuestions].slice(0, questionCount);
  logger.processing(`Evaluating ${allQuestions.length} questions...`);

  // 5. Run evaluations with failure tracking
  const results: EvaluationResult[] = [];
  let errorCount = 0;
  const rateLimitMs = configService.get('evaluation.rateLimitMs', 1000);

  for (const q of allQuestions) {
    logger.search(`Testing: ${q.question.substring(0, 50)}...`);

    try {
      const { response, agentsUsed } = await executeChat(q.question);

      const scores = await evaluationService.evaluateResponse(
        q.question,
        response,
        q.expectedAgents,
        agentsUsed
      );

      if (scores.isError) {
        errorCount++;
      }

      results.push({
        questionId: q.id,
        question: q.question,
        category: q.category,
        response: response.substring(0, 500),
        scores,
        evaluatedAt: new Date()
      });

      await sleep(rateLimitMs);
    } catch (error: unknown) {
      errorCount++;
      const message = error instanceof Error ? error.message : String(error);
      logger.fail(`Evaluation error for question`, { question: q.question.substring(0, 50), error: message });
    }

    // Abort if too many failures (systemic issue like expired API key)
    const totalProcessed = results.length + errorCount;
    if (totalProcessed >= 5 && errorCount / totalProcessed > (1 - MIN_SUCCESS_RATE)) {
      logger.fail('Aborting evaluation: too many failures', {
        errorCount,
        totalProcessed,
        threshold: `${(1 - MIN_SUCCESS_RATE) * 100}%`
      });
      break;
    }
  }

  // 6. Guard: don't generate an empty report
  if (results.length === 0) {
    logger.fail('No evaluation results to report');
    process.exit(1);
  }

  // 7. Generate report
  const date = new Date().toISOString().split('T')[0];
  const report = generateReport(results, errorCount, date);

  // 8. Save report
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const reportPath = path.join(REPORTS_DIR, `${date}.md`);
  fs.writeFileSync(reportPath, report);
  logger.success(`Report saved to: ${reportPath}`);

  // 9. Summary
  const averages = evaluationService.calculateAverages(results);
  logger.complete('Daily evaluation complete', {
    overall: averages.overall.toFixed(2),
    evaluated: results.length,
    errors: errorCount
  });
};

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.fail('Evaluation failed', { error: message, stack });
  process.exit(1);
});
