#!/usr/bin/env node

/**
 * Deployment Readiness Checker
 * 
 * Validates that all required configuration is in place
 * before deploying to production.
 * 
 * Usage: node scripts/deploy-check.js
 */

const https = require('https');
const http = require('http');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}`)
};

// Required environment variables for production
const REQUIRED_ENV_VARS = {
  backend: [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string (Neon)' },
    { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for AI features' },
    { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID' },
    { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth client secret' },
    { name: 'GOOGLE_REDIRECT_URI', description: 'OAuth callback URL' },
    { name: 'FRONTEND_URL', description: 'Vercel frontend URL' }
  ],
  optional: [
    { name: 'REDIS_URL', description: 'Upstash Redis URL (recommended)' },
    { name: 'UPSTASH_REDIS_URL', description: 'Upstash Redis URL (alternative)' },
    { name: 'RAPIDAPI_KEY', description: 'RapidAPI key for job search' },
    { name: 'AMADEUS_API_KEY', description: 'Amadeus API for travel' }
  ],
  frontend: [
    { name: 'VITE_API_URL', description: 'Backend API URL' },
    { name: 'VITE_SOCKET_URL', description: 'WebSocket URL' }
  ]
};

// Check if running with --env flag to check current environment
const checkCurrentEnv = process.argv.includes('--env');

function checkEnvVar(name) {
  return process.env[name] && process.env[name].length > 0;
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', () => resolve({ status: 0, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, ok: false });
    });
  });
}

async function main() {
  console.log('\n🚀 Pocketknife Deployment Readiness Check\n');

  let hasErrors = false;
  let hasWarnings = false;

  // Check required files exist
  log.header('Configuration Files');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    { path: 'backend/railway.json', name: 'Railway config' },
    { path: 'backend/Dockerfile', name: 'Backend Dockerfile' },
    { path: 'frontend/vercel.json', name: 'Vercel config' },
    { path: '.github/workflows/deploy.yml', name: 'CI/CD workflow' }
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    if (fs.existsSync(filePath)) {
      log.success(`${file.name} exists`);
    } else {
      log.error(`${file.name} missing: ${file.path}`);
      hasErrors = true;
    }
  }

  // Check environment if requested
  if (checkCurrentEnv) {
    log.header('Environment Variables (Current)');
    
    log.info('Required for backend:');
    for (const env of REQUIRED_ENV_VARS.backend) {
      if (checkEnvVar(env.name)) {
        log.success(`${env.name} is set`);
      } else {
        log.error(`${env.name} is missing - ${env.description}`);
        hasErrors = true;
      }
    }

    log.info('\nOptional (recommended):');
    for (const env of REQUIRED_ENV_VARS.optional) {
      if (checkEnvVar(env.name)) {
        log.success(`${env.name} is set`);
      } else {
        log.warn(`${env.name} not set - ${env.description}`);
        hasWarnings = true;
      }
    }
  }

  // Print checklist
  log.header('Pre-Deployment Checklist');
  console.log(`
${colors.dim}Copy and complete this checklist:${colors.reset}

Infrastructure:
  [ ] Neon PostgreSQL database created
  [ ] Database schema pushed (npm run db:push)
  [ ] Upstash Redis database created (optional but recommended)

Railway Setup:
  [ ] Railway project created
  [ ] GitHub repo connected
  [ ] Root directory set to 'backend'
  [ ] All environment variables configured

Vercel Setup:
  [ ] Vercel project created
  [ ] GitHub repo connected  
  [ ] Root directory set to 'frontend'
  [ ] Environment variables configured (VITE_API_URL, etc.)

OAuth Configuration:
  [ ] Google Cloud Console OAuth credentials created
  [ ] Redirect URI updated to Railway backend URL
  [ ] Test user added (if in testing mode)

GitHub Secrets:
  [ ] RAILWAY_TOKEN
  [ ] VERCEL_TOKEN
  [ ] VERCEL_ORG_ID
  [ ] VERCEL_PROJECT_ID
  [ ] DATABASE_URL (for migrations)
`);

  // Summary
  log.header('Summary');
  
  if (hasErrors) {
    log.error('Some checks failed. Please fix the issues above before deploying.');
    process.exit(1);
  } else if (hasWarnings) {
    log.warn('All required checks passed, but some optional features are not configured.');
    log.info('You can still deploy, but some features may be limited.');
    process.exit(0);
  } else {
    log.success('All checks passed! Ready to deploy.');
    console.log(`\n${colors.green}Run: git push origin main${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch(console.error);

