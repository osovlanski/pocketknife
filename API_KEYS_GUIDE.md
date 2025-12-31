# API Keys Setup Guide

This guide explains how to obtain API keys for additional job search services to increase your job results.

## 📊 Current Status

### ✅ Already Working (No Keys Needed)
- **RemoteOK** - FREE, unlimited, no signup
- **Remotive** - FREE, unlimited, no signup  
- **Arbeitnow** - FREE, unlimited, no signup
- **The Muse** - FREE, 500/month, no key (currently blocked by CORS)
- **Himalayas** - FREE, no API (scraping endpoint)

### 🔑 Requires API Keys (Optional)
- **RapidAPI (JSearch)** - Adds LinkedIn, Glassdoor, Indeed jobs
- **Adzuna** - Works in US, UK, CA, AU, etc. (NOT Israel)
- **Findwork.dev** - Developer-focused remote jobs

---

## 1. RapidAPI Key (for JSearch API)

### What you get:
- **LinkedIn** jobs aggregation
- **Glassdoor** jobs  
- **Indeed** jobs
- **~10-30 additional jobs** per search

### Pricing:
- **FREE Tier**: 150 requests/month (5 searches/day)
- **Basic**: $10/month - 500 requests
- **Pro**: $50/month - 5,000 requests

### Setup Steps:

1. **Sign up for RapidAPI**
   - Go to: https://rapidapi.com/
   - Click "Sign Up" (top right)
   - Use Google/GitHub login or email

2. **Subscribe to JSearch API**
   - Go to: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
   - Click "Subscribe to Test" button
   - Select **FREE plan** (150 requests/month)
   - Click "Subscribe"

3. **Get Your API Key**
   - After subscribing, you'll see the API key in the **Code Snippets** section
   - Look for: `'X-RapidAPI-Key': 'YOUR_KEY_HERE'`
   - Copy the key (looks like: `ac3006845dmsh124ad21b5ff0560p130083jsn1e2c60329146`)

4. **Add to .env file**
   ```bash
   # Uncomment and add your key:
   RAPIDAPI_KEY=your_actual_key_here
   ```

5. **Restart backend**
   ```bash
   cd backend
   npm run dev
   ```

### ⚠️ Important Notes:
- **Slow**: JSearch takes 15-25 seconds per search (vs 2-5 seconds for free APIs)
- **Rate Limited**: FREE tier only allows 150 requests/month
- **Not Required**: You already get 70-95 jobs from free APIs
- **Best For**: If you specifically need LinkedIn/Glassdoor jobs

---

## 2. Adzuna API Key

### What you get:
- Jobs from **Indeed, Reed, CV-Library, Total Jobs**
- Works in: **US, UK, Canada, Australia, Germany, France**
- **Does NOT work in Israel** ❌

### Pricing:
- **FREE**: 5,000 calls/month
- No paid tiers needed for personal use

### Setup Steps:

1. **Sign up for Adzuna**
   - Go to: https://developer.adzuna.com/
   - Click "Register" or "Sign Up"
   - Fill in your details

2. **Create Application**
   - After login, go to "Dashboard"
   - Click "Create New Application"
   - Name: "Job Search Agent"
   - Description: "Personal job search aggregator"

3. **Get Credentials**
   - You'll receive:
     - **App ID** (e.g., `1b392f66`)
     - **App Key** (e.g., `28825ea133128a3a4413986eb08268fc`)

4. **Add to .env file**
   ```bash
   # Uncomment and add your credentials:
   ADZUNA_APP_ID=your_app_id_here
   ADZUNA_APP_KEY=your_app_key_here
   ```

5. **Update code to use your country**
   - Open: `backend/src/services/jobSourceService.ts`
   - Find the `fetchAdzuna` method
   - Change country code from `il` to your country:
     - `us` - United States
     - `gb` - United Kingdom
     - `ca` - Canada
     - `au` - Australia
     - `de` - Germany
     - `fr` - France

### ⚠️ Important Notes:
- **Not for Israel**: Adzuna doesn't support Israeli job market
- **Best For**: US/UK/CA/AU users wanting Indeed jobs
- **Already Integrated**: Code is ready, just need to uncomment

---

## 3. Findwork.dev API Key

### What you get:
- **Developer-focused** remote jobs
- High-quality **tech positions**
- Curated listings

### Pricing:
- **FREE for personal use** (limited)
- **Pro**: $29/month - unlimited API calls

### Setup Steps:

1. **Sign up for Findwork.dev**
   - Go to: https://findwork.dev/
   - Click "Sign Up" (top right)
   - Create account with email

