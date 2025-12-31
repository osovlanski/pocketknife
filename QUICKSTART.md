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

Edit `backend\.env` - Update these 2 lines:
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
