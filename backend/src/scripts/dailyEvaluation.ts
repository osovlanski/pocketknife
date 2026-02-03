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
 * Usage: npx ts-node src/scripts/dailyEvaluation.ts
 * Or: npm run evaluate:daily
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { evaluationService, syntheticGenerator } from '../services/evaluation';
import type { EvaluationResult, BenchmarkQuestion } from '../services/evaluation';

// Load environment variables
import 'dotenv/config';

const REPORTS_DIR = path.join(__dirname, '../../../docs/quality-reports');
const BENCHMARK_PATH = path.join(__dirname, '../data/benchmark-questions.json');

interface BenchmarkFile {
  version: string;
  description: string;
  questions: BenchmarkQuestion[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadBenchmarkQuestions(): Promise<BenchmarkQuestion[]> {
  try {
    const content = fs.readFileSync(BENCHMARK_PATH, 'utf8');
    const data: BenchmarkFile = JSON.parse(content);
    return data.questions;
  } catch (error) {
    console.log('Could not load benchmark questions, using defaults');
    return [
      { id: 'default-1', question: 'What can you help me with?', category: 'general', difficulty: 1, expectedAgents: [] },
      { id: 'default-2', question: 'Find me remote developer jobs', category: 'jobs', difficulty: 2, expectedAgents: ['jobs'] },
      { id: 'default-3', question: 'Suggest a quick dinner recipe', category: 'cooking', difficulty: 2, expectedAgents: ['cooking'] }
    ];
  }
}

async function getLastReport(): Promise<{ avgScore: number; weakCategories: string[] } | null> {
  try {
    if (!fs.existsSync(REPORTS_DIR)) return null;
    
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    
    if (files.length === 0) return null;
    
    // Parse basic info from last report (simplified)
    const content = fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf8');
    const overallMatch = content.match(/Overall.*?(\d+\.?\d*)/);
    const avgScore = overallMatch ? parseFloat(overallMatch[1]) : 3.0;
    
    return { avgScore, weakCategories: [] };
  } catch (error) {
    return null;
  }
}

async function executeChat(question: string): Promise<{ response: string; agentsUsed: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic();

  // Simulate the assistant's response (in full implementation, call actual assistant service)
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 800,
    system: `You are Pocketknife, a helpful AI assistant with specialized agents for:
- Cooking: Recipe suggestions, meal planning
- Jobs: Job search, career advice
- Travel: Trip planning, flight/hotel search
- Learning: Educational resources, tutorials
- Shopping: Deal finding, price comparison
- Problems: Coding practice problems
- ToDo: Task management

Respond helpfully to the user's question.`,
    messages: [{ role: 'user', content: question }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Detect which agents would be used (simplified detection)
  const agentsUsed: string[] = [];
  const lowerQ = question.toLowerCase();
  if (lowerQ.includes('recipe') || lowerQ.includes('cook') || lowerQ.includes('dinner')) agentsUsed.push('cooking');
  if (lowerQ.includes('job') || lowerQ.includes('career')) agentsUsed.push('jobs');
  if (lowerQ.includes('trip') || lowerQ.includes('travel') || lowerQ.includes('flight')) agentsUsed.push('travel');
  if (lowerQ.includes('learn') || lowerQ.includes('tutorial')) agentsUsed.push('learning');
  if (lowerQ.includes('price') || lowerQ.includes('deal') || lowerQ.includes('buy')) agentsUsed.push('shopping');
  if (lowerQ.includes('problem') || lowerQ.includes('leetcode')) agentsUsed.push('problems');
  if (lowerQ.includes('task') || lowerQ.includes('todo')) agentsUsed.push('todo');

  return { response: text, agentsUsed };
}

function generateReport(results: EvaluationResult[], date: string): string {
  const averages = evaluationService.calculateAverages(results);
  const byCategory = evaluationService.groupByCategory(results);

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

  report += `## Questions Evaluated: ${results.length}\n\n`;

  report += `## Category Breakdown\n\n`;
  for (const [category, catResults] of Object.entries(byCategory)) {
    const catAvg = evaluationService.calculateAverages(catResults);
    report += `- **${category}**: ${catAvg.overall.toFixed(2)}/5 (${catResults.length} questions)\n`;
  }

  report += `\n## Detailed Results\n\n`;
  for (const r of results.slice(0, 10)) {
    report += `### ${r.question.substring(0, 60)}...\n`;
    report += `- **Category**: ${r.category}\n`;
    report += `- **Scores**: Accuracy ${r.scores.accuracy}, Helpfulness ${r.scores.helpfulness}, Clarity ${r.scores.clarity}\n`;
    report += `- **Overall**: ${r.scores.overall.toFixed(2)}/5\n`;
    if (r.scores.feedback) {
      report += `- **Feedback**: ${r.scores.feedback}\n`;
    }
    report += `\n`;
  }

  if (results.length > 10) {
    report += `*...and ${results.length - 10} more questions*\n\n`;
  }

  report += `---\n*Generated by Daily Quality Evaluation workflow*\n`;

  return report;
}

async function main() {
  console.log('Starting daily quality evaluation...');

  // 1. Load benchmark questions
  const benchmarkQuestions = await loadBenchmarkQuestions();
  console.log(`Loaded ${benchmarkQuestions.length} benchmark questions`);

  // 2. Get last report info
  const lastReport = await getLastReport();
  const avgScore = lastReport?.avgScore ?? 3.0;
  const weakCategories = lastReport?.weakCategories ?? [];

  // 3. Optionally generate synthetic questions
  let syntheticQuestions: BenchmarkQuestion[] = [];
  const skipSynthetic = process.env.SKIP_SYNTHETIC === 'true';
  
  if (!skipSynthetic && process.env.ANTHROPIC_API_KEY) {
    const difficulty = syntheticGenerator.calculateDifficulty(avgScore);
    syntheticQuestions = await syntheticGenerator.generateQuestions(5, {
      weakCategories,
      currentDifficulty: difficulty,
      recentQuestions: benchmarkQuestions.slice(0, 10).map(q => q.question)
    });
    console.log(`Generated ${syntheticQuestions.length} synthetic questions`);
  }

  // 4. Limit questions for evaluation
  const questionCount = parseInt(process.env.QUESTION_COUNT || '20');
  const allQuestions = [...benchmarkQuestions, ...syntheticQuestions].slice(0, questionCount);
  console.log(`Evaluating ${allQuestions.length} questions...`);

  // 5. Run evaluations
  const results: EvaluationResult[] = [];

  for (const q of allQuestions) {
    console.log(`Testing: ${q.question.substring(0, 50)}...`);

    try {
      // Execute chat
      const { response, agentsUsed } = await executeChat(q.question);

      // Evaluate response
      const scores = await evaluationService.evaluateResponse(
        q.question,
        response,
        q.expectedAgents,
        agentsUsed
      );

      results.push({
        questionId: q.id,
        question: q.question,
        category: q.category,
        response: response.substring(0, 500),
        scores,
        evaluatedAt: new Date()
      });

      // Rate limit: 1 second between requests
      await sleep(1000);
    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
    }
  }

  // 6. Generate report
  const date = new Date().toISOString().split('T')[0];
  const report = generateReport(results, date);

  // 7. Save report
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const reportPath = path.join(REPORTS_DIR, `${date}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`Report saved to: ${reportPath}`);

  // 8. Summary
  const averages = evaluationService.calculateAverages(results);
  console.log(`\nDaily evaluation complete!`);
  console.log(`Overall score: ${averages.overall.toFixed(2)}/5`);
  console.log(`Questions evaluated: ${results.length}`);
}

main().catch(error => {
  console.error('Evaluation failed:', error.message);
  process.exit(1);
});