2. **Request API Access**
   - Go to: https://findwork.dev/developers/
   - Click "Request API Access"
   - Fill in the form:
     - Purpose: "Personal job search aggregator"
     - Usage: "Low volume personal use"

3. **Wait for Approval**
   - Findwork.dev manually approves API requests
   - Usually takes 1-3 business days
   - You'll receive API token via email

4. **Get Your Token**
   - After approval, login to dashboard
   - Go to "API Settings"
   - Copy your API token (looks like: `Token abcd1234efgh5678...`)

5. **Update code with token**
   - Open: `backend/src/services/additionalJobAPIs.ts`
   - Find line: `'Authorization': 'Token public'`
   - Replace with: `'Authorization': 'Token YOUR_ACTUAL_TOKEN'`

6. **Restart backend**
   ```bash
   cd backend
   npm run dev
   ```

### ⚠️ Important Notes:
- **Manual Approval**: Not instant, takes 1-3 days
- **Currently Blocked**: The public endpoint returns 401 without valid token
- **Developer-Focused**: Best for software engineering roles
- **Alternative**: Already have RemoteOK which is similar and works immediately

---

## 4. The Muse API (Troubleshooting)

The Muse API is currently returning **403 Forbidden**. This is likely due to:

### Possible Issues:
1. **CORS/Browser Headers**: Our server headers might be flagged
2. **Rate Limiting**: Too many requests from our IP
3. **API Changes**: They may have restricted public access

### Potential Fixes:

#### Option 1: Add User-Agent Rotation
Already implemented! We're using browser User-Agent headers.

#### Option 2: Get Official API Key
- Email: developers@themuse.com
- Request: API access for personal job search tool
- They may provide official credentials

#### Option 3: Use Proxy
If you have access to a proxy service:
```typescript
// In additionalJobAPIs.ts
const response = await axios.get('https://www.themuse.com/api/public/jobs', {
  proxy: {
    host: 'your-proxy.com',
    port: 8080
  }
});
```

---

## 🎯 Recommendations

### For Israeli Job Seekers:
1. ✅ **Keep using**: RemoteOK, Remotive, Arbeitnow (70-95 jobs, FREE, fast)
2. ⚠️ **Optional**: RapidAPI for LinkedIn jobs (slow but useful)
3. ❌ **Skip**: Adzuna (doesn't support Israel)
4. ⏳ **Maybe**: Findwork.dev (if you get approved)

### For US/UK Job Seekers:
1. ✅ **Use**: All free APIs (RemoteOK, Remotive, Arbeitnow)
2. ✅ **Add**: Adzuna (works great in US/UK, 5000 free calls/month)
3. ✅ **Add**: RapidAPI (LinkedIn, Glassdoor, Indeed)
4. ⏳ **Request**: Findwork.dev access

### For Maximum Results:
- **Free Tier**: 70-95 jobs (current setup, no keys)
- **With RapidAPI**: 90-120 jobs (+LinkedIn/Glassdoor)
- **With Adzuna (US/UK)**: 110-150 jobs (+Indeed/Reed)
- **With All Keys**: 130-180 jobs (maximum coverage)

---

## 🔧 Testing Your Keys

After adding API keys, test each service:

```bash
# Restart backend
cd backend
npm run dev

# In a new terminal, test the search
curl -X POST http://localhost:5000/api/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"query":"software engineer","location":"Tel Aviv"}'
```

Check the console logs for:
- ✅ `Found X jobs from RapidAPI`
- ✅ `Found X jobs from Adzuna`
- ✅ `Found X jobs from Findwork.dev`

---

## 📞 Support

If you encounter issues:

1. **Check Logs**: Look at backend console for error messages
2. **Verify Keys**: Make sure `.env` has correct format (no quotes, no spaces)
3. **Restart**: Always restart backend after changing `.env`
4. **API Status**: Check if the API service is online
5. **Rate Limits**: Wait a few minutes if you hit rate limits

---

## 🎉 Summary

**Current Setup (No Keys)**:
- 3 APIs working: RemoteOK, Remotive, Arbeitnow
- 70-95 jobs per search
- 100% FREE, unlimited
- 2-5 seconds response time

**With Optional Keys**:
- Up to 8 APIs total
- 130-180 jobs per search
- Mostly FREE (Findwork.dev Pro is $29/month)
- 5-10 seconds response time (RapidAPI adds delay)

**Recommendation**: Start with the free APIs. Only add keys if you need more results or specific sources (LinkedIn, Indeed, etc.)
