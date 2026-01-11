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
- **Local Search**: Find attractions, restaurants, activities via Google Search
- **Deal Scoring**: AI-powered deal quality scoring
- **Flexible Dates**: Search across date ranges to find cheapest options
- **Specialized Trips**: Support for ski trips, beach vacations, etc.

### 📚 Learning Agent
- **Content Aggregation**: Scans Dev.to, Hacker News, and other sources for educational content
- **Web Search**: Search tutorials, documentation, and articles via Google Search
- **AI Topic Summaries**: Get comprehensive topic breakdowns for senior developers
- **AI Article Summaries**: Get concise summaries with TL;DR, key takeaways, and diagrams
- **Topic Filtering**: Filter by your interests

### 💻 Problem Solving Agent
- **Multi-Source Problems**: Search from LeetCode, Codeforces, and curated lists
- **Solution Search**: Find solutions and explanations via Google Search
- **Curated Lists**: Blind 75, NeetCode 150, Grind 75 built-in
- **Company Profiles**: 30+ company interview profiles with tips and focus areas
- **Monaco Code Editor**: Full-featured code editor with syntax highlighting
- **AI Code Evaluation**: Submit code for AI analysis (correctness, complexity, quality)
- **Code Review**: Apply suggestions with diff view (accept/reject changes)
- **Method Signature Generation**: Auto-generate problem-specific templates

### ✅ ToDo Agent (NEW!)
- **Task Management**: Create, update, complete, and delete tasks with priorities
- **Google Calendar Sync**: Sync tasks to your Google Calendar with one click
- **Routine Learning**: AI learns your patterns and suggests recurring tasks
- **Daily Agenda**: View your tasks organized by date with completion tracking
- **Task Categories**: Organize tasks by work, personal, health, learning, etc.
- **Recurring Tasks**: Set up daily, weekly, or monthly recurring tasks

### 🛒 Shopping Agent (NEW!)
- **Deal Finder**: Search for products across multiple sources (eBay, AliExpress, etc.)
- **Israeli Shops Support**: Search Zap, KSP, Ivory, Shufersal via Google Custom Search
- **AI Deal Scoring**: AI evaluates deals and suggests best options
- **Hobby-Based Suggestions**: Get product recommendations based on your interests
- **Price Alerts**: Set alerts for price drops on products you're watching
- **Saved Products**: Save and track products you're interested in

### 🔐 Admin Platform (NEW!)
- **User Management**: View and manage all platform users
- **Role-Based Access**: USER, ADMIN, and SUPER_ADMIN roles
- **System Settings**: Configure platform-wide settings
- **Audit Logs**: Track all administrative actions
- **Platform Statistics**: Dashboard with user and activity metrics

### ⚙️ Settings & Authentication (NEW!)
- **Google OAuth**: Sign in with Google for seamless integration
- **Profile Management**: Update your name and view account details
- **Integration Settings**: Manage Google Calendar and other integrations
- **Preferences**: Configure working hours, default task duration, and more
- **Deep Linking**: Direct URLs to all agents and pages for easy navigation

## 📁 Project Structure

