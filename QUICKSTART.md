# 🚀 QUICKSTART - Run in 30 Seconds!

## ✅ Everything is Fixed and Ready!

### Fastest Way to Run:

#### Option 1: Double-Click These Files
1. `start-backend.bat` (wait for "Server running...")
2. `start-frontend.bat` (opens automatically at http://localhost:5173)

#### Option 2: Use Test Script
1. `test-and-run.bat` (guided setup with checks)

#### Option 3: Manual Commands
```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2  
cd frontend
npm run dev
```

---

## 📝 Before First Run

### ⚠️ IMPORTANT: Upgrade Node.js First (Required: Node 18+)

**Why upgrade?**
- ✅ Better performance and security
- ✅ Access to modern JavaScript features
- ✅ Compatible with latest packages (tsx, modern TypeScript, etc.)
- ✅ Industry best practice - Node 14 is EOL (End of Life)

**Current Node.js version:**
```powershell
node --version
```

**If you see `v14.x` or `v16.x`, upgrade now:**

#### Option 1: Direct Install (Recommended)
1. Download Node.js LTS from [nodejs.org](https://nodejs.org/) (v20.x LTS)
2. Run the installer (it will replace your old version)
3. Restart your terminal/PowerShell
4. Verify: `node --version` (should show v20.x)

#### Option 2: Use nvm-windows (If you need multiple versions)
```powershell
# Install nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
nvm install 20
nvm use 20
node --version  # Should show v20.x
```

### 2. Configure Database (PostgreSQL)
```powershell
# Create a PostgreSQL database (using psql or your preferred tool)
# Then update backend/.env with your connection string:
DATABASE_URL="postgresql://user:password@localhost:5432/pocketknife"

# Run database migrations
cd backend
npx prisma migrate dev
```

### 3. Edit `backend\.env` - Update these lines:
```env
GMAIL_USER_EMAIL=your-email@gmail.com
ALERT_EMAIL=your-email@gmail.com
DATABASE_URL=postgresql://user:password@localhost:5432/pocketknife
ANTHROPIC_API_KEY=your-anthropic-key
```

### 4. Enable Google APIs (in Google Cloud Console)
- Gmail API
- Google Drive API  
- **Google Calendar API** (required for ToDo agent calendar sync)
- **Custom Search API** (optional, for enhanced search in all agents)

### 5. (Optional) Google Custom Search Setup

For enhanced web search in Shopping, Travel, Learning, and Problems agents:

1. **Create Custom Search Engine:**
   - Go to [cse.google.com](https://cse.google.com)
   - Create a new search engine
   - Under "Sites to search", add: `*.zap.co.il`, `*.ksp.co.il`, `*.tripadvisor.com`, etc.
   - Get the **Search Engine ID** (cx parameter)

2. **Get API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable "Custom Search API"
   - Create an API key

3. **Add to `.env`:**
   ```env
   GOOGLE_CSE_API_KEY=your-api-key
   GOOGLE_CSE_ID=your-search-engine-id
   ```

**Free Tier:** 100 queries/day shared across all agents. Falls back to scrapers when exhausted.

**After configuring, run:**
```powershell
cd backend
npm install
npx prisma migrate dev  # Set up database
npm run dev
```

Everything else is already configured!

---

## ✅ Success! You should see:

**Backend:**
```
✅ Server is running on port 5000
```

**Frontend:**
```
➜ Local: http://localhost:5173/
```

---

## 🧪 Quick Test

```powershell
curl http://localhost:5000/health
```

Should return: `{"status":"OK",...}`

---

## 📚 Full Documentation

- `README.md` - Complete guide
- `SETUP_AND_RUN.md` - Detailed setup
- `BUGS_FIXED.md` - All fixes applied

---

**That's it! You're running! 🎉**
