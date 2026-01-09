/**
 * External Job APIs Test Script
 * 
 * Tests all external job APIs and reports their status.
 * Run with: node test-apis.js
 */

require('dotenv').config();
const axios = require('axios');

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const results = [];

async function testAPI(name, testFn) {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: 'success',
      duration,
      ...result
    });
    console.log(`${colors.green}✅ ${name}${colors.reset}: ${result.message} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: 'failed',
      duration,
      error: error.message
    });
    console.log(`${colors.red}❌ ${name}${colors.reset}: ${error.message} (${duration}ms)`);
    return false;
  }
}

async function testAPIs() {
  console.log(`\n${colors.bold}${colors.cyan}=== External Job APIs Test Suite ===${colors.reset}\n`);
  console.log(`Testing at: ${new Date().toISOString()}\n`);
  
  // Test 1: RemoteOK (FREE, unlimited)
  await testAPI('RemoteOK', async () => {
    const res = await axios.get('https://remoteok.com/api', {
      headers: { 'User-Agent': 'JobSearchAgent/1.0' },
      timeout: 15000
    });
    const jobs = res.data.slice(1);
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: false
    };
  });
  
  // Test 2: Remotive (FREE, 100 requests/day)
  await testAPI('Remotive', async () => {
    const res = await axios.get('https://remotive.com/api/remote-jobs', {
      timeout: 15000
    });
    const jobs = res.data.jobs || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: false
    };
  });
  
  // Test 3: Arbeitnow (FREE, unlimited)
  await testAPI('Arbeitnow', async () => {
    const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 15000
    });
    const jobs = res.data.data || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: false
    };
  });
  
  // Test 4: The Muse (FREE, 500 requests/month)
  await testAPI('The Muse', async () => {
    const res = await axios.get('https://www.themuse.com/api/public/jobs', {
      params: {
        page: 0,
        descending: true,
        api_key: 'public'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });
    
    if (res.status === 401 || res.status === 403) {
      throw new Error('API blocked or rate limited');
    }
    
    const jobs = res.data.results || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: false
    };
  });
  
  // Test 5: Findwork.dev (Requires auth)
  await testAPI('Findwork.dev', async () => {
    const res = await axios.get('https://findwork.dev/api/jobs/', {
      headers: { 'Authorization': 'Token public' },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });
    
    if (res.status === 401 || res.status === 403) {
      throw new Error('Authentication required - API key needed');
    }
    
    const jobs = res.data.results || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: true
    };
  });
  
  // Test 6: Himalayas
  await testAPI('Himalayas', async () => {
    const res = await axios.get('https://himalayas.app/jobs.json', {
      timeout: 15000,
      validateStatus: (status) => status < 500
    });
    
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    let jobs = res.data;
    if (jobs.jobs) jobs = jobs.jobs;
    if (jobs.data) jobs = jobs.data;
    if (!Array.isArray(jobs)) {
      throw new Error('Invalid response format');
    }
    
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: false
    };
  });
  
  // Test 7: JSearch (RapidAPI) - requires RAPIDAPI_KEY
  await testAPI('JSearch (RapidAPI)', async () => {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      throw new Error('RAPIDAPI_KEY not configured in .env');
    }
    
    const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: {
        query: 'Senior Backend Developer',
        page: '1',
        num_pages: '1'
      },
      headers: {
        'X-RapidAPI-Key': key.replace(/['"]/g, ''),
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      timeout: 30000
    });
    
    const jobs = res.data.data || [];
    return { 
      message: `Found ${jobs.length} jobs (LinkedIn, Glassdoor, Indeed)`,
      count: jobs.length,
      requiresAuth: true,
      envVar: 'RAPIDAPI_KEY'
    };
  });
  
  // Test 8: Adzuna (US)
  await testAPI('Adzuna (US)', async () => {
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;
    
    if (!id || !key) {
      throw new Error('ADZUNA_APP_ID or ADZUNA_APP_KEY not configured in .env');
    }
    
    const res = await axios.get('https://api.adzuna.com/v1/api/jobs/us/search/1', {
      params: {
        app_id: id.replace(/['"]/g, ''),
        app_key: key.replace(/['"]/g, ''),
        what: 'backend developer',
        results_per_page: 10
      },
      timeout: 15000
    });
    
    const jobs = res.data.results || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: true,
      envVar: 'ADZUNA_APP_ID, ADZUNA_APP_KEY'
    };
  });
  
  // Test 9: Adzuna (Israel) - May not be supported
  await testAPI('Adzuna (Israel)', async () => {
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;
    
    if (!id || !key) {
      throw new Error('ADZUNA_APP_ID or ADZUNA_APP_KEY not configured in .env');
    }
    
    const res = await axios.get('https://api.adzuna.com/v1/api/jobs/il/search/1', {
      params: {
        app_id: id.replace(/['"]/g, ''),
        app_key: key.replace(/['"]/g, ''),
        what: 'developer',
        results_per_page: 10
      },
      timeout: 15000,
      validateStatus: () => true
    });
    
    if (res.status === 404) {
      throw new Error('Israel (IL) not supported by Adzuna');
    }
    
    const jobs = res.data.results || [];
    return { 
      message: `Found ${jobs.length} jobs`,
      count: jobs.length,
      requiresAuth: true
    };
  });

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}=== Summary ===${colors.reset}\n`);
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`${colors.green}✅ Passed: ${successful.length}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed.length}${colors.reset}`);
  console.log(`Total APIs tested: ${results.length}\n`);
  
  // Detailed table
  console.log(`${colors.bold}Detailed Results:${colors.reset}`);
  console.log('-'.repeat(80));
  console.log(`${'API Name'.padEnd(25)} | ${'Status'.padEnd(10)} | ${'Time'.padEnd(8)} | Notes`);
  console.log('-'.repeat(80));
  
  results.forEach(r => {
    const status = r.status === 'success' 
      ? `${colors.green}OK${colors.reset}` 
      : `${colors.red}FAIL${colors.reset}`;
    const time = `${r.duration}ms`;
    const notes = r.status === 'success' 
      ? (r.count !== undefined ? `${r.count} jobs` : '')
      : r.error;
    
    console.log(`${r.name.padEnd(25)} | ${status.padEnd(16)} | ${time.padEnd(8)} | ${notes}`);
  });
  
  console.log('-'.repeat(80));
  
  // Recommendations
  console.log(`\n${colors.bold}${colors.yellow}Recommendations:${colors.reset}`);
  
  if (!process.env.RAPIDAPI_KEY) {
    console.log(`\n${colors.yellow}⚠️ JSearch (RapidAPI):${colors.reset}`);
    console.log('   Sign up at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
    console.log('   Add RAPIDAPI_KEY to .env for LinkedIn/Glassdoor/Indeed aggregation');
    console.log('   Free tier: 150 requests/month');
  }
  
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.log(`\n${colors.yellow}⚠️ Adzuna:${colors.reset}`);
    console.log('   Sign up at: https://developer.adzuna.com/');
    console.log('   Add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env');
    console.log('   Supports: US, UK, Germany, France, and more (NOT Israel)');
  }
  
  console.log(`\n${colors.green}✅ Free APIs (no config needed):${colors.reset}`);
  console.log('   - RemoteOK: Unlimited requests, remote jobs only');
  console.log('   - Remotive: 100 requests/day, remote tech jobs');
  console.log('   - Arbeitnow: Unlimited, global job listings');
  console.log('   - Israeli Tech: Local curated list of top Israeli companies');
  
  console.log('');
}

testAPIs().catch(console.error);
