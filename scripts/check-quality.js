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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(`${color}${message}${colors.reset}`);
  
  // Also write to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (e) {
    // Ignore log file errors
  }
}

function logHeader(message) {
  const border = '═'.repeat(60);
  log('');
  log(border, colors.cyan);
  log(`  ${message}`, colors.bright + colors.cyan);
  log(border, colors.cyan);
  log('');
}

function logSection(title) {
  log(`\n▶ ${title}`, colors.yellow);
  log('─'.repeat(40), colors.yellow);
}

function runReview() {
  logHeader('🏛️  PRINCIPAL ARCHITECT CODE REVIEW');
  log(`📅 Review started at: ${new Date().toLocaleString()}`, colors.blue);
  log(`📁 Working directory: ${process.cwd()}`, colors.blue);
  
  try {
    // Step 1: Check if we're in a git repository
    logSection('Step 1: Validating Git Repository');
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      log('✅ Git repository detected', colors.green);
    } catch (e) {
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
    } catch (e) {
      log(`⚠️ Base branch '${BASE_BRANCH}' not found locally, trying origin/${BASE_BRANCH}`, colors.yellow);
      try {
        execSync(`git fetch origin ${BASE_BRANCH}`, { stdio: 'pipe' });
      } catch (e2) {
        log(`❌ Could not fetch ${BASE_BRANCH}`, colors.red);
      }
    }

    // Step 4: Get the diff
    logSection('Step 3: Analyzing Changes');
    let diff;
    let diffStats;
    
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
    const insertionsMatch = diffStats.match(/(\d+) insertions?/);
    const deletionsMatch = diffStats.match(/(\d+) deletions?/);
    const insertions = insertionsMatch ? insertionsMatch[1] : '0';
    const deletions = deletionsMatch ? deletionsMatch[1] : '0';
    
    log(`📊 Files changed: ${filesChanged}`, colors.blue);
    log(`➕ Lines added: ${insertions}`, colors.green);
    log(`➖ Lines removed: ${deletions}`, colors.red);

    // Step 7: Show sample of diff for context
    logSection('Step 5: Diff Preview (first 50 lines)');
    const diffLines = diff.split('\n').slice(0, 50);
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
    
    if (diff.split('\n').length > 50) {
      log(`\n... and ${diff.split('\n').length - 50} more lines`, colors.yellow);
    }

    // Step 8: Automated checks (simplified for new changes only)
    logSection('Step 6: Automated Quality Checks');
    
    let autoScore = 100;
    const issues = [];
    const warnings = [];

    // Only check NEW lines (lines starting with +)
    const newLines = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
    
    // Check for console.log (should use proper logger)
    const consoleLogCount = newLines.filter(line => /console\.(log|warn|error)/.test(line)).length;
    if (consoleLogCount > 10) {
      warnings.push(`🟡 console.log usage: ${consoleLogCount} instance(s) - Consider using proper logger`);
      autoScore -= Math.min(20, Math.floor(consoleLogCount / 5));
    }

    // Check for 'any' type
    const anyTypeCount = newLines.filter(line => /:\s*any\b/.test(line)).length;
    if (anyTypeCount > 5) {
      warnings.push(`🟡 'any' type usage: ${anyTypeCount} instance(s) - Prefer explicit types`);
      autoScore -= Math.min(15, Math.floor(anyTypeCount / 3));
    }

    // Check for TODO/FIXME
    const todoCount = newLines.filter(line => /\/\/\s*(TODO|FIXME|XXX|HACK)/i.test(line)).length;
    if (todoCount > 0) {
      warnings.push(`🟡 TODO/FIXME comments: ${todoCount} instance(s)`);
      autoScore -= Math.min(5, todoCount);
    }

    // Check for new hardcoded localhost URLs
    const localhostCount = newLines.filter(line => /['"`]http:\/\/localhost/.test(line)).length;
    if (localhostCount > 3) {
      issues.push(`🔴 Hardcoded localhost URLs: ${localhostCount} instance(s) - Use config`);
      autoScore -= Math.min(15, localhostCount * 2);
    }

    // Cap score at 0-100 range
    autoScore = Math.max(0, Math.min(100, autoScore));

    // Display results
    if (issues.length > 0) {
      log('\n🔴 Critical Issues Found:', colors.red);
      issues.forEach(issue => log(`   ${issue}`, colors.red));
    }
    
    if (warnings.length > 0) {
      log('\n🟡 Warnings:', colors.yellow);
      warnings.forEach(warning => log(`   ${warning}`, colors.yellow));
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      log('✅ No significant automated issues detected', colors.green);
    }

    log(`\n📊 Automated Pre-Score: ${autoScore}/100`, autoScore >= 80 ? colors.green : colors.yellow);

    // Step 9: Manual review prompt
    logSection('Step 7: Manual Review Required');
    
    log('', colors.reset);
    log('╔══════════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║                    🏛️  MANUAL REVIEW REQUIRED                    ║', colors.cyan);
    log('╠══════════════════════════════════════════════════════════════════╣', colors.cyan);
    log('║  Copy the following command into Cursor Chat for full review:   ║', colors.cyan);
    log('╚══════════════════════════════════════════════════════════════════╝', colors.cyan);
    log('', colors.reset);
    log('  "Review my changes for push using the Principal Architect rule"', colors.bright + colors.magenta);
    log('', colors.reset);

    // Step 10: Non-interactive mode - allow push with warning
    logSection('Step 8: Push Decision');
    
    // For git hooks (non-interactive), we allow the push but log warnings
    if (!process.stdin.isTTY) {
      log('⚠️ Non-interactive mode detected (git hook)', colors.yellow);
      log(`📊 Automated Pre-Score: ${autoScore}/100`, autoScore >= MIN_PASSING_SCORE ? colors.green : colors.yellow);
      
      if (issues.length > 0) {
        log('', colors.reset);
        log('⚠️ ISSUES DETECTED - Please review in Cursor before merging!', colors.yellow);
        issues.forEach(issue => log(`   ${issue}`, colors.red));
      }
      
      log('', colors.reset);
      log('✅ Push proceeding (non-interactive mode)', colors.green);
      log('📝 IMPORTANT: Complete manual review in Cursor before merging to main!', colors.bright + colors.yellow);
      
      // Log the push
      const logEntry = `[${new Date().toISOString()}] PUSHED - Branch: ${currentBranch}, Auto-Score: ${autoScore}/100, Files: ${filesChanged}, Issues: ${issues.length}, Warnings: ${warnings.length}\n`;
      fs.appendFileSync(LOG_FILE, logEntry);
      
      process.exit(0);
    }

    // Interactive mode - ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

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

  } catch (error) {
    log(`\n❌ Review script error: ${error.message}`, colors.red);
    if (error.stderr) {
      log(`   stderr: ${error.stderr}`, colors.red);
    }
    // On error, allow push but log the issue
    log('⚠️ Continuing push despite script error...', colors.yellow);
    process.exit(0);
  }
}

// Entry point
log(`\n🚀 Quality Check Script v1.0.0`, colors.cyan);
log(`📋 Minimum passing score: ${MIN_PASSING_SCORE}/100`, colors.blue);
log(`📂 Log file: ${LOG_FILE}`, colors.blue);

runReview();

