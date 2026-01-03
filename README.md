# 🔧 Pocketknife - Multi-Agent AI Platform

A comprehensive AI-powered platform featuring multiple intelligent agents for email processing, job searching, travel deals, knowledge gathering, and coding interview preparation.

## 🚀 Features

### 📧 Email Agent
- **Smart Classification**: Automatically categorizes emails into invoices, job offers, spam, etc.
- **Hebrew & English Support**: Full support for both languages
- **Auto-Save Invoices**: Automatically uploads invoices to Google Drive
- **Notifications**: Get alerts via Email, Discord, or Telegram
- **Automation**: Schedule automatic email processing with cron jobs
- **OAuth UI**: Connect Google account directly from the UI

### 💼 Jobs Agent
- **Multi-Source Search**: Aggregates jobs from LinkedIn, Glassdoor, Indeed, RemoteOK, Remotive, and more
- **AI-Powered Matching**: Uses Claude AI to match your CV against job listings
- **Company Enrichment**: View company details, growth scores, heat scores
- **Real-Time Updates**: WebSocket-based live job streaming
- **Advanced Filters**: Filter by location, salary, company size, experience level, industry
- **Israeli Market Support**: Includes local job boards
- **Stop/Pause Control**: Stop long-running searches at any time

### ✈️ Travel Agent
- **Flight Search**: Find best flight deals using Amadeus API
- **Hotel Search**: Compare hotel prices and ratings
- **Deal Scoring**: AI-powered deal quality scoring
- **Flexible Dates**: Search across date ranges to find cheapest options
- **Specialized Trips**: Support for ski trips, beach vacations, etc.

### 📚 Learning Agent
- **Content Aggregation**: Scans Dev.to, Hacker News, and other sources for educational content
- **AI Topic Summaries**: Get comprehensive topic breakdowns for senior developers
- **AI Article Summaries**: Get concise summaries with TL;DR, key takeaways, and diagrams
- **Topic Filtering**: Filter by your interests

### 💻 Problem Solving Agent (NEW!)
- **Multi-Source Problems**: Search from LeetCode, Codeforces, and curated lists
- **Curated Lists**: Blind 75, NeetCode 150, Grind 75 built-in
- **Company Profiles**: 30+ company interview profiles with tips and focus areas
- **Monaco Code Editor**: Full-featured code editor with syntax highlighting
- **AI Code Evaluation**: Submit code for AI analysis (correctness, complexity, quality)
- **Code Review**: Apply suggestions with diff view (accept/reject changes)
- **Method Signature Generation**: Auto-generate problem-specific templates

## 📁 Project Structure

```
pocketknife/
├── backend/
│   ├── src/
│   │   ├── controllers/           # API request handlers
│   │   ├── routes/                # API route definitions
│   │   ├── services/              # Business logic (organized by agent)
│   │   │   ├── email/             # Email Agent services
│   │   │   ├── jobs/              # Job Agent services
│   │   │   ├── travel/            # Travel Agent services
│   │   │   ├── learning/          # Learning Agent services
│   │   │   ├── problemSolving/    # Problem Solving Agent services
│   │   │   ├── notifications/     # Notification services
│   │   │   └── core/              # Shared core services
│   │   ├── data/                  # Curated problems, company mappings
│   │   ├── utils/                 # Utility functions
│   │   ├── types/                 # TypeScript type definitions
│   │   └── index.ts               # Entry point
│   ├── credentials/               # OAuth tokens (gitignored)
│   └── data/                      # Local data storage
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API client functions
│   │   ├── utils/                 # Utility functions
│   │   └── types/                 # TypeScript types
│   └── index.html
└── shared/
    └── types.ts                   # Shared type definitions
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+ (v20 LTS recommended)
- npm or yarn
- Google Cloud account (for Gmail & Drive APIs)
- Anthropic API key (for Claude AI)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/itayosov/pocketknife.git
cd pocketknife
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

3. **Configure environment variables**
```bash
# Copy example env file
cp backend/env.example backend/.env

# Edit with your API keys (see SECRETS.md for details)
```

4. **Set up Google OAuth** (see GOOGLE_SETUP.md for detailed guide)
```bash
# Option A: Use UI button after starting the app
# Option B: Run command line auth
cd backend
npm run auth:gmail
```

5. **Start the application**
```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev
```

6. **Open the app**
Navigate to http://localhost:5173

## 🔑 API Keys Required

| Service | Required | Purpose |
|---------|----------|---------|
| ANTHROPIC_API_KEY | Yes | Claude AI for classification, matching, code evaluation |
| GOOGLE_CLIENT_ID | Yes | Gmail and Drive access |
| GOOGLE_CLIENT_SECRET | Yes | Gmail and Drive access |
| AMADEUS_API_KEY | Optional | Travel flight/hotel search |
| RAPIDAPI_KEY | Optional | JSearch job aggregator (LinkedIn, Glassdoor, Indeed) |
| ADZUNA_APP_ID | Optional | Adzuna job board |

## 🎯 Usage

### Email Processing
1. Navigate to the "Email Agent" tab
2. Click "Connect Google Drive" if not authenticated
3. Click "Process All Emails"
4. Watch as emails are classified and processed
5. Check Google Drive for saved invoices

### Job Search
1. Navigate to the "Jobs" tab
2. Upload your CV (PDF, DOCX, or TXT)
3. Configure search filters (Office Only is default)
4. Click "Search Jobs"
5. Click company names to see enriched details
6. Use Stop button to cancel at any time

### Travel Search
1. Navigate to the "Travel" tab
2. Enter origin, destination, and dates
3. Set passenger count and preferences
4. Click "Search"
5. Browse flights and hotels sorted by deal score

### Learning Agent
1. Navigate to the "Learning" tab
2. Enter topics of interest
3. Click "Generate AI Topic Summary" for comprehensive overview
4. Click on resources for AI article summaries

### Problem Solving Agent
1. Navigate to the "Problem Solving" tab
2. Select a curated list (Blind 75, NeetCode 150) or search
3. Toggle sources (Curated, LeetCode, Codeforces)
4. Select a company to see their interview focus areas
5. Click a problem to load full description
6. Click "Signature" to generate method template
7. Write your solution in the Monaco editor
8. Click "Submit" for AI evaluation
9. Click "Apply & Review" to see suggested improvements

## 📚 Documentation

- **QUICKSTART.md** - Quick start guide
- **ARCHITECTURE.md** - Detailed architecture overview
- **GOOGLE_SETUP.md** - Google OAuth setup guide
- **SECRETS.md** - Secrets management best practices

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details.

## 👤 Author

**Itay Osov** - [itayosov@gmail.com](mailto:itayosov@gmail.com)
