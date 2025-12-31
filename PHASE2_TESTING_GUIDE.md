# Phase 2 Testing Guide - Quick Start

## 🚀 Quick Test (5 minutes)

### 1. Start the Application

```bash
# Terminal 1: Start Backend
cd gmail-ai-agent
.\start-backend.bat

# Terminal 2: Start Frontend  
cd gmail-ai-agent
.\start-frontend.bat

# Open browser: http://localhost:5173
```

---

## ✅ Test 1: Enhanced Job Matching (2 min)

### Test Synonym Support

1. Go to **Job Search** tab
2. Upload any CV or skip
3. Search: `React Developer`

**Expected Results**:
- ✅ Jobs with "React.js"
- ✅ Jobs with "ReactJS"
- ✅ Jobs with "React Native"
- ✅ Frontend jobs mentioning React

**Check Console** for:
```
🔍 Searching all job sources for: "React Developer"
✅ Found 23 jobs from RemoteOK
✅ Found 28 jobs from Remotive
✅ Found 19 jobs from Arbeitnow
📊 Total: 70+ jobs
```

### Test Seniority Filtering

1. Search: `Senior React Developer`

**Expected Results**:
- ✅ Senior/Lead/Principal positions only
- ❌ NO Junior/Entry-level positions

2. Search: `Junior Python Developer`

**Expected Results**:
- ✅ Junior/Entry positions
- ❌ NO Senior/Lead positions

---

## ✅ Test 2: JSearch Integration (3 min)

### Setup (if you have RapidAPI key)

1. Edit `backend/.env`
2. Uncomment: `RAPIDAPI_KEY=your_key_here`
3. Restart backend

### Test LinkedIn Jobs

1. Search: `Software Engineer`
2. Wait 15-20 seconds (JSearch is slow)

**Expected Results**:
- ✅ Jobs from "LinkedIn" source
- ✅ Jobs from "Glassdoor" source
- ✅ Jobs from "Indeed" source
- ✅ 20-30 additional jobs

**Check Console** for:
```
🔍 Fetching jobs from JSearch (LinkedIn, Glassdoor, Indeed)...
📊 JSearch returned 28 raw jobs
📋 Sample job: Senior Software Engineer at Google (LinkedIn)
✅ Found 28 jobs from JSearch
```

### Without API Key

**Expected**:
```
ℹ️ JSearch API key not configured. Skipping JSearch...
💡 Tip: Add RAPIDAPI_KEY to .env for LinkedIn/Glassdoor/Indeed jobs
```

---

## ✅ Test 3: Flexible Date Search UI (2 min)

### Test UI Toggle

1. Go to **Travel** tab
2. Find the flexible dates checkbox:
   ```
   ☐ Flexible Dates - Find Best Deals!
   Search multiple dates to find cheapest flights
   ```
3. Check the box

**Expected UI Change**:
- ✅ Standard date fields disappear
- ✅ New section appears with 3 dropdowns:
  - Start Date Range
  - Flexibility (±3, ±7, ±14, ±30 days)
  - Trip Duration (3 days to 3 weeks)
- ✅ Blue message: "Will search X different dates..."

### Test Flexibility Options

1. Select **Start Date**: June 15, 2025
2. Select **Flexibility**: ±7 days
3. Select **Duration**: 1 week

**Expected**:
- ✅ Message shows: "Will search 14 different dates to find the best deals!"
- ✅ System will search: June 8-15, June 9-16, ..., June 22-29

### Test Search (Note: Backend integration pending)

1. Fill in Origin: `TLV`
2. Fill in Destination: `BCN`
3. Select flexible dates as above
4. Click **Search**

**Current Status**:
- ✅ UI works and passes data to backend
- ⏳ Backend integration in progress (Phase 3)
- 📝 Currently does standard search, flexible coming soon

---

## 🔍 Detailed Testing

### Job Search - Test All Synonyms

| Query | Should Match | Should NOT Match |
|-------|--------------|------------------|
| `frontend developer` | "front-end", "ui engineer", "client-side" | "backend", "api" |
| `fullstack engineer` | "full-stack", "frontend and backend" | "mobile", "data" |
| `devops engineer` | "sre", "site reliability", "infrastructure" | "developer" |
| `javascript developer` | "js", "node", "typescript", "react" | "python", "java" |

### Test Each Synonym Category

Run these searches and verify results match expectations:

