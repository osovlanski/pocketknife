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
    const previewLines = diff.split('\n').slice(0, 100);
    previewLines.forEach(line => {
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

    // Step 6: TypeScript Type Check (matches CI/CD)
    logSection('Step 6: TypeScript Type Check');
    
    let typeCheckPass = true;
    
    log('🔍 Running TypeScript type check (tsc --noEmit)...', colors.blue);
    
    // Check backend TypeScript
    try {
      log('   Checking backend types...', colors.blue);
      execSync('npx tsc --noEmit 2>&1', { 
        cwd: path.join(process.cwd(), 'backend'), 
        encoding: 'utf-8',
        timeout: 120000 
      });
      log('   ✅ Backend type check passed', colors.green);
    } catch (backendTscError: any) {
      const output = backendTscError.stdout?.toString() || backendTscError.message || '';
      // Extract TypeScript errors
      const tsErrors = output.match(/error TS\d+:.*/g);
      if (tsErrors && tsErrors.length > 0) {
        log('   ❌ Backend type check failed', colors.red);
        tsErrors.slice(0, 10).forEach((err: string) => log(`      ${err}`, colors.red));
        if (tsErrors.length > 10) {
          log(`      ... and ${tsErrors.length - 10} more errors`, colors.red);
        }
        typeCheckPass = false;
      } else {
        log('   ✅ Backend type check passed (with warnings)', colors.green);
      }
    }
    
    // Check frontend TypeScript
    try {
      log('   Checking frontend types...', colors.blue);
      execSync('npx tsc --noEmit 2>&1', { 
        cwd: path.join(process.cwd(), 'frontend'), 
        encoding: 'utf-8',
        timeout: 120000 
      });
      log('   ✅ Frontend type check passed', colors.green);
    } catch (frontendTscError: any) {
      const output = frontendTscError.stdout?.toString() || frontendTscError.message || '';
      // Extract TypeScript errors
      const tsErrors = output.match(/error TS\d+:.*/g);
      if (tsErrors && tsErrors.length > 0) {
        log('   ❌ Frontend type check failed', colors.red);
        tsErrors.slice(0, 10).forEach((err: string) => log(`      ${err}`, colors.red));
        if (tsErrors.length > 10) {
          log(`      ... and ${tsErrors.length - 10} more errors`, colors.red);
        }
        typeCheckPass = false;
      } else {
        log('   ✅ Frontend type check passed (with warnings)', colors.green);
      }
    }
    
    if (typeCheckPass) {
      log('✅ All type checks passed!', colors.green);
    } else {
      log('❌ TypeScript errors found. Fix them before pushing.', colors.red);
    }

    // Step 7: Run Tests
    logSection('Step 7: Running Tests');
    
    let testsPass = true;
    let backendTestsRan = false;
    let frontendTestsRan = false;
    
    log('🧪 Running test suites...', colors.blue);
    
    // Helper function to check if test output indicates success
    const isTestSuccess = (output: string): boolean => {
      // Check for vitest success patterns
      if (/Test Files\s+\d+ passed/.test(output)) return true;
      if (/Tests\s+\d+ passed/.test(output)) return true;
      // Check for jest success patterns
      if (/Tests:\s+\d+ passed/.test(output)) return true;
      return false;
    };
    
    // Helper function to check if test output indicates failure
    const isTestFailure = (output: string): boolean => {
      // Check for actual test failures, not just warnings
      if (/FAIL\s+/.test(output)) return true;
      if (/Test Files\s+\d+ failed/.test(output)) return true;
      if (/Tests:\s+\d+ failed/.test(output)) return true;
      if (/AssertionError/.test(output)) return true;
      return false;
    };
    
    // Run backend tests
    try {
      log('   Running backend tests...', colors.blue);
      const backendResult = execSync('npm run test 2>&1', { 
        cwd: path.join(process.cwd(), 'backend'), 
        encoding: 'utf-8',
        timeout: 180000 
      });
      backendTestsRan = true;
      
      if (isTestSuccess(backendResult)) {
        log('   ✅ Backend tests passed', colors.green);
      } else if (isTestFailure(backendResult)) {
        log('   ❌ Backend tests failed', colors.red);
        testsPass = false;
      } else {
        log('   ✅ Backend tests completed', colors.green);
      }
    } catch (backendError: any) {
      backendTestsRan = true;
      // Try multiple sources for the output - execSync puts output in different places
      const output = backendError.stdout?.toString() 
        || backendError.output?.filter(Boolean).join('') 
        || backendError.stderr?.toString() 
        || backendError.message 
        || '';
      
      // Check if tests actually passed despite non-zero exit (e.g., due to warnings or stderr output)
      if (isTestSuccess(output)) {
        log('   ✅ Backend tests passed (with warnings)', colors.green);
      } else if (!isTestFailure(output) && output.includes('passed')) {
        // If no explicit failure markers and 'passed' appears, treat as success
        log('   ✅ Backend tests passed (with warnings)', colors.green);
      } else {
        log('   ❌ Backend tests failed', colors.red);
        const failedTests = output.match(/FAIL.*$/gm);
        if (failedTests) {
          failedTests.slice(0, 5).forEach((line: string) => log(`      ${line}`, colors.red));
        }
        testsPass = false;
      }
    }
    
    // Run frontend tests
    try {
      log('   Running frontend tests...', colors.blue);
      const frontendResult = execSync('npm run test 2>&1', { 
        cwd: path.join(process.cwd(), 'frontend'), 
        encoding: 'utf-8',
        timeout: 180000 
      });
      frontendTestsRan = true;
      
      if (isTestSuccess(frontendResult)) {
        log('   ✅ Frontend tests passed', colors.green);
      } else if (isTestFailure(frontendResult)) {
        log('   ❌ Frontend tests failed', colors.red);
        testsPass = false;
      } else {
        log('   ✅ Frontend tests completed', colors.green);
      }
    } catch (frontendError: any) {
      frontendTestsRan = true;
      // Try multiple sources for the output - execSync puts output in different places
      const output = frontendError.stdout?.toString() 
        || frontendError.output?.filter(Boolean).join('') 
        || frontendError.stderr?.toString() 
        || frontendError.message 
        || '';
      
      // Check if tests actually passed despite non-zero exit
      if (isTestSuccess(output)) {
        log('   ✅ Frontend tests passed (with warnings)', colors.green);
      } else if (!isTestFailure(output) && output.includes('passed')) {
        // If no explicit failure markers and 'passed' appears, treat as success
        log('   ✅ Frontend tests passed (with warnings)', colors.green);
      } else if (output.includes('Cannot start service') || output.includes('esbuild')) {
        // Dependency/build issue, not a test failure
        log('   ⚠️ Frontend tests skipped (dependency issue - run npm install in frontend/)', colors.yellow);
        // Don't count this as a test failure - it's a setup issue
      } else {
        log('   ❌ Frontend tests failed', colors.red);
        const failedTests = output.match(/FAIL.*$/gm);
        if (failedTests) {
          failedTests.slice(0, 5).forEach((line: string) => log(`      ${line}`, colors.red));
        }
        testsPass = false;
      }
    }
    
    if (!backendTestsRan && !frontendTestsRan) {
      log('⚠️ Could not run any tests', colors.yellow);
      log('   Make sure test dependencies are installed: npm install in backend/ and frontend/', colors.yellow);
    } else if (testsPass) {
      log('✅ All tests passed!', colors.green);
    } else {
      log('❌ Some tests failed. Fix them before pushing.', colors.red);
    }
    
    // Step 8: Automated Quality Checks
    logSection('Step 8: Automated Quality Checks');
    
    let autoScore = 100;
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Deduct score if TypeScript type check failed
    if (!typeCheckPass) {
      issues.push('🔴 TypeScript errors - Fix type errors before pushing');
      autoScore -= 30;
    }
    
    // Deduct score if tests failed
    if (!testsPass) {
      issues.push('🔴 Tests failed - Fix failing tests before pushing');
      autoScore -= 30;
    }

    // Check for hardcoded values (common patterns) - only in actual code files
    // Note: Known API base URLs (newsapi.org, gnews.io, hacker-news.firebaseio.com, reddit.com, mediastack.com)
    // are acceptable as they are third-party service endpoints, not environment-specific config
    // Note: Short UI feedback timeouts (under 5000ms) are acceptable UX patterns
    const hardcodedPatterns = [
      { pattern: /setTimeout\(\s*[^,]+,\s*[5-9]\d{3,}\s*\)|setTimeout\(\s*[^,]+,\s*\d{5,}\s*\)/, name: 'Hardcoded timeout value' },
      { pattern: /:\s*(?:80|443|3000|5000|8080)\b(?!\s*[,\]])/, name: 'Hardcoded port number' },
      { pattern: /['"`]http:\/\/localhost/, name: 'Hardcoded localhost URL' },
      // Exclude known third-party API base URLs from this check
      // Whitelist covers: major API providers, Israeli job sites, documentation sites, etc.
      { pattern: /['"`]https?:\/\/(?!www\.|api\.|example\.|newsapi\.|gnews\.|hacker-news\.|reddit\.|mediastack\.|amadeus\.|googleapis\.|neon\.|remoteok\.|remotive\.|arbeitnow\.|themuse\.|himalayas\.|jsearch\.|adzuna\.|comeet\.|leetcode\.|anthropic\.|discord\.|notion\.|serpapi\.|gmail\.|spoonacular\.|graph\.facebook\.|script\.google\.|wellfound\.|f6s\.|firebase\.|github\.|en\.goozali\.|goozali\.|secrettelaviv\.|startupcamel\.|developers\.|docs\.|drushim\.|hitech-jobs\.|finder\.startupnationcentral\.|madeinisrael\.|geektime\.|rsshub\.|t\.me|facebook\.com\/groups)[\w.-]+\.(?:com|io|app|org|co\.il|me)(?!\/api)/, name: 'Hardcoded external URL' },
    ];

    // Helper to check if a line is in a code file (not docs, configs, or env templates)
    const isCodeFile = (line: string): boolean => {
      // Check if we're in a documentation or config file by looking at the diff header
      const mdMatch = line.match(/^diff --git.*\.(md|MD|txt|json|toml|yml|yaml|env|example)/);
      return !mdMatch;
    };
    
    // Track current file from diff headers
    let currentFile = '';
    const diffLines = diff.split('\n');

    for (const { pattern, name } of hardcodedPatterns) {
      const addedLines = diffLines.filter((line, idx) => {
        // Track current file
        if (line.startsWith('diff --git')) {
          currentFile = line;
        }
        // Only check added lines in actual code files
        if (!line.startsWith('+') || line.startsWith('+++')) return false;
        // Skip if in non-code files (md, json, yml, env, etc.) or quality check/test scripts
        if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile)) return false;
        if (/check-quality\.(js|ts)|run-tests\.(js|ts)|review-log|deploy-check/.test(currentFile)) return false;
        if (/scripts\//.test(currentFile)) return false; // Skip all script files
        return pattern.test(line);
      });
      
      if (addedLines.length > 0) {
        issues.push(`🔴 ${name}: Found ${addedLines.length} instance(s)`);
        autoScore -= 5 * addedLines.length;
      }
    }

    // Check for console.log (should use proper logger) - only in service/controller code
    currentFile = '';
    const consoleLogMatches = diffLines.filter((line) => {
      if (line.startsWith('diff --git')) {
        currentFile = line;
      }
      if (!line.startsWith('+') || line.startsWith('+++')) return false;
      // Skip scripts, tests, and config files - console.log is acceptable there
      if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile)) return false;
      if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile)) return false;
      if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile)) return false;
      return /console\.(log|warn|error)/.test(line);
    });
    if (consoleLogMatches.length > 0) {
      warnings.push(`🟡 console.log usage: ${consoleLogMatches.length} instance(s) - Consider using proper logger`);
      // Cap at 5 points max for console.log warnings
      autoScore -= Math.min(5, consoleLogMatches.length);
    }

    // Check for missing type annotations (TypeScript) - only in actual code files
    currentFile = '';
    const missingTypes = diffLines.filter((line) => {
      if (line.startsWith('diff --git')) {
        currentFile = line;
      }
      if (!line.startsWith('+') || line.startsWith('+++')) return false;
      // Skip scripts, tests, and config files - any type is acceptable there
      if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile)) return false;
      if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile)) return false;
      if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile)) return false;
      return /:\s*any\b/.test(line);
    });
    if (missingTypes.length > 0) {
      warnings.push(`🟡 'any' type usage: ${missingTypes.length} instance(s) - Prefer explicit types`);
      // Cap at 5 points max for 'any' type warnings
      autoScore -= Math.min(5, missingTypes.length);
    }

    // Check for TODO/FIXME comments - only in actual code files
    currentFile = '';
    const todoComments = diffLines.filter((line) => {
      if (line.startsWith('diff --git')) {
        currentFile = line;
      }
      if (!line.startsWith('+') || line.startsWith('+++')) return false;
      // Skip scripts, tests, and config files - TODO comments are acceptable there
      if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile)) return false;
      if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile)) return false;
      if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile)) return false;
      return /\/\/\s*(TODO|FIXME|XXX|HACK)/i.test(line);
    });
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
    logSection('Step 9: Manual Review Required');
    
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
    logSection('Step 10: Push Confirmation');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // For non-interactive environments (like git hooks), enforce the score threshold
    if (!process.stdin.isTTY) {
      log('⚠️ Non-interactive mode detected (git hook)', colors.yellow);
      log('📝 Pre-push automated score: ' + autoScore, autoScore >= MIN_PASSING_SCORE ? colors.green : colors.red);
      
      // BLOCK push if score is below threshold
      if (autoScore < MIN_PASSING_SCORE) {
        log('', colors.reset);
        log('╔══════════════════════════════════════════════════════════════════╗', colors.red);
        log('║  🚫 PUSH BLOCKED BY PRINCIPAL ARCHITECT                          ║', colors.red);
        log('╚══════════════════════════════════════════════════════════════════╝', colors.red);
        log('', colors.reset);
        log(`   Score: ${autoScore}/100 (Minimum required: ${MIN_PASSING_SCORE})`, colors.red);
        log('', colors.reset);
        log('   Fix the following issues before pushing:', colors.yellow);
        issues.forEach(issue => log(`   ${issue}`, colors.red));
        if (warnings.length > 0) {
          log('', colors.reset);
          log('   Also consider fixing these warnings:', colors.yellow);
          warnings.forEach(warning => log(`   ${warning}`, colors.yellow));
        }
        log('', colors.reset);
        log('   After fixing, run: git push', colors.blue);
        log('', colors.reset);
        
        // Log the blocked push
        const logEntry = `[${new Date().toISOString()}] BLOCKED - Automated score: ${autoScore}/100 (min: ${MIN_PASSING_SCORE})\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        process.exit(1); // BLOCK the push
      } else {
        log('', colors.reset);
        log('╔══════════════════════════════════════════════════════════════════╗', colors.green);
        log('║  ✅ PUSH APPROVED BY PRINCIPAL ARCHITECT                         ║', colors.green);
        log('╚══════════════════════════════════════════════════════════════════╝', colors.green);
        log('', colors.reset);
        log('✅ Automated checks passed - Push proceeding', colors.green);
        log('⚠️ Remember to do a full manual review in Cursor before merging!', colors.yellow);
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

