# 🏗️ Pocketknife Architecture

## Overview

Pocketknife is a multi-agent AI platform built with a modern TypeScript stack. The application follows a client-server architecture with real-time communication via WebSockets.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POCKETKNIFE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Email Agent  │    │  Jobs Agent  │    │ Travel Agent │          │
│  │              │    │              │    │              │          │
│  │ • Classify   │    │ • Search     │    │ • Flights    │          │
│  │ • Tag        │    │ • Match CV   │    │ • Hotels     │          │
│  │ • Save       │    │ • Score      │    │ • Ski/Beach  │          │
│  │ • Automate   │    │              │    │              │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐                               │
│  │Learning Agent│    │Problem Solve │                               │
│  │              │    │    Agent     │                               │
│  │ • Aggregate  │    │ • LeetCode   │                               │
│  │ • Summarize  │    │ • Codeforces │                               │
│  │ • Organize   │    │ • Curated    │                               │
│  └──────────────┘    └──────────────┘                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime environment |
| **Express.js** | REST API framework |
| **TypeScript** | Type-safe development |
| **Socket.io** | Real-time WebSocket communication |
| **node-cron** | Scheduled task automation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Monaco Editor** | Code editor (Problem Solving) |
| **Socket.io Client** | Real-time updates |
| **Lucide React** | Icon library |

### External APIs
| API | Agent | Purpose |
|-----|-------|---------|
| **Anthropic Claude** | All | AI classification, matching, summarization, code evaluation |
| **Gmail API** | Email | Read/write emails, labels |
| **Google Drive API** | Email | Store invoices |
| **Amadeus** | Travel | Flight & hotel search |
| **JSearch (RapidAPI)** | Jobs | LinkedIn, Glassdoor, Indeed aggregation |
| **RemoteOK** | Jobs | Remote job listings |
| **LeetCode GraphQL** | Problem Solving | Coding problems, descriptions |
| **Codeforces API** | Problem Solving | Competitive programming problems |
| **Dev.to** | Learning | Technical articles |
| **Hacker News** | Learning | Tech discussions |

## Directory Structure

