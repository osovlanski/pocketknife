#!/usr/bin/env node
"use strict";
/**
 * Unified Test Runner
 *
 * Runs tests for both backend and frontend projects.
 * Generates coverage reports and fails if coverage thresholds are not met.
 *
 * Usage: npm run test:all
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Tests failed or coverage below threshold
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// ANSI colors
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
    console.log(`${color}${message}${colors.reset}`);
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
async function runProjectTests(projectName, projectPath, withCoverage = false) {
    const startTime = Date.now();
    const result = {
        project: projectName,
        passed: false,
        duration: 0,
        testCount: 0,
        failedCount: 0
    };
    logSection(`Testing ${projectName}`);
    log(`📁 Path: ${projectPath}`, colors.blue);
    // Check if node_modules exists
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        log(`⚠️ node_modules not found in ${projectName}, running npm install...`, colors.yellow);
        try {
            (0, child_process_1.execSync)('npm install', { cwd: projectPath, stdio: 'pipe' });
            log(`✅ Dependencies installed for ${projectName}`, colors.green);
        }
        catch (error) {
            result.error = `Failed to install dependencies: ${error.message}`;
            log(`❌ ${result.error}`, colors.red);
            return result;
        }
    }
    // Check if vitest is available
    const vitestPath = path.join(nodeModulesPath, '.bin', 'vitest');
    const vitestExists = fs.existsSync(vitestPath) || fs.existsSync(vitestPath + '.cmd');
    if (!vitestExists) {
        log(`⚠️ Vitest not installed in ${projectName}, installing...`, colors.yellow);
        try {
            (0, child_process_1.execSync)('npm install vitest @vitest/coverage-v8 --save-dev', { cwd: projectPath, stdio: 'pipe' });
            log(`✅ Vitest installed for ${projectName}`, colors.green);
        }
        catch (error) {
            result.error = `Failed to install vitest: ${error.message}`;
            log(`❌ ${result.error}`, colors.red);
            return result;
        }
    }
    // Run tests
    const testCmd = withCoverage ? 'npm run test:coverage' : 'npm run test';
    log(`🧪 Running: ${testCmd}`, colors.blue);
    try {
        const output = (0, child_process_1.execSync)(testCmd, {
            cwd: projectPath,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120000 // 2 minute timeout
        });
        // Parse test output for stats
        const testMatch = output.match(/(\d+)\s+passed/);
        const failedMatch = output.match(/(\d+)\s+failed/);
        result.testCount = testMatch ? parseInt(testMatch[1], 10) : 0;
        result.failedCount = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        result.passed = result.failedCount === 0;
        // Parse coverage if available
        if (withCoverage) {
            const statementsMatch = output.match(/Statements\s*:\s*([\d.]+)%/);
            const branchesMatch = output.match(/Branches\s*:\s*([\d.]+)%/);
            const functionsMatch = output.match(/Functions\s*:\s*([\d.]+)%/);
            const linesMatch = output.match(/Lines\s*:\s*([\d.]+)%/);
            if (statementsMatch) {
                result.coverage = {
                    statements: parseFloat(statementsMatch[1]),
                    branches: parseFloat(branchesMatch?.[1] || '0'),
                    functions: parseFloat(functionsMatch?.[1] || '0'),
                    lines: parseFloat(linesMatch?.[1] || '0')
                };
            }
        }
        log(`✅ ${projectName} tests passed (${result.testCount} tests)`, colors.green);
        if (result.coverage) {
            log(`📊 Coverage: ${result.coverage.statements}% statements, ${result.coverage.lines}% lines`, colors.blue);
        }
        console.log(output);
    }
    catch (error) {
        result.passed = false;
        result.error = error.message;
        // Try to extract test counts from error output
        const output = error.stdout || error.stderr || '';
        const testMatch = output.match(/(\d+)\s+passed/);
        const failedMatch = output.match(/(\d+)\s+failed/);
        result.testCount = testMatch ? parseInt(testMatch[1], 10) : 0;
        result.failedCount = failedMatch ? parseInt(failedMatch[1], 10) : 1;
        log(`❌ ${projectName} tests failed`, colors.red);
        if (error.stdout)
            console.log(error.stdout);
        if (error.stderr)
            console.error(error.stderr);
    }
    result.duration = Date.now() - startTime;
    return result;
}
async function main() {
    const args = process.argv.slice(2);
    const withCoverage = args.includes('--coverage') || args.includes('-c');
    const backendOnly = args.includes('--backend') || args.includes('-b');
    const frontendOnly = args.includes('--frontend') || args.includes('-f');
    logHeader('🧪 UNIFIED TEST RUNNER');
    log(`📅 Started at: ${new Date().toLocaleString()}`, colors.blue);
    log(`📊 Coverage: ${withCoverage ? 'Enabled' : 'Disabled'}`, colors.blue);
    const rootDir = path.resolve(__dirname, '..');
    const backendDir = path.join(rootDir, 'backend');
    const frontendDir = path.join(rootDir, 'frontend');
    const results = [];
    // Run backend tests
    if (!frontendOnly) {
        if (fs.existsSync(backendDir)) {
            const backendResult = await runProjectTests('Backend', backendDir, withCoverage);
            results.push(backendResult);
        }
        else {
            log(`⚠️ Backend directory not found: ${backendDir}`, colors.yellow);
        }
    }
    // Run frontend tests
    if (!backendOnly) {
        if (fs.existsSync(frontendDir)) {
            const frontendResult = await runProjectTests('Frontend', frontendDir, withCoverage);
            results.push(frontendResult);
        }
        else {
            log(`⚠️ Frontend directory not found: ${frontendDir}`, colors.yellow);
        }
    }
    // Summary
    logHeader('📋 TEST SUMMARY');
    let allPassed = true;
    let totalTests = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    results.forEach(result => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        const statusColor = result.passed ? colors.green : colors.red;
        log(`${result.project}: ${status}`, statusColor);
        log(`   Tests: ${result.testCount} passed, ${result.failedCount} failed`, colors.blue);
        log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`, colors.blue);
        if (result.coverage) {
            log(`   Coverage: Statements ${result.coverage.statements}%, Lines ${result.coverage.lines}%`, colors.blue);
        }
        if (result.error && !result.passed) {
            log(`   Error: ${result.error.substring(0, 100)}...`, colors.red);
        }
        if (!result.passed)
            allPassed = false;
        totalTests += result.testCount;
        totalFailed += result.failedCount;
        totalDuration += result.duration;
    });
    log('');
    log('─'.repeat(40), colors.cyan);
    log(`Total: ${totalTests} passed, ${totalFailed} failed`, colors.bright);
    log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`, colors.blue);
    log('─'.repeat(40), colors.cyan);
    if (allPassed) {
        log('');
        log('═══════════════════════════════════════════════════════', colors.green);
        log('  ✅ ALL TESTS PASSED', colors.green);
        log('═══════════════════════════════════════════════════════', colors.green);
        process.exit(0);
    }
    else {
        log('');
        log('═══════════════════════════════════════════════════════', colors.red);
        log('  ❌ TESTS FAILED', colors.red);
        log('  Fix failing tests before pushing!', colors.red);
        log('═══════════════════════════════════════════════════════', colors.red);
        process.exit(1);
    }
}
main().catch(error => {
    log(`\n❌ Test runner error: ${error.message}`, colors.red);
    process.exit(1);
});