```bash
1. "React Developer" → Finds React.js, ReactJS, Frontend React
2. "Node Developer" → Finds Node.js, NodeJS, Backend Node
3. "Mobile Developer" → Finds iOS, Android, React Native, Flutter
4. "DevOps Engineer" → Finds SRE, Site Reliability, Infrastructure
5. "Data Scientist" → Finds ML, Machine Learning, Analytics
```

---

## 📊 Success Criteria

### Job Search ✅
- [x] Finds jobs with technology synonyms (React = React.js)
- [x] Respects seniority levels (Senior ≠ Junior)
- [x] Returns 70-95 jobs from FREE APIs
- [x] JSearch adds 20-30 jobs (if API key provided)
- [x] All APIs gracefully handle errors

### Travel Search ✅
- [x] Flexible dates checkbox toggles UI
- [x] Shows date range selection
- [x] Calculates number of searches correctly
- [x] UI passes data to backend correctly
- [ ] Backend processes flexible search (Phase 3)

---

## 🐛 Troubleshooting

### "No jobs found"
- **Try simpler query**: "Developer" instead of "Senior Full Stack React Developer"
- **Remove filters**: Uncheck all advanced filters
- **Check APIs**: Look for error messages in console
- **Wait**: Some APIs take 5-10 seconds

### "JSearch not working"
- **Check API key**: Verify in `.env` file
- **Check rate limit**: FREE tier = 150/month
- **Wait longer**: JSearch can take 20+ seconds
- **Check console**: Look for error messages

### "Flexible dates not working"
- **UI works**: Checkbox and options should toggle ✅
- **Backend pending**: Full integration in Phase 3 ⏳
- **Current behavior**: Does standard search for now

### TypeScript Errors
```bash
# Rebuild both projects
cd backend
npm install
npm run dev

cd ../frontend
npm install  
npm run dev
```

---

## 🎯 Expected Results Summary

### Job Search (Current)
```
Query: "React Developer"

Console Output:
🔍 Searching all job sources for: "React Developer"
📡 Using 6 APIs: RemoteOK + Remotive + Arbeitnow + The Muse + Findwork + Himalayas
✅ RemoteOK: Found 23 jobs
✅ Remotive: Found 28 jobs  
✅ Arbeitnow: Found 19 jobs
⚠️ The Muse API blocked - skipping
⚠️ Findwork.dev API requires authentication - skipping
⚠️ Himalayas API blocked - skipping
📊 Retrieved 70 jobs from 3 sources
🔄 Removed 8 duplicate job(s)
✅ Total jobs matching criteria: 62

Results:
- React.js Frontend Engineer at Startup Inc.
- Senior ReactJS Developer at Tech Corp
- UI Engineer (React) at BigCo
- Full Stack Developer - React/Node at Remote Co
... (62 total)
```

### Travel Search (Current)
```
Standard Search:
✅ Origin: TLV
✅ Destination: BCN  
✅ Departure: June 15
✅ Return: June 22
✅ Adults: 2
✅ Class: Economy
→ Shows flights for exactly these dates

Flexible Search (NEW UI):
✅ Origin: TLV
✅ Destination: BCN
✅ Flexibility: ±7 days  
✅ Duration: 7 days
✅ UI Message: "Will search 14 different dates"
⏳ Backend integration: Phase 3
→ Currently does standard search, full flex coming soon
```

---

## 📝 Notes

### What's Working NOW:
1. ✅ Job synonym matching
2. ✅ Enhanced JSearch integration
3. ✅ Flexible date search UI
4. ✅ Remote/Office filtering
5. ✅ Advanced job filters

### What's Coming in Phase 3:
1. ⏳ Flexible date backend integration
2. ⏳ Price calendar visualization
3. ⏳ Destination recommendation cards
4. ⏳ Price trend graphs
5. ⏳ Hotel recommendations with flights

---

## 🎉 You're All Set!

The improvements are ready to test. Most features work immediately, with travel UI enhancements coming in Phase 3.

**Questions?** See:
- `PHASE2_IMPROVEMENTS_COMPLETE.md` - Full documentation
- `API_KEYS_GUIDE.md` - How to get API keys
- `API_KEYS_QUICKSTART.md` - Quick API setup

**Ready to continue with Phase 3?** Let me know and we'll:
1. Complete flexible date backend integration
2. Build destination recommendation cards
3. Add price visualization graphs