```
pocketknife/
├── backend/
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   │   ├── agentController.ts        # Email agent endpoints
│   │   │   ├── authController.ts         # OAuth endpoints
│   │   │   ├── jobController.ts          # Job search endpoints
│   │   │   ├── travelController.ts       # Travel search endpoints
│   │   │   ├── learningController.ts     # Learning agent endpoints
│   │   │   └── problemSolvingController.ts # Problem solving endpoints
│   │   │
│   │   ├── services/                 # Business logic (organized by agent)
│   │   │   ├── email/                    # Email Agent services
│   │   │   │   ├── gmailService.ts           # Gmail API integration
│   │   │   │   ├── driveService.ts           # Google Drive integration
│   │   │   │   ├── googleAuthService.ts      # OAuth handling
│   │   │   │   ├── emailNotificationService.ts
│   │   │   │   ├── emailSchedulerService.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── jobs/                     # Job Agent services
│   │   │   │   ├── jobSourceService.ts       # Multi-source aggregation
│   │   │   │   ├── jobMatchingService.ts     # AI job-CV matching
│   │   │   │   ├── aiJobSearchService.ts     # AI-powered search
│   │   │   │   ├── cvAnalysisService.ts      # CV parsing
│   │   │   │   ├── companyEnrichmentService.ts
│   │   │   │   ├── israeliJobsService.ts
│   │   │   │   ├── israelTechScraperService.ts
│   │   │   │   ├── additionalJobAPIs.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── travel/                   # Travel Agent services
│   │   │   │   ├── travelSearchService.ts    # Amadeus API
│   │   │   │   ├── tripPlanningService.ts
│   │   │   │   ├── specializedTravelService.ts
│   │   │   │   ├── destinationRecommendationsService.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── learning/                 # Learning Agent services
│   │   │   │   ├── learningService.ts        # Content aggregation
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── problemSolving/           # Problem Solving Agent services
│   │   │   │   ├── problemSolvingService.ts  # Coding problems, evaluation
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── notifications/            # Cross-cutting notifications
│   │   │   │   ├── discordNotificationService.ts
│   │   │   │   ├── telegramNotificationService.ts
│   │   │   │   ├── whatsappService.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── core/                     # Shared core services
│   │   │   │   ├── claudeService.ts          # AI client wrapper
│   │   │   │   ├── processControlService.ts  # Stop/pause control
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                  # Central export
│   │   │
│   │   ├── data/                     # Static data & mappings
│   │   │   ├── curatedProblems.ts        # Blind 75, NeetCode 150
│   │   │   └── companyMappings.ts        # Company interview profiles
│   │   │
│   │   ├── routes/                   # API route definitions
│   │   │   ├── index.ts                  # Route aggregator
│   │   │   ├── agent.ts                  # /api/agent/*
│   │   │   ├── auth.ts                   # /api/auth/*
│   │   │   ├── jobs.ts                   # /api/jobs/*
│   │   │   ├── travel.ts                 # /api/travel/*
│   │   │   ├── learning.ts               # /api/learning/*
│   │   │   └── problemSolving.ts         # /api/problems/*
│   │   │
│   │   ├── types/                    # TypeScript definitions
│   │   │   ├── index.ts
│   │   │   └── travel.ts
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── emailProcessor.ts
│   │   │   ├── anthropicClient.ts        # Shared AI client
│   │   │   └── logger.ts
│   │   │
│   │   ├── config/                   # Configuration
│   │   │   └── credentials.ts
│   │   │
│   │   └── index.ts                  # Entry point
│   │
│   ├── credentials/                  # OAuth tokens (gitignored)
│   └── data/                         # Local data storage
│
├── frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── GmailAgent.tsx            # Email processing UI
│   │   │   ├── JobSearchPanel.tsx        # Job search form
│   │   │   ├── JobListings.tsx           # Job results display
│   │   │   ├── TravelSearchPanel.tsx     # Travel search form
│   │   │   ├── FlightResults.tsx         # Flight display
│   │   │   ├── HotelResults.tsx          # Hotel display
│   │   │   ├── LearningAgent.tsx         # Learning content UI
│   │   │   ├── ProblemSolvingAgent.tsx   # Coding problems UI
│   │   │   ├── ActivityLog.tsx           # Global activity log
│   │   │   ├── SearchButton.tsx          # Reusable search/stop button
│   │   │   └── ...
│   │   │
│   │   ├── services/                 # API client functions
│   │   │   ├── api.ts                    # Agent API calls
│   │   │   └── travelApi.ts              # Travel API calls
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAgent.ts
│   │   │   └── useSearchController.ts    # Global search/stop control
│   │   │
│   │   ├── utils/                    # Utilities
│   │   │   └── fileParser.ts             # PDF/Word parsing
│   │   │
│   │   ├── types/                    # TypeScript definitions
│   │   └── App.tsx                   # Main application
│   │
│   └── index.html                    # Entry HTML
│
├── shared/
│   └── types.ts                      # Shared type definitions
│
├── ARCHITECTURE.md                   # This file
├── QUICKSTART.md                     # Quick start guide
├── GOOGLE_SETUP.md                   # Google OAuth setup
├── SECRETS.md                        # Secrets management template
└── README.md                         # Project overview
```

## Data Flow

### Email Processing Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│  Gmail  │────▶│  Fetch   │────▶│ Claude  │────▶│ Classify │
│  Inbox  │     │  Emails  │     │   AI    │     │          │
└─────────┘     └──────────┘     └─────────┘     └────┬─────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────┐
                    │                                 │                 │
                    ▼                                 ▼                 ▼
              ┌──────────┐                     ┌──────────┐      ┌──────────┐
              │ Invoice  │                     │ Job Offer│      │   Spam   │
              │          │                     │          │      │          │
              │ Save to  │                     │  Send    │      │  Move to │
              │  Drive   │                     │  Alert   │      │  Folder  │
              └──────────┘                     └──────────┘      └──────────┘
```

### Job Search Flow

```
┌───────────┐     ┌──────────────────────────────────────┐
│  User CV  │────▶│         CV Analysis (Claude)         │
└───────────┘     └──────────────────┬───────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Parallel Job Search                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  RemoteOK   │  Remotive   │   JSearch   │  Arbeitnow  │ Israeli │
│             │             │ (LinkedIn)  │             │  Tech   │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴─────────────┴─────────────┴───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   AI Job Matching        │
                    │   + Company Enrichment   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Sorted Results with     │
                    │  Match Scores + Company  │
                    │  Info (Growth, Heat)     │
                    └──────────────────────────┘
