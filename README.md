# 🔧 Pocketknife - Multi-Agent AI Platform

A comprehensive AI-powered platform featuring multiple intelligent agents for email processing, job searching, travel deals, and knowledge gathering.

## 🚀 Features

### 📧 Email Agent
- **Smart Classification**: Automatically categorizes emails into invoices, job offers, spam, etc.
- **Hebrew & English Support**: Full support for both languages
- **Auto-Save Invoices**: Automatically uploads invoices to Google Drive
- **Notifications**: Get alerts via Email, Discord, or Telegram
- **Automation**: Schedule automatic email processing with cron jobs

### 💼 Jobs Agent
- **Multi-Source Search**: Aggregates jobs from LinkedIn, Glassdoor, Indeed, RemoteOK, Remotive, and more
- **AI-Powered Matching**: Uses Claude AI to match your CV against job listings
- **Real-Time Updates**: WebSocket-based live job streaming
- **Advanced Filters**: Filter by location, salary, company size, experience level, industry
- **Israeli Market Support**: Includes local job boards

### ✈️ Travel Agent
- **Flight Search**: Find best flight deals using Amadeus API
- **Hotel Search**: Compare hotel prices and ratings
- **Deal Scoring**: AI-powered deal quality scoring
- **Flexible Dates**: Search across date ranges to find cheapest options
- **Specialized Trips**: Support for ski trips, beach vacations, etc.

### 📚 Learning Agent (NEW!)
- **Content Aggregation**: Scans LinkedIn, tech blogs, and other sources for educational content
- **AI Summaries**: Get concise summaries of articles and resources
- **Topic Filtering**: Filter by your interests (e.g., senior developer content)
- **Link Collection**: Save and organize valuable learning resources

## 📁 Project Structure

```
pocketknife/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API request handlers
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic and external APIs
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript type definitions
│   │   └── index.ts         # Entry point
│   ├── credentials/         # OAuth tokens and API keys
│   └── data/               # Local data storage
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client functions
│   │   └── types/          # TypeScript types
│   └── index.html
└── shared/
    └── types.ts            # Shared type definitions
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+
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
cp backend/.env.example backend/.env

# Edit with your API keys
```

4. **Set up Google OAuth**
```bash
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

## 🔑 API Keys Required

| Service | Required | Purpose |
|---------|----------|---------|
| ANTHROPIC_API_KEY | Yes | Claude AI for email classification and job matching |
| GOOGLE_CLIENT_ID | Yes | Gmail and Drive access |
| GOOGLE_CLIENT_SECRET | Yes | Gmail and Drive access |
| AMADEUS_API_KEY | Optional | Travel flight/hotel search |
| RAPIDAPI_KEY | Optional | JSearch job aggregator (LinkedIn, Glassdoor, Indeed) |
| ADZUNA_APP_ID | Optional | Adzuna job board |

## 🎯 Usage

### Email Processing
1. Navigate to the "Email Agent" tab
2. Click "Process All Emails"
3. Watch as emails are classified and processed
4. Check Google Drive for saved invoices

### Job Search
1. Navigate to the "Jobs" tab
2. Upload your CV (PDF, DOCX, or TXT)
3. Configure search filters
4. Click "Search Jobs"
5. View matched jobs sorted by match score

### Travel Search
1. Navigate to the "Travel" tab
2. Enter origin, destination, and dates
3. Set passenger count and preferences
4. Click "Search"
5. Browse flights and hotels sorted by deal score

### Learning Agent
1. Navigate to the "Learning" tab
2. Enter topics of interest
3. Select sources to scan
4. Get curated links and AI summaries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details.

## 👤 Author

**Itay Osov** - [itayosov@gmail.com](mailto:itayosov@gmail.com)
