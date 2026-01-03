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

## 📝 Before First Run (30 seconds)

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

**After upgrading, run:**
```powershell
cd backend
npm install  # Reinstall with modern packages
npm run dev  # Should work perfectly now!
```

### 2. Edit `backend\.env` - Update these 2 lines:
```env
GMAIL_USER_EMAIL=your-email@gmail.com
ALERT_EMAIL=your-email@gmail.com
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
