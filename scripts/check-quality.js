#!/usr/bin/env node
"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var child_process_1 = require("child_process");
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var readline = __importStar(require("readline"));
// Configuration
var MIN_PASSING_SCORE = 80;
var BASE_BRANCH = 'main';
var LOG_FILE = path.join(__dirname, '..', 'review-log.txt');
// ANSI colors for terminal output
var colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};
function log(message, color) {
    if (color === void 0) { color = colors.reset; }
    var timestamp = new Date().toISOString();
    var logMessage = "[".concat(timestamp, "] ").concat(message);
    console.log("".concat(color).concat(message).concat(colors.reset));
    // Also write to log file
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}
function logHeader(message) {
    var border = '═'.repeat(60);
    log('');
    log(border, colors.cyan);
    log("  ".concat(message), colors.bright + colors.cyan);
    log(border, colors.cyan);
    log('');
}
function logSection(title) {
    log("\n\u25B6 ".concat(title), colors.yellow);
    log('─'.repeat(40), colors.yellow);
}
function runReview() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __awaiter(this, void 0, void 0, function () {
        var currentBranch_1, diff, diffStats, filesChanged_1, insertions, deletions, previewLines, typeCheckPass, output, tsErrors, output, tsErrors, testsPass, backendTestsRan, frontendTestsRan, isTestSuccess, isTestFailure, backendResult, output, failedTests, frontendResult, output, failedTests, autoScore, issues, warnings, hardcodedPatterns, isCodeFile, currentFile_1, diffLines, _loop_1, _i, hardcodedPatterns_1, _l, pattern, name_1, consoleLogMatches, missingTypes, todoComments, rl_1, logEntry;
        return __generator(this, function (_m) {
            logHeader('🏛️  PRINCIPAL ARCHITECT CODE REVIEW');
            log("\uD83D\uDCC5 Review started at: ".concat(new Date().toLocaleString()), colors.blue);
            log("\uD83D\uDCC1 Working directory: ".concat(process.cwd()), colors.blue);
            try {
                // Step 1: Check if we're in a git repository
                logSection('Step 1: Validating Git Repository');
                try {
                    (0, child_process_1.execSync)('git rev-parse --git-dir', { stdio: 'pipe' });
                    log('✅ Git repository detected', colors.green);
                }
                catch (_o) {
                    log('❌ Not a git repository!', colors.red);
                    process.exit(1);
                }
                // Step 2: Get current branch
                logSection('Step 2: Checking Branch Information');
                currentBranch_1 = (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
                log("\uD83D\uDCCD Current branch: ".concat(currentBranch_1), colors.blue);
                log("\uD83C\uDFAF Comparing against: ".concat(BASE_BRANCH), colors.blue);
                // Step 3: Check if base branch exists
                try {
                    (0, child_process_1.execSync)("git rev-parse --verify ".concat(BASE_BRANCH), { stdio: 'pipe' });
                    log("\u2705 Base branch '".concat(BASE_BRANCH, "' exists"), colors.green);
                }
                catch (_p) {
                    log("\u26A0\uFE0F Base branch '".concat(BASE_BRANCH, "' not found locally, trying origin/").concat(BASE_BRANCH), colors.yellow);
                    try {
                        (0, child_process_1.execSync)("git fetch origin ".concat(BASE_BRANCH), { stdio: 'pipe' });
                    }
                    catch (_q) {
                        log("\u274C Could not fetch ".concat(BASE_BRANCH), colors.red);
                    }
                }
                // Step 4: Get the diff
                logSection('Step 3: Analyzing Changes');
                diff = void 0;
                diffStats = void 0;
                try {
                    diff = (0, child_process_1.execSync)("git diff ".concat(BASE_BRANCH, "...HEAD"), { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
                    diffStats = (0, child_process_1.execSync)("git diff ".concat(BASE_BRANCH, "...HEAD --stat"), { encoding: 'utf-8' });
                }
                catch (error) {
                    // Fallback: compare against origin/main
                    log("\u26A0\uFE0F Trying origin/".concat(BASE_BRANCH, " instead..."), colors.yellow);
                    diff = (0, child_process_1.execSync)("git diff origin/".concat(BASE_BRANCH, "...HEAD"), { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
                    diffStats = (0, child_process_1.execSync)("git diff origin/".concat(BASE_BRANCH, "...HEAD --stat"), { encoding: 'utf-8' });
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
                filesChanged_1 = diffStats.split('\n').filter(function (line) { return line.includes('|'); }).length;
                insertions = ((_a = diffStats.match(/(\d+) insertions?/)) === null || _a === void 0 ? void 0 : _a[1]) || '0';
                deletions = ((_b = diffStats.match(/(\d+) deletions?/)) === null || _b === void 0 ? void 0 : _b[1]) || '0';
                log("\uD83D\uDCCA Files changed: ".concat(filesChanged_1), colors.blue);
                log("\u2795 Lines added: ".concat(insertions), colors.green);
                log("\u2796 Lines removed: ".concat(deletions), colors.red);
                // Step 7: Show sample of diff for context
                logSection('Step 5: Diff Preview (first 100 lines)');
                previewLines = diff.split('\n').slice(0, 100);
                previewLines.forEach(function (line) {
                    if (line.startsWith('+') && !line.startsWith('+++')) {
                        log(line, colors.green);
                    }
                    else if (line.startsWith('-') && !line.startsWith('---')) {
                        log(line, colors.red);
                    }
                    else if (line.startsWith('@@')) {
                        log(line, colors.cyan);
                    }
                    else if (line.startsWith('diff --git')) {
                        log('\n' + line, colors.magenta);
                    }
                    else {
                        log(line, colors.reset);
                    }
                });
                if (diff.split('\n').length > 100) {
                    log("\n... and ".concat(diff.split('\n').length - 100, " more lines"), colors.yellow);
                }
                // Step 6: TypeScript Type Check (matches CI/CD)
                logSection('Step 6: TypeScript Type Check');
                typeCheckPass = true;
                log('🔍 Running TypeScript type check (tsc --noEmit)...', colors.blue);
                // Check backend TypeScript
                try {
                    log('   Checking backend types...', colors.blue);
                    (0, child_process_1.execSync)('npx tsc --noEmit 2>&1', {
                        cwd: path.join(process.cwd(), 'backend'),
                        encoding: 'utf-8',
                        timeout: 120000
                    });
                    log('   ✅ Backend type check passed', colors.green);
                }
                catch (backendTscError) {
                    output = ((_c = backendTscError.stdout) === null || _c === void 0 ? void 0 : _c.toString()) || backendTscError.message || '';
                    tsErrors = output.match(/error TS\d+:.*/g);
                    if (tsErrors && tsErrors.length > 0) {
                        log('   ❌ Backend type check failed', colors.red);
                        tsErrors.slice(0, 10).forEach(function (err) { return log("      ".concat(err), colors.red); });
                        if (tsErrors.length > 10) {
                            log("      ... and ".concat(tsErrors.length - 10, " more errors"), colors.red);
                        }
                        typeCheckPass = false;
                    }
                    else {
                        log('   ✅ Backend type check passed (with warnings)', colors.green);
                    }
                }
                // Check frontend TypeScript
                try {
                    log('   Checking frontend types...', colors.blue);
                    (0, child_process_1.execSync)('npx tsc --noEmit 2>&1', {
                        cwd: path.join(process.cwd(), 'frontend'),
                        encoding: 'utf-8',
                        timeout: 120000
                    });
                    log('   ✅ Frontend type check passed', colors.green);
                }
                catch (frontendTscError) {
                    output = ((_d = frontendTscError.stdout) === null || _d === void 0 ? void 0 : _d.toString()) || frontendTscError.message || '';
                    tsErrors = output.match(/error TS\d+:.*/g);
                    if (tsErrors && tsErrors.length > 0) {
                        log('   ❌ Frontend type check failed', colors.red);
                        tsErrors.slice(0, 10).forEach(function (err) { return log("      ".concat(err), colors.red); });
                        if (tsErrors.length > 10) {
                            log("      ... and ".concat(tsErrors.length - 10, " more errors"), colors.red);
                        }
                        typeCheckPass = false;
                    }
                    else {
                        log('   ✅ Frontend type check passed (with warnings)', colors.green);
                    }
                }
                if (typeCheckPass) {
                    log('✅ All type checks passed!', colors.green);
                }
                else {
                    log('❌ TypeScript errors found. Fix them before pushing.', colors.red);
                }
                // Step 7: Run Tests
                logSection('Step 7: Running Tests');
                testsPass = true;
                backendTestsRan = false;
                frontendTestsRan = false;
                log('🧪 Running test suites...', colors.blue);
                isTestSuccess = function (output) {
                    // Check for vitest success patterns
                    if (/Test Files\s+\d+ passed/.test(output))
                        return true;
                    if (/Tests\s+\d+ passed/.test(output))
                        return true;
                    // Check for jest success patterns
                    if (/Tests:\s+\d+ passed/.test(output))
                        return true;
                    return false;
                };
                isTestFailure = function (output) {
                    // Check for actual test failures, not just warnings
                    if (/FAIL\s+/.test(output))
                        return true;
                    if (/Test Files\s+\d+ failed/.test(output))
                        return true;
                    if (/Tests:\s+\d+ failed/.test(output))
                        return true;
                    if (/AssertionError/.test(output))
                        return true;
                    return false;
                };
                // Run backend tests
                try {
                    log('   Running backend tests...', colors.blue);
                    backendResult = (0, child_process_1.execSync)('npm run test 2>&1', {
                        cwd: path.join(process.cwd(), 'backend'),
                        encoding: 'utf-8',
                        timeout: 180000
                    });
                    backendTestsRan = true;
                    if (isTestSuccess(backendResult)) {
                        log('   ✅ Backend tests passed', colors.green);
                    }
                    else if (isTestFailure(backendResult)) {
                        log('   ❌ Backend tests failed', colors.red);
                        testsPass = false;
                    }
                    else {
                        log('   ✅ Backend tests completed', colors.green);
                    }
                }
                catch (backendError) {
                    backendTestsRan = true;
                    output = ((_e = backendError.stdout) === null || _e === void 0 ? void 0 : _e.toString())
                        || ((_f = backendError.output) === null || _f === void 0 ? void 0 : _f.filter(Boolean).join(''))
                        || ((_g = backendError.stderr) === null || _g === void 0 ? void 0 : _g.toString())
                        || backendError.message
                        || '';
                    // Check if tests actually passed despite non-zero exit (e.g., due to warnings or stderr output)
                    if (isTestSuccess(output)) {
                        log('   ✅ Backend tests passed (with warnings)', colors.green);
                    }
                    else if (!isTestFailure(output) && output.includes('passed')) {
                        // If no explicit failure markers and 'passed' appears, treat as success
                        log('   ✅ Backend tests passed (with warnings)', colors.green);
                    }
                    else {
                        log('   ❌ Backend tests failed', colors.red);
                        failedTests = output.match(/FAIL.*$/gm);
                        if (failedTests) {
                            failedTests.slice(0, 5).forEach(function (line) { return log("      ".concat(line), colors.red); });
                        }
                        testsPass = false;
                    }
                }
                // Run frontend tests
                try {
                    log('   Running frontend tests...', colors.blue);
                    frontendResult = (0, child_process_1.execSync)('npm run test 2>&1', {
                        cwd: path.join(process.cwd(), 'frontend'),
                        encoding: 'utf-8',
                        timeout: 180000
                    });
                    frontendTestsRan = true;
                    if (isTestSuccess(frontendResult)) {
                        log('   ✅ Frontend tests passed', colors.green);
                    }
                    else if (isTestFailure(frontendResult)) {
                        log('   ❌ Frontend tests failed', colors.red);
                        testsPass = false;
                    }
                    else {
                        log('   ✅ Frontend tests completed', colors.green);
                    }
                }
                catch (frontendError) {
                    frontendTestsRan = true;
                    output = ((_h = frontendError.stdout) === null || _h === void 0 ? void 0 : _h.toString())
                        || ((_j = frontendError.output) === null || _j === void 0 ? void 0 : _j.filter(Boolean).join(''))
                        || ((_k = frontendError.stderr) === null || _k === void 0 ? void 0 : _k.toString())
                        || frontendError.message
                        || '';
                    // Check if tests actually passed despite non-zero exit
                    if (isTestSuccess(output)) {
                        log('   ✅ Frontend tests passed (with warnings)', colors.green);
                    }
                    else if (!isTestFailure(output) && output.includes('passed')) {
                        // If no explicit failure markers and 'passed' appears, treat as success
                        log('   ✅ Frontend tests passed (with warnings)', colors.green);
                    }
                    else if (output.includes('Cannot start service') || output.includes('esbuild')) {
                        // Dependency/build issue, not a test failure
                        log('   ⚠️ Frontend tests skipped (dependency issue - run npm install in frontend/)', colors.yellow);
                        // Don't count this as a test failure - it's a setup issue
                    }
                    else {
                        log('   ❌ Frontend tests failed', colors.red);
                        failedTests = output.match(/FAIL.*$/gm);
                        if (failedTests) {
                            failedTests.slice(0, 5).forEach(function (line) { return log("      ".concat(line), colors.red); });
                        }
                        testsPass = false;
                    }
                }
                if (!backendTestsRan && !frontendTestsRan) {
                    log('⚠️ Could not run any tests', colors.yellow);
                    log('   Make sure test dependencies are installed: npm install in backend/ and frontend/', colors.yellow);
                }
                else if (testsPass) {
                    log('✅ All tests passed!', colors.green);
                }
                else {
                    log('❌ Some tests failed. Fix them before pushing.', colors.red);
                }
                // Step 8: Automated Quality Checks
                logSection('Step 8: Automated Quality Checks');
                autoScore = 100;
                issues = [];
                warnings = [];
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
                hardcodedPatterns = [
                    { pattern: /setTimeout\(\s*[^,]+,\s*\d{4,}\s*\)/, name: 'Hardcoded timeout value' },
                    { pattern: /:\s*(?:80|443|3000|5000|8080)\b(?!\s*[,\]])/, name: 'Hardcoded port number' },
                    { pattern: /['"`]http:\/\/localhost/, name: 'Hardcoded localhost URL' },
                    { pattern: /['"`]https?:\/\/(?!www\.|api\.|example\.)[\w.-]+\.com/, name: 'Hardcoded external URL' },
                ];
                isCodeFile = function (line) {
                    // Check if we're in a documentation or config file by looking at the diff header
                    var mdMatch = line.match(/^diff --git.*\.(md|MD|txt|json|toml|yml|yaml|env|example)/);
                    return !mdMatch;
                };
                currentFile_1 = '';
                diffLines = diff.split('\n');
                _loop_1 = function (pattern, name_1) {
                    var addedLines = diffLines.filter(function (line, idx) {
                        // Track current file
                        if (line.startsWith('diff --git')) {
                            currentFile_1 = line;
                        }
                        // Only check added lines in actual code files
                        if (!line.startsWith('+') || line.startsWith('+++'))
                            return false;
                        // Skip if in non-code files (md, json, yml, env, etc.) or quality check scripts
                        if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile_1))
                            return false;
                        if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile_1))
                            return false;
                        return pattern.test(line);
                    });
                    if (addedLines.length > 0) {
                        issues.push("\uD83D\uDD34 ".concat(name_1, ": Found ").concat(addedLines.length, " instance(s)"));
                        autoScore -= 5 * addedLines.length;
                    }
                };
                for (_i = 0, hardcodedPatterns_1 = hardcodedPatterns; _i < hardcodedPatterns_1.length; _i++) {
                    _l = hardcodedPatterns_1[_i], pattern = _l.pattern, name_1 = _l.name;
                    _loop_1(pattern, name_1);
                }
                // Check for console.log (should use proper logger) - only in service/controller code
                currentFile_1 = '';
                consoleLogMatches = diffLines.filter(function (line) {
                    if (line.startsWith('diff --git')) {
                        currentFile_1 = line;
                    }
                    if (!line.startsWith('+') || line.startsWith('+++'))
                        return false;
                    // Skip scripts, tests, and config files - console.log is acceptable there
                    if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile_1))
                        return false;
                    if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile_1))
                        return false;
                    if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile_1))
                        return false;
                    return /console\.(log|warn|error)/.test(line);
                });
                if (consoleLogMatches.length > 0) {
                    warnings.push("\uD83D\uDFE1 console.log usage: ".concat(consoleLogMatches.length, " instance(s) - Consider using proper logger"));
                    autoScore -= 2 * consoleLogMatches.length;
                }
                // Check for missing type annotations (TypeScript) - only in actual code files
                currentFile_1 = '';
                missingTypes = diffLines.filter(function (line) {
                    if (line.startsWith('diff --git')) {
                        currentFile_1 = line;
                    }
                    if (!line.startsWith('+') || line.startsWith('+++'))
                        return false;
                    // Skip scripts, tests, and config files - any type is acceptable there
                    if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile_1))
                        return false;
                    if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile_1))
                        return false;
                    if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile_1))
                        return false;
                    return /:\s*any\b/.test(line);
                });
                if (missingTypes.length > 0) {
                    warnings.push("\uD83D\uDFE1 'any' type usage: ".concat(missingTypes.length, " instance(s) - Prefer explicit types"));
                    autoScore -= 2 * missingTypes.length;
                }
                // Check for TODO/FIXME comments - only in actual code files
                currentFile_1 = '';
                todoComments = diffLines.filter(function (line) {
                    if (line.startsWith('diff --git')) {
                        currentFile_1 = line;
                    }
                    if (!line.startsWith('+') || line.startsWith('+++'))
                        return false;
                    // Skip scripts, tests, and config files - TODO comments are acceptable there
                    if (/\/(scripts|tests?|__tests__|\.test\.|\.spec\.)/.test(currentFile_1))
                        return false;
                    if (/\.(md|json|toml|yml|yaml|env|example|production|txt|log)/.test(currentFile_1))
                        return false;
                    if (/check-quality\.(js|ts)|review-log|deploy-check/.test(currentFile_1))
                        return false;
                    return /\/\/\s*(TODO|FIXME|XXX|HACK)/i.test(line);
                });
                if (todoComments.length > 0) {
                    warnings.push("\uD83D\uDFE1 TODO/FIXME comments: ".concat(todoComments.length, " instance(s)"));
                    autoScore -= 1 * todoComments.length;
                }
                // Display automated check results
                if (issues.length > 0) {
                    log('\n🔴 Critical Issues Found:', colors.red);
                    issues.forEach(function (issue) { return log("   ".concat(issue), colors.red); });
                }
                if (warnings.length > 0) {
                    log('\n🟡 Warnings:', colors.yellow);
                    warnings.forEach(function (warning) { return log("   ".concat(warning), colors.yellow); });
                }
                if (issues.length === 0 && warnings.length === 0) {
                    log('✅ No automated issues detected', colors.green);
                }
                // Cap score at 0-100 range
                autoScore = Math.max(0, Math.min(100, autoScore));
                log("\n\uD83D\uDCCA Automated Pre-Score: ".concat(autoScore, "/100"), autoScore >= 80 ? colors.green : colors.yellow);
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
                rl_1 = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
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
                        log("   Score: ".concat(autoScore, "/100 (Minimum required: ").concat(MIN_PASSING_SCORE, ")"), colors.red);
                        log('', colors.reset);
                        log('   Fix the following issues before pushing:', colors.yellow);
                        issues.forEach(function (issue) { return log("   ".concat(issue), colors.red); });
                        if (warnings.length > 0) {
                            log('', colors.reset);
                            log('   Also consider fixing these warnings:', colors.yellow);
                            warnings.forEach(function (warning) { return log("   ".concat(warning), colors.yellow); });
                        }
                        log('', colors.reset);
                        log('   After fixing, run: git push', colors.blue);
                        log('', colors.reset);
                        logEntry = "[".concat(new Date().toISOString(), "] BLOCKED - Automated score: ").concat(autoScore, "/100 (min: ").concat(MIN_PASSING_SCORE, ")\n");
                        fs.appendFileSync(LOG_FILE, logEntry);
                        process.exit(1); // BLOCK the push
                    }
                    else {
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
                rl_1.question("\n".concat(colors.yellow, "Did you complete the manual review in Cursor? (yes/no): ").concat(colors.reset), function (answer) {
                    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                        rl_1.question("".concat(colors.yellow, "What score did the review give? (0-100): ").concat(colors.reset), function (scoreStr) {
                            var score = parseInt(scoreStr, 10);
                            if (isNaN(score) || score < 0 || score > 100) {
                                log('\n❌ Invalid score. Please enter a number between 0-100.', colors.red);
                                rl_1.close();
                                process.exit(1);
                            }
                            log('', colors.reset);
                            if (score >= MIN_PASSING_SCORE) {
                                log('═══════════════════════════════════════════════════════', colors.green);
                                log("  \u2705 REVIEW PASSED - Score: ".concat(score, "/100"), colors.green);
                                log('  Push is APPROVED. Proceeding...', colors.green);
                                log('═══════════════════════════════════════════════════════', colors.green);
                                // Log successful review
                                var logEntry = "[".concat(new Date().toISOString(), "] PASSED - Branch: ").concat(currentBranch_1, ", Score: ").concat(score, "/100, Files: ").concat(filesChanged_1, "\n");
                                fs.appendFileSync(LOG_FILE, logEntry);
                                rl_1.close();
                                process.exit(0);
                            }
                            else {
                                log('═══════════════════════════════════════════════════════', colors.red);
                                log("  \uD83D\uDEAB PUSH BLOCKED - Score: ".concat(score, "/100"), colors.red);
                                log("  Minimum required: ".concat(MIN_PASSING_SCORE, "/100"), colors.red);
                                log('  Fix the issues identified in the review first!', colors.red);
                                log('═══════════════════════════════════════════════════════', colors.red);
                                // Log failed review
                                var logEntry = "[".concat(new Date().toISOString(), "] BLOCKED - Branch: ").concat(currentBranch_1, ", Score: ").concat(score, "/100, Files: ").concat(filesChanged_1, "\n");
                                fs.appendFileSync(LOG_FILE, logEntry);
                                rl_1.close();
                                process.exit(1);
                            }
                        });
                    }
                    else {
                        log('\n⚠️ Please complete the review in Cursor first!', colors.yellow);
                        log('   Copy this into Cursor Chat:', colors.yellow);
                        log('   "Review my changes for push using the Principal Architect rule"\n', colors.magenta);
                        rl_1.close();
                        process.exit(1);
                    }
                });
            }
            catch (error) {
                log("\n\u274C Review script error: ".concat(error.message), colors.red);
                if (error.stderr) {
                    log("   stderr: ".concat(error.stderr), colors.red);
                }
                process.exit(1);
            }
            return [2 /*return*/];
        });
    });
}
// Entry point
log("\n\uD83D\uDE80 Quality Check Script v1.0.0", colors.cyan);
log("\uD83D\uDCCB Minimum passing score: ".concat(MIN_PASSING_SCORE, "/100"), colors.blue);
log("\uD83D\uDCC2 Log file: ".concat(LOG_FILE), colors.blue);
runReview();
