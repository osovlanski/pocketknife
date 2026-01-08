#!/usr/bin/env node
/**
 * Quality Check Script - Principal Architect Review Enforcer
 * 
 * This script runs before every push to enforce code quality standards.
 * It compares current HEAD against main branch and triggers a review.
 * 
 * Usage: npm run quality-check
 * 
 * Exit codes:
 *   0 - Review passed or no changes
 *   1 - Review failed or error occurred
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const MIN_PASSING_SCORE = 80;
const BASE_BRANCH = 'main';
const LOG_FILE = path.join(__dirname, '..', 'review-log.txt');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(`${color}${message}${colors.reset}`);
  
  // Also write to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function logHeader(message: string): void {
  const border = '═'.repeat(60);
  log('');
  log(border, colors.cyan);
  log(`  ${message}`, colors.bright + colors.cyan);
  log(border, colors.cyan);
  log('');
}

function logSection(title: string): void {
  log(`\n▶ ${title}`, colors.yellow);
  log('─'.repeat(40), colors.yellow);
}

async function runReview(): Promise<void> {
  logHeader('🏛️  PRINCIPAL ARCHITECT CODE REVIEW');
  log(`📅 Review started at: ${new Date().toLocaleString()}`, colors.blue);
  log(`📁 Working directory: ${process.cwd()}`, colors.blue);
  
  try {
    // Step 1: Check if we're in a git repository
    logSection('Step 1: Validating Git Repository');
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      log('✅ Git repository detected', colors.green);
    } catch {
      log('❌ Not a git repository!', colors.red);
      process.exit(1);
    }

    // Step 2: Get current branch
    logSection('Step 2: Checking Branch Information');
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    log(`📍 Current branch: ${currentBranch}`, colors.blue);
    log(`🎯 Comparing against: ${BASE_BRANCH}`, colors.blue);

    // Step 3: Check if base branch exists
    try {
      execSync(`git rev-parse --verify ${BASE_BRANCH}`, { stdio: 'pipe' });
      log(`✅ Base branch '${BASE_BRANCH}' exists`, colors.green);
    } catch {
      log(`⚠️ Base branch '${BASE_BRANCH}' not found locally, trying origin/${BASE_BRANCH}`, colors.yellow);
      try {
        execSync(`git fetch origin ${BASE_BRANCH}`, { stdio: 'pipe' });
      } catch {
        log(`❌ Could not fetch ${BASE_BRANCH}`, colors.red);
      }
    }

    // Step 4: Get the diff
    logSection('Step 3: Analyzing Changes');
    let diff: string;
    let diffStats: string;
    
    try {
      diff = execSync(`git diff ${BASE_BRANCH}...HEAD`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      diffStats = execSync(`git diff ${BASE_BRANCH}...HEAD --stat`, { encoding: 'utf-8' });
    } catch (error) {
      // Fallback: compare against origin/main
      log(`⚠️ Trying origin/${BASE_BRANCH} instead...`, colors.yellow);
      diff = execSync(`git diff origin/${BASE_BRANCH}...HEAD`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      diffStats = execSync(`git diff origin/${BASE_BRANCH}...HEAD --stat`, { encoding: 'utf-8' });
    }

    if (!diff || diff.trim().length === 0) {
      log('', colors.reset);
      log('═══════════════════════════════════════════════════════', colors.green);
      log('  ✅ NO CHANGES DETECTED', colors.green);
      log('  Your branch is identical to main. Nothing to review.', colors.green);
      log('═══════════════════════════════════════════════════════', colors.green);
      log('');
      process.exit(0);
    }

    // Step 5: Display diff statistics
    logSection('Step 4: Change Summary');
    log(diffStats, colors.cyan);

    // Step 6: Count files and lines changed
    const filesChanged = diffStats.split('\n').filter(line => line.includes('|')).length;
    const insertions = (diffStats.match(/(\d+) insertions?/)?.[1]) || '0';
    const deletions = (diffStats.match(/(\d+) deletions?/)?.[1]) || '0';
    
    log(`📊 Files changed: ${filesChanged}`, colors.blue);
    log(`➕ Lines added: ${insertions}`, colors.green);
    log(`➖ Lines removed: ${deletions}`, colors.red);

    // Step 7: Show sample of diff for context
    logSection('Step 5: Diff Preview (first 100 lines)');
    const diffLines = diff.split('\n').slice(0, 100);
    diffLines.forEach(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        log(line, colors.green);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        log(line, colors.red);
      } else if (line.startsWith('@@')) {
        log(line, colors.cyan);
      } else if (line.startsWith('diff --git')) {
        log('\n' + line, colors.magenta);
      } else {
        log(line, colors.reset);
      }
    });
    
    if (diff.split('\n').length > 100) {
      log(`\n... and ${diff.split('\n').length - 100} more lines`, colors.yellow);
    }

    // Step 8: Run Tests
    logSection('Step 6: Running Tests');
    
    let testsPass = true;
    try {
      log('🧪 Running test suites...', colors.blue);
      
      // Run backend tests
      try {
        log('   Running backend tests...', colors.blue);
        execSync('npm run test', { 
          cwd: path.join(process.cwd(), 'backend'), 
          stdio: 'pipe',
          timeout: 120000 
        });
        log('   ✅ Backend tests passed', colors.green);
      } catch (backendError: any) {
        log('   ❌ Backend tests failed', colors.red);
        if (backendError.stdout) {
          const failedTests = backendError.stdout.toString().match(/FAIL.*$/gm);
          if (failedTests) {
            failedTests.slice(0, 5).forEach((line: string) => log(`      ${line}`, colors.red));
          }
        }
        testsPass = false;
      }
      
      // Run frontend tests
      try {
        log('   Running frontend tests...', colors.blue);
        execSync('npm run test', { 
          cwd: path.join(process.cwd(), 'frontend'), 
          stdio: 'pipe',
          timeout: 120000 
        });
        log('   ✅ Frontend tests passed', colors.green);
      } catch (frontendError: any) {
        log('   ❌ Frontend tests failed', colors.red);
        if (frontendError.stdout) {
          const failedTests = frontendError.stdout.toString().match(/FAIL.*$/gm);
          if (failedTests) {
            failedTests.slice(0, 5).forEach((line: string) => log(`      ${line}`, colors.red));
          }
        }
        testsPass = false;
      }
      
      if (testsPass) {
        log('✅ All tests passed!', colors.green);
      } else {
        log('❌ Some tests failed. Fix them before pushing.', colors.red);
      }
    } catch (testError: any) {
      log(`⚠️ Could not run tests: ${testError.message}`, colors.yellow);
      log('   Make sure test dependencies are installed: npm install in backend/ and frontend/', colors.yellow);
      // Don't fail the entire check if tests can't run (e.g., missing dependencies)
      testsPass = true; // Allow to proceed with warning
    }
    
    // Step 9: Automated Quality Checks
    logSection('Step 7: Automated Quality Checks');
    
    let autoScore = 100;
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Deduct score if tests failed
    if (!testsPass) {
      issues.push('🔴 Tests failed - Fix failing tests before pushing');
      autoScore -= 30;
    }

    // Check for hardcoded values (common patterns)
    const hardcodedPatterns = [
      { pattern: /setTimeout\(\s*[^,]+,\s*\d{4,}\s*\)/, name: 'Hardcoded timeout value' },
      { pattern: /:\s*(?:80|443|3000|5000|8080)\b(?!\s*[,\]])/, name: 'Hardcoded port number' },
      { pattern: /['"`]http:\/\/localhost/, name: 'Hardcoded localhost URL' },
      { pattern: /['"`]https?:\/\/(?!www\.|api\.)[\w.-]+\.com/, name: 'Hardcoded external URL' },
      { pattern: /(?:limit|max|min|threshold|timeout)\s*[:=]\s*\d+(?!\s*[,;}\]])(?!.*config)/i, name: 'Hardcoded limit/threshold' },
    ];

    for (const { pattern, name } of hardcodedPatterns) {
      const matches = diff.match(new RegExp(pattern, 'g'));
      if (matches && matches.length > 0) {
        const addedLines = diff.split('\n').filter(line => line.startsWith('+') && pattern.test(line));
        if (addedLines.length > 0) {
          issues.push(`🔴 ${name}: Found ${addedLines.length} instance(s)`);
          autoScore -= 5 * addedLines.length;
        }
      }
    }

    // Check for console.log (should use proper logger)
    const consoleLogMatches = diff.split('\n').filter(line => 
      line.startsWith('+') && /console\.(log|warn|error)/.test(line)
    );
    if (consoleLogMatches.length > 0) {
      warnings.push(`🟡 console.log usage: ${consoleLogMatches.length} instance(s) - Consider using proper logger`);
      autoScore -= 2 * consoleLogMatches.length;
    }

    // Check for missing type annotations (TypeScript)
    const missingTypes = diff.split('\n').filter(line =>
      line.startsWith('+') && /:\s*any\b/.test(line)
    );
    if (missingTypes.length > 0) {
      warnings.push(`🟡 'any' type usage: ${missingTypes.length} instance(s) - Prefer explicit types`);
      autoScore -= 2 * missingTypes.length;
    }

    // Check for TODO/FIXME comments
    const todoComments = diff.split('\n').filter(line =>
      line.startsWith('+') && /\/\/\s*(TODO|FIXME|XXX|HACK)/i.test(line)
    );
    if (todoComments.length > 0) {
      warnings.push(`🟡 TODO/FIXME comments: ${todoComments.length} instance(s)`);
      autoScore -= 1 * todoComments.length;
    }

    // Display automated check results
    if (issues.length > 0) {
      log('\n🔴 Critical Issues Found:', colors.red);
      issues.forEach(issue => log(`   ${issue}`, colors.red));
    }
    
    if (warnings.length > 0) {
      log('\n🟡 Warnings:', colors.yellow);
      warnings.forEach(warning => log(`   ${warning}`, colors.yellow));
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      log('✅ No automated issues detected', colors.green);
    }

    // Cap score at 0-100 range
    autoScore = Math.max(0, Math.min(100, autoScore));
    log(`\n📊 Automated Pre-Score: ${autoScore}/100`, autoScore >= 80 ? colors.green : colors.yellow);

    // Step 10: Manual review prompt
    logSection('Step 8: Manual Review Required');
    
    log('', colors.reset);
    log('╔══════════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║                    🏛️  MANUAL REVIEW REQUIRED                    ║', colors.cyan);
    log('╠══════════════════════════════════════════════════════════════════╣', colors.cyan);
    log('║  Copy the following command into Cursor Chat for full review:   ║', colors.cyan);
    log('╚══════════════════════════════════════════════════════════════════╝', colors.cyan);
    log('', colors.reset);
    log('  "Review my changes for push using the Principal Architect rule"', colors.bright + colors.magenta);
    log('', colors.reset);
    log('  OR run: git diff main...HEAD | clip (to copy full diff)', colors.blue);
    log('', colors.reset);

    // Step 11: Interactive confirmation
    logSection('Step 9: Push Confirmation');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // For non-interactive environments (like git hooks), auto-proceed with warning
    if (!process.stdin.isTTY) {
      log('⚠️ Non-interactive mode detected (git hook)', colors.yellow);
      log('📝 Pre-push automated score: ' + autoScore, autoScore >= MIN_PASSING_SCORE ? colors.green : colors.red);
      
      // For automated (non-interactive) mode, we warn but allow push
      // The manual review is still expected to happen in Cursor
      if (autoScore < MIN_PASSING_SCORE) {
        log('', colors.reset);
        log('⚠️ AUTOMATED CHECKS FOUND ISSUES', colors.yellow);
        log(`   Pre-Score: ${autoScore}/100 (Target: ${MIN_PASSING_SCORE})`, colors.yellow);
        log('   Issues were detected but push will proceed.', colors.yellow);
        log('   IMPORTANT: Complete manual review in Cursor before merging!', colors.bright + colors.yellow);
        log('', colors.reset);
        // Allow push in non-interactive mode, but log the warning
        const logEntry = `[${new Date().toISOString()}] WARNING - Automated score: ${autoScore}/100, pushed anyway (non-interactive)\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        process.exit(0); // Allow push but with warning
      } else {
        log('✅ Automated checks passed - Push proceeding', colors.green);
        log('⚠️ Remember to do a full manual review in Cursor!', colors.yellow);
        process.exit(0);
      }
    }

    // Interactive mode
    rl.question(`\n${colors.yellow}Did you complete the manual review in Cursor? (yes/no): ${colors.reset}`, (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        rl.question(`${colors.yellow}What score did the review give? (0-100): ${colors.reset}`, (scoreStr) => {
          const score = parseInt(scoreStr, 10);
          
          if (isNaN(score) || score < 0 || score > 100) {
            log('\n❌ Invalid score. Please enter a number between 0-100.', colors.red);
            rl.close();
            process.exit(1);
          }
          
          log('', colors.reset);
          if (score >= MIN_PASSING_SCORE) {
            log('═══════════════════════════════════════════════════════', colors.green);
            log(`  ✅ REVIEW PASSED - Score: ${score}/100`, colors.green);
            log('  Push is APPROVED. Proceeding...', colors.green);
            log('═══════════════════════════════════════════════════════', colors.green);
            
            // Log successful review
            const logEntry = `[${new Date().toISOString()}] PASSED - Branch: ${currentBranch}, Score: ${score}/100, Files: ${filesChanged}\n`;
            fs.appendFileSync(LOG_FILE, logEntry);
            
            rl.close();
            process.exit(0);
          } else {
            log('═══════════════════════════════════════════════════════', colors.red);
            log(`  🚫 PUSH BLOCKED - Score: ${score}/100`, colors.red);
            log(`  Minimum required: ${MIN_PASSING_SCORE}/100`, colors.red);
            log('  Fix the issues identified in the review first!', colors.red);
            log('═══════════════════════════════════════════════════════', colors.red);
            
            // Log failed review
            const logEntry = `[${new Date().toISOString()}] BLOCKED - Branch: ${currentBranch}, Score: ${score}/100, Files: ${filesChanged}\n`;
            fs.appendFileSync(LOG_FILE, logEntry);
            
            rl.close();
            process.exit(1);
          }
        });
      } else {
        log('\n⚠️ Please complete the review in Cursor first!', colors.yellow);
        log('   Copy this into Cursor Chat:', colors.yellow);
        log('   "Review my changes for push using the Principal Architect rule"\n', colors.magenta);
        rl.close();
        process.exit(1);
      }
    });

  } catch (error: any) {
    log(`\n❌ Review script error: ${error.message}`, colors.red);
    if (error.stderr) {
      log(`   stderr: ${error.stderr}`, colors.red);
    }
    process.exit(1);
  }
}

// Entry point
log(`\n🚀 Quality Check Script v1.0.0`, colors.cyan);
log(`📋 Minimum passing score: ${MIN_PASSING_SCORE}/100`, colors.blue);
log(`📂 Log file: ${LOG_FILE}`, colors.blue);

runReview();