```

### Problem Solving Flow

```
┌─────────────┐     ┌──────────────────────────────────────┐
│ Search Query│────▶│         Multi-Source Search          │
│ or Curated  │     ├──────────┬───────────┬───────────────┤
│    List     │     │ Curated  │ LeetCode  │  Codeforces   │
└─────────────┘     │ (Blind   │  GraphQL  │    API        │
                    │ 75, etc) │    API    │               │
                    └────┬─────┴─────┬─────┴───────┬───────┘
                         │           │             │
                         └───────────┴─────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────┐
                    │   Select Problem         │
                    │   Write Solution         │
                    │   (Monaco Editor)        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   AI Code Evaluation     │
                    │   (Correctness, Time,    │
                    │    Space, Quality)       │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Feedback + Suggestions │
                    │   Apply & Review (Diff)  │
                    └──────────────────────────┘
```

## API Endpoints

### Email Agent (`/api/agent/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/emails` | Fetch unprocessed emails |
| POST | `/classify` | Classify single email |
| POST | `/process-all` | Process all unread emails |
| GET | `/invoices` | List saved invoices |
| GET | `/scheduler/status` | Get automation status |
| POST | `/scheduler/start` | Start auto-processing |
| POST | `/scheduler/stop` | Stop auto-processing |

### Jobs Agent (`/api/jobs/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search jobs with CV matching |
| POST | `/upload-cv` | Upload CV for analysis |
| GET | `/resources` | Get Israeli job board links |
| GET | `/company-info/:name` | Get company enrichment data |

### Travel Agent (`/api/travel/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search flights & hotels |
| POST | `/ski` | Search ski resort deals |
| POST | `/beach` | Search beach vacation deals |
| GET | `/ski/resorts` | List available ski resorts |
| GET | `/recommendations` | AI destination suggestions |

### Learning Agent (`/api/learning/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search educational content |
| POST | `/summarize` | AI summarize article |
| POST | `/topic-summary` | Generate topic summary |

### Problem Solving Agent (`/api/problems/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search coding problems |
| GET | `/description/:slug` | Get problem description |
| POST | `/hints` | Generate hints for problem |
| POST | `/evaluate` | Evaluate code solution |
| POST | `/signature` | Generate method signature |
| POST | `/improve` | Apply suggestions to code |
| GET | `/company/:name` | Get company interview profile |
| GET | `/companies` | List all companies |
| GET | `/curated-lists` | List curated problem sets |

### Auth (`/api/auth/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/google/url` | Get Google OAuth URL |
| GET | `/google/callback` | OAuth callback handler |

## Real-Time Communication

Socket.io is used for real-time updates:

```javascript
// Events emitted by server
io.emit('log', { message: '...', type: 'info|success|error|warning' });
io.emit('job-match', { job: {...}, progress: {...} });
io.emit('travel-log', { message: '...', type: 'info' });
io.emit('learning-log', { message: '...', type: 'info' });
io.emit('learning-resource', { resource: {...} });
io.emit('process-status:stopped', { agentType: 'jobs|email', message: '...' });
```

## Security Considerations

1. **Credentials Storage**: OAuth tokens stored locally in `credentials/` (gitignored)
2. **API Keys**: Environment variables via `.env` file
3. **CORS**: Configured for frontend origin only
4. **Input Validation**: Request body validation on all endpoints
5. **Secrets Management**: See `SECRETS.md` for best practices

## Scalability

The architecture supports:
- **Horizontal Scaling**: Stateless backend can run multiple instances
- **Async Processing**: All I/O operations are async/await
- **Rate Limiting**: Built-in delays for external API calls
- **Caching**: Token caching for OAuth (Amadeus, Gmail)
- **Process Control**: Centralized stop/pause mechanism for long operations

## Future Enhancements

- [ ] Redis caching for job/travel results
- [ ] PostgreSQL for persistent job history
- [ ] Docker containerization
- [ ] Kubernetes deployment config
- [ ] WhatsApp notification integration
- [ ] Mobile app (React Native)
- [ ] More problem sources (GeeksforGeeks, InterviewBit)
