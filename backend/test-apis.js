require('dotenv').config();
const axios = require('axios');

async function testAPIs() {
  console.log('=== Testing Job APIs ===\n');
  
  // Test 1: RemoteOK
  try {
    console.log('1. Testing RemoteOK...');
    const res = await axios.get('https://remoteok.com/api', {
      headers: { 'User-Agent': 'JobSearchAgent/1.0' },
      timeout: 10000
    });
    const jobs = res.data.slice(1);
    const query = 'Senior Backend Developer';
    const filtered = jobs.filter(job => {
      const text = `${job.position} ${job.description}`.toLowerCase();
      return text.includes('backend') || text.includes('developer') || text.includes('senior');
    });
    console.log(`✅ RemoteOK: ${jobs.length} total jobs, ${filtered.length} matching "${query}"\n`);
  } catch (err) {
    console.log(`❌ RemoteOK Error: ${err.message}\n`);
  }
  
  // Test 2: Remotive
  try {
    console.log('2. Testing Remotive...');
    const res = await axios.get('https://remotive.com/api/remote-jobs', {
      timeout: 10000
    });
    const jobs = res.data.jobs;
    const query = 'Senior Backend Developer';
    const filtered = jobs.filter(job => {
      const text = `${job.title} ${job.description}`.toLowerCase();
      return text.includes('backend') || text.includes('developer') || text.includes('senior');
    });
    console.log(`✅ Remotive: ${jobs.length} total jobs, ${filtered.length} matching "${query}"\n`);
  } catch (err) {
    console.log(`❌ Remotive Error: ${err.message}\n`);
  }
  
  // Test 3: JSearch (RapidAPI)
  try {
    console.log('3. Testing JSearch (RapidAPI)...');
    const key = process.env.RAPIDAPI_KEY;
    const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: {
        query: 'Senior Backend Developer',
        page: '1',
        num_pages: '1'
      },
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      timeout: 30000
    });
    console.log(`✅ JSearch: ${res.data.data ? res.data.data.length : 0} jobs\n`);
  } catch (err) {
    console.log(`❌ JSearch Error: ${err.response?.status || 'timeout'} - ${err.message}\n`);
  }
  
  // Test 4: Adzuna (Israel)
  try {
    console.log('4. Testing Adzuna (Israel)...');
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;
    const res = await axios.get('https://api.adzuna.com/v1/api/jobs/il/search/1', {
      params: {
        app_id: id,
        app_key: key,
        what: 'developer',
        results_per_page: 10
      },
      timeout: 15000
    });
    console.log(`✅ Adzuna (Israel): ${res.data.results ? res.data.results.length : 0} jobs\n`);
  } catch (err) {
    console.log(`❌ Adzuna (Israel) Error: ${err.response?.status} - ${err.response?.data?.exception || err.message}\n`);
  }
  
  // Test 5: Adzuna (US)
  try {
    console.log('5. Testing Adzuna (US)...');
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;
    const res = await axios.get('https://api.adzuna.com/v1/api/jobs/us/search/1', {
      params: {
        app_id: id,
        app_key: key,
        what: 'backend developer',
        results_per_page: 10
      },
      timeout: 15000
    });
    console.log(`✅ Adzuna (US): ${res.data.results ? res.data.results.length : 0} jobs\n`);
  } catch (err) {
    console.log(`❌ Adzuna (US) Error: ${err.response?.status} - ${err.message}\n`);
  }
  
  // Test 6: The Muse API (Alternative - FREE)
  try {
    console.log('6. Testing The Muse API (Alternative)...');
    const res = await axios.get('https://www.themuse.com/api/public/jobs', {
      params: {
        page: 0,
        descending: true,
        api_key: 'public'
      },
      timeout: 10000
    });
    console.log(`✅ The Muse: ${res.data.results ? res.data.results.length : 0} jobs\n`);
  } catch (err) {
    console.log(`❌ The Muse Error: ${err.message}\n`);
  }
}

testAPIs();