```
pocketknife/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (PostgreSQL)
│   ├── src/
│   │   ├── agents/                # Agent implementations
│   │   │   ├── ToDoAgent.ts       # ToDo agent logic
│   │   │   ├── ShoppingAgent.ts   # Shopping agent logic
│   │   │   └── ...
│   │   ├── controllers/           # API request handlers
│   │   ├── middleware/            # Auth & admin middleware
│   │   ├── routes/                # API route definitions
│   │   ├── services/              # Business logic (organized by agent)
│   │   │   ├── calendar/          # Google Calendar integration
│   │   │   ├── email/             # Email Agent services
│   │   │   ├── jobs/              # Job Agent services
│   │   │   ├── travel/            # Travel Agent services
│   │   │   ├── learning/          # Learning Agent services
│   │   │   ├── problemSolving/    # Problem Solving Agent services
│   │   │   ├── shopping/          # Shopping Agent services (Israeli shops, scrapers)
│   │   │   ├── notifications/     # Notification services
│   │   │   └── core/              # Shared core services (database, cache, Google Search)
│   │   ├── data/                  # Curated problems, company mappings
│   │   ├── utils/                 # Utility functions
│   │   ├── types/                 # TypeScript type definitions
│   │   └── index.ts               # Entry point
│   ├── credentials/               # OAuth tokens (gitignored)
│   └── data/                      # Local data storage
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── common/            # Reusable UI components
│   │   │   ├── ToDoAgent.tsx      # ToDo agent UI
│   │   │   ├── ShoppingAgent.tsx  # Shopping agent UI
│   │   │   ├── AdminPanel.tsx     # Admin dashboard
│   │   │   ├── SettingsPage.tsx   # User settings
│   │   │   ├── HomePage.tsx       # Home page
│   │   │   └── ...
│   │   ├── hooks/                 # Custom React hooks (useAuth, useTodo, etc.)
│   │   ├── services/              # API client functions
│   │   ├── styles/                # CSS modules for styling
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
| GOOGLE_CLIENT_ID | Yes | Gmail, Drive, and Calendar access |
| GOOGLE_CLIENT_SECRET | Yes | Gmail, Drive, and Calendar access |
| DATABASE_URL | Yes | PostgreSQL connection string |
| GOOGLE_CSE_API_KEY | Optional | Google Custom Search (100 free queries/day) |
| GOOGLE_CSE_ID | Optional | Custom Search Engine ID |
| AMADEUS_API_KEY | Optional | Travel flight/hotel search |
| RAPIDAPI_KEY | Optional | JSearch job aggregator (LinkedIn, Glassdoor, Indeed) |
| ADZUNA_APP_ID | Optional | Adzuna job board |

### Google Cloud APIs to Enable
- Gmail API
- Google Drive API
- Google Calendar API (required for ToDo agent calendar sync)
- Custom Search API (optional, for enhanced search in all agents)

### Frontend Environment Variables

For production deployments, set these in `frontend/.env`:

```bash
# API endpoint (default: http://localhost:5000/api)
VITE_API_URL=https://your-api-domain.com/api

# WebSocket URL (default: http://localhost:5000)
VITE_SOCKET_URL=wss://your-api-domain.com
```

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

### ToDo Agent
1. Navigate to the "ToDo" tab (or go to /todo)
2. Click "Add Task" to create a new task
3. Set priority, category, due date, and time
4. Click "Sync Calendar" to sync all tasks to Google Calendar
5. Click tasks to mark them complete/incomplete
6. View your daily agenda with estimated duration

### Shopping Agent
1. Navigate to the "Shopping" tab (or go to /shopping)
2. Search for products by name or description
3. Or enter your hobbies to get AI-powered suggestions
4. Save products you're interested in
5. Set price alerts for notifications

### Admin Panel (for administrators)
1. Sign in with an admin account (itayosov@gmail.com)
2. Access via the "Admin" button in the header
3. Manage users, view audit logs, configure settings

### Settings
1. Click your profile icon in the header
2. Access Settings to manage your profile
3. Configure Google integrations
4. Update preferences for each agent

## 🗄️ Database Management

### Prisma Studio (Visual Database Browser)
Run this command to open a visual database browser in your browser:

```bash
cd backend && npx prisma studio
```

This opens at http://localhost:5555 and lets you:
- Browse all database tables
- View, edit, and delete records
- Filter and search data
- Export data

### Useful Prisma Commands

| Command | Description |
|---------|-------------|
| `npx prisma studio` | Open visual database browser |
| `npx prisma migrate dev` | Apply pending migrations |
| `npx prisma db push` | Push schema changes (no migration) |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma db seed` | Run seed script |

## 📚 Documentation

- **QUICKSTART.md** - Quick start guide
- **ARCHITECTURE.md** - Detailed architecture overview
- **GOOGLE_SETUP.md** - Google OAuth setup guide
- **SECRETS.md** - Secrets management best practices
- **DATABASE_MIGRATIONS.md** - Database migrations and schema documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details.

## 👤 Author

**Itay Osov** - [itayosov@gmail.com](mailto:itayosov@gmail.com)
