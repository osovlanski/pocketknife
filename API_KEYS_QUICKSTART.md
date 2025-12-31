# API Keys Quick Reference

## 🚀 Quick Links

### RapidAPI (JSearch) - LinkedIn, Glassdoor, Indeed
- **Signup**: https://rapidapi.com/
- **API Page**: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **FREE Tier**: 150 requests/month
- **Speed**: Slow (15-25 seconds)
- **Add to .env**: `RAPIDAPI_KEY=your_key_here`

### Adzuna - Indeed, Reed, CV-Library
- **Signup**: https://developer.adzuna.com/
- **FREE Tier**: 5,000 calls/month
- **Works in**: US, UK, CA, AU, DE, FR (NOT Israel ❌)
- **Add to .env**: 
  ```
  ADZUNA_APP_ID=your_app_id
  ADZUNA_APP_KEY=your_app_key
  ```

### Findwork.dev - Developer Jobs
- **Signup**: https://findwork.dev/
- **API Request**: https://findwork.dev/developers/
- **FREE**: Limited (personal use)
- **PRO**: $29/month - unlimited
- **Note**: Manual approval (1-3 days)
- **Update code**: Replace `'Token public'` with `'Token your_token'` in `additionalJobAPIs.ts`

---

## 🎯 Which Keys Do I Need?

### ✅ No Keys Needed (Already Working)
Current setup provides **70-95 jobs per search, FREE, fast (2-5 seconds)**:
- RemoteOK
- Remotive
- Arbeitnow

### 🇮🇱 For Israeli Job Market
**Recommended**: 
- ✅ Keep current setup (perfect for Israel)
- ⚠️ Optional: RapidAPI (adds LinkedIn jobs, but slow)

**Not Recommended**:
- ❌ Adzuna (doesn't support Israel)

### 🇺🇸 For US/UK/CA/AU Job Market
**Highly Recommended**:
- ✅ Adzuna (FREE, adds 30-50 jobs from Indeed/Reed)
- ✅ RapidAPI (adds LinkedIn/Glassdoor jobs)

### 💻 For Tech/Developer Roles Only
- ⏳ Findwork.dev (if you get API access)

---

## ⚡ Quick Setup (5 minutes)

### 1. Get RapidAPI Key (for LinkedIn jobs)
```bash
# 1. Go to: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
# 2. Click "Subscribe to Test" → Select FREE plan
# 3. Copy the API key from Code Snippets
# 4. Edit backend/.env:
RAPIDAPI_KEY=ac3006845dmsh124ad21b5ff0560p130083jsn1e2c60329146
```

### 2. Get Adzuna Keys (US/UK/CA/AU only)
```bash
# 1. Go to: https://developer.adzuna.com/
# 2. Register → Create Application
# 3. Copy App ID and App Key
# 4. Edit backend/.env:
ADZUNA_APP_ID=1b392f66
ADZUNA_APP_KEY=28825ea133128a3a4413986eb08268fc
```

### 3. Restart Backend
```bash
cd backend
npm run dev
```

---

## 🧪 Test Your Keys

After adding keys, search for jobs and check the console:

**Expected Output**:
```
✅ Found 23 jobs from RemoteOK
✅ Found 28 jobs from Remotive  
✅ Found 19 jobs from Arbeitnow
✅ Found 15 jobs from RapidAPI (JSearch)      ← NEW with RapidAPI key
✅ Found 31 jobs from Adzuna                  ← NEW with Adzuna keys
⚠️ Findwork.dev API requires authentication - skipping
⚠️ The Muse API blocked - skipping
⚠️ Himalayas API blocked - skipping

📊 Total: 116 jobs found (85 after deduplication)
```

---

## 🆘 Troubleshooting

### "RapidAPI: Unauthorized"
- Check if key is correct in `.env`
- Verify you subscribed to the **FREE plan**
- Check rate limits (150 requests/month on FREE tier)

### "Adzuna: No results"
- Adzuna doesn't support Israel - only works in US, UK, CA, AU, etc.
- Make sure you're searching with a supported country location

### "Findwork.dev: 401 Error"
- The public token doesn't work
- You need to request official API access at https://findwork.dev/developers/
- Approval takes 1-3 business days

### Keys not loading
- Make sure `.env` has no quotes: `KEY=value` (NOT `KEY="value"`)
- Make sure `.env` has no spaces: `KEY=value` (NOT `KEY = value`)
- Always restart backend after changing `.env`

---

## 📊 Expected Results

| Setup | APIs | Jobs per Search | Response Time | Cost |
|-------|------|----------------|---------------|------|
| **Current (No Keys)** | 3 | 70-95 | 2-5 sec | FREE |
| **+ RapidAPI** | 4 | 90-120 | 15-25 sec | FREE (150/mo) |
| **+ Adzuna (US/UK)** | 5 | 110-150 | 5-8 sec | FREE (5000/mo) |
| **All Keys** | 8 | 130-180 | 20-30 sec | Mostly FREE |

---

## 💡 Pro Tips

1. **Start Simple**: Use the current setup (no keys). It works great!
2. **Add Gradually**: If you need more jobs, add RapidAPI first
3. **Location Matters**: Adzuna only if you're in US/UK/CA/AU
4. **Speed vs Quantity**: RapidAPI adds jobs but slows down search
5. **Rate Limits**: FREE tiers have limits - don't spam searches

---

## 🎉 Done!

You're all set! The system will automatically:
- ✅ Use all APIs with valid keys
- ⚠️ Skip APIs without keys (with warning)
- ❌ Handle errors gracefully
- 🔄 Deduplicate results
- ⚡ Return results fast

For detailed instructions, see: **API_KEYS_GUIDE.md**
