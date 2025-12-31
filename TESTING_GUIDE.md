# 🧪 Testing Guide - Phase 1 Improvements

## ✅ Job Search Agent - Advanced Filters

### Test 1: Company Size Filter
```
1. Upload CV
2. Show Advanced Filters
3. Select Company Size: "Startup"
4. Search
Expected: Jobs from startups (1-50 employees)
Look for: Early-stage, seed funded, founded 2015+
```

### Test 2: Industry Filter
```
1. Show Advanced Filters
2. Select Industry: "FinTech"
3. Search
Expected: Jobs mentioning: banking, payments, trading, cryptocurrency
```

### Test 3: Experience Level Filter
```
1. Show Advanced Filters
2. Select Experience: "Senior"
3. Search
Expected: Only jobs with "Senior", "Lead", "Principal" in title
```

### Test 4: Combined Filters
```
1. Company Size: "Startup"
2. Industry: "CyberSecurity"
3. Experience: "Senior"
4. Job Type: "Full-time"
5. Salary: Min $120,000
6. Search
Expected: Highly specific results matching ALL criteria
```

### Test 5: New Job APIs
```
Check log output for:
✅ The Muse: Found X jobs
✅ Findwork.dev: Found X jobs
✅ Himalayas: Found X jobs
✅ RemoteOK: Found X jobs
✅ Remotive: Found X jobs
✅ Arbeitnow: Found X jobs

Total: Should see 6 sources (or more with JSearch/Adzuna)
```

---

## ✈️ Travel Agent - Flexible Dates

### Test 6: Flexible Date Search (Backend Ready)
```javascript
// Test via API (frontend UI pending)
POST http://localhost:5000/api/travel/flexible-search
{
  "origin": "TLV",
  "destinations": ["BCN"],
  "flexibleDateRange": {
    "start": "2025-07-01",
    "end": "2025-07-15"
  },
  "tripDuration": 7,
  "passengers": { "adults": 2 },
  "travelClass": "ECONOMY"
}

Expected Response:
{
  "bestDeals": [
    { "date": "2025-07-05", "price": 450, ... },
    { "date": "2025-07-12", "price": 480, ... },
    ...
  ],
  "cheapestDate": "2025-07-05",
  "priceRange": { "min": 450, "max": 680 }
}
```

### Test 7: Destination Recommendations (Backend Ready)
```javascript
// Test via API
POST http://localhost:5000/api/travel/destination-guide
{
  "city": "Barcelona",
  "country": "Spain",
  "tripDuration": 7
}

Expected Response:
{
  "city": "Barcelona",
  "attractions": [...],  // 5-10 places
  "localCuisine": [...],  // 5-7 dishes
  "transportation": {...},
  "tips": [...],          // 7-10 tips
  "estimatedBudget": {...}
}
```

---

## 📊 Expected Improvements

### Job Search Results:
- **Before**: 60-80 jobs from 3 sources
- **After**: 100-150 jobs from 6 sources
- **Filter Accuracy**: 70-80% (AI detection)

### Travel Search:
- **Flexible Dates**: Search 15 dates in ~30 seconds
- **Price Savings**: Find deals 20-40% cheaper
- **Destination Info**: Complete trip guide in 2 seconds

---

## 🐛 Known Issues / Todo

### Frontend UI (Needs Implementation):
1. ❌ Flexible date picker not yet in TravelSearchPanel
2. ❌ Price calendar visualization missing
3. ❌ Destination guides not displayed in results
4. ❌ Filter badges showing active filters

### Backend (Working):
1. ✅ All 6 job APIs integrated
2. ✅ Advanced filters working
3. ✅ Flexible date search working
4. ✅ Destination guides generating

---

## 🚀 Quick Start

### Start Servers:
```bash
# Terminal 1 - Backend
cd c:\agents\gmail-agent\gmail-ai-agent
.\start-backend.bat

# Terminal 2 - Frontend
.\start-frontend.bat
```

### Test Job Search:
1. Open http://localhost:5173
2. Click "Job Search" tab
3. Upload CV
4. Click "Show Advanced Filters"
5. Try different combinations
6. Watch console for API logs

### Test Travel (Current UI):
1. Click "Travel Deals" tab
2. Enter: TLV → BCN
3. Select dates (exact dates for now)
4. Search
5. View flight results

### Test APIs Directly:
```bash
# Check all job APIs are working
curl http://localhost:5000/api/jobs/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"location":"Tel Aviv","remoteOnly":false}'

# Test flexible dates
curl http://localhost:5000/api/travel/flexible-search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"origin":"TLV","destinations":["BCN"],...}'
```

---

## ✅ Success Criteria

### Job Search:
- [ ] See 6 API sources in logs
- [ ] Get 100+ job results
- [ ] Filters reduce results appropriately
- [ ] Jobs have metadata (size, industry, level)

### Travel:
- [ ] Backend flexible search returns price calendar
- [ ] Destination guide has attractions + food + tips
- [ ] Search completes in <30 seconds

---

**Next**: Implement frontend UI for flexible dates and destination guides! 🎨
