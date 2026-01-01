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
│  ┌──────────────┐                                                   │
│  │Learning Agent│                                                   │
│  │              │                                                   │
│  │ • Aggregate  │                                                   │
│  │ • Summarize  │                                                   │
│  │ • Organize   │                                                   │
│  └──────────────┘                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
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
| **Socket.io Client** | Real-time updates |
| **Lucide React** | Icon library |

### External APIs
| API | Agent | Purpose |
|-----|-------|---------|
| **Anthropic Claude** | All | AI classification, matching, summarization |
| **Gmail API** | Email | Read/write emails, labels |
| **Google Drive API** | Email | Store invoices |
| **Amadeus** | Travel | Flight & hotel search |
| **JSearch (RapidAPI)** | Jobs | LinkedIn, Glassdoor, Indeed aggregation |
| **RemoteOK** | Jobs | Remote job listings |
| **Remotive** | Jobs | Remote job listings |
| **Dev.to** | Learning | Technical articles |
| **Hacker News** | Learning | Tech discussions |

## Directory Structure

```
pocketknife/
├── backend/
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   │   ├── agentController.ts      # Email agent endpoints
│   │   │   ├── jobController.ts        # Job search endpoints
│   │   │   ├── travelController.ts     # Travel search endpoints
│   │   │   └── learningController.ts   # Learning agent endpoints
│   │   │
│   │   ├── services/           # Business logic
│   │   │   ├── claudeService.ts        # AI classification
│   │   │   ├── gmailService.ts         # Gmail API integration
│   │   │   ├── driveService.ts         # Google Drive integration
│   │   │   ├── jobSourceService.ts     # Multi-source job aggregation
│   │   │   ├── jobMatchingService.ts   # AI job-CV matching
│   │   │   ├── israeliJobsService.ts   # Israeli tech companies
│   │   │   ├── travelSearchService.ts  # Amadeus API integration
│   │   │   ├── specializedTravelService.ts # Ski/Beach trips
│   │   │   ├── learningService.ts      # Content aggregation
│   │   │   └── emailSchedulerService.ts # Cron automation
│   │   │
│   │   ├── routes/             # API route definitions
│   │   │   ├── index.ts        # Route aggregator
│   │   │   ├── jobs.ts         # /api/jobs/*
│   │   │   ├── travel.ts       # /api/travel/*
│   │   │   └── learning.ts     # /api/learning/*
│   │   │
│   │   ├── types/              # TypeScript definitions
│   │   ├── utils/              # Utility functions
│   │   └── index.ts            # Entry point
│   │
│   ├── credentials/            # OAuth tokens (gitignored)
│   └── data/                   # Local data storage
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── GmailAgent.tsx          # Email processing UI
│   │   │   ├── JobSearchPanel.tsx      # Job search form
│   │   │   ├── JobListings.tsx         # Job results display
│   │   │   ├── TravelSearchPanel.tsx   # Travel search form
│   │   │   ├── FlightResults.tsx       # Flight display
│   │   │   ├── HotelResults.tsx        # Hotel display
│   │   │   └── LearningAgent.tsx       # Learning content UI
│   │   │
│   │   ├── services/           # API client functions
│   │   │   ├── api.ts          # Agent API calls
│   │   │   └── travelApi.ts    # Travel API calls
│   │   │
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript definitions
│   │   └── App.tsx             # Main application
│   │
│   └── index.html              # Entry HTML
│
└── shared/
    └── types.ts                # Shared type definitions
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
                    │   (Claude Analysis)      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Sorted Results with     │
                    │  Match Scores (0-100%)   │
                    └──────────────────────────┘
```

### Travel Search Flow

```
┌──────────────┐     ┌─────────────────────────────────┐
│ Search Query │────▶│        Amadeus API              │
│ (Origin,     │     │  • Flight Offers Search         │
│  Dest, Date) │     │  • Hotel List by City           │
└──────────────┘     │  • Hotel Offers                 │
                     └───────────────┬─────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
                     ▼                               ▼
              ┌──────────────┐              ┌──────────────┐
              │   Flights    │              │    Hotels    │
              │              │              │              │
              │ Deal Score   │              │ Deal Score   │
              │ Calculation  │              │ Calculation  │
              └──────────────┘              └──────────────┘
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

## Real-Time Communication

Socket.io is used for real-time updates:

```javascript
// Events emitted by server
io.emit('log', { message: '...', type: 'info|success|error|warning' });
io.emit('job-match', { job: {...}, progress: {...} });
io.emit('travel-log', { message: '...', type: 'info' });
io.emit('learning-log', { message: '...', type: 'info' });
io.emit('learning-resource', { resource: {...} });
```

## Security Considerations

1. **Credentials Storage**: OAuth tokens stored locally in `credentials/` (gitignored)
2. **API Keys**: Environment variables via `.env` file
3. **CORS**: Configured for frontend origin only
4. **Input Validation**: Pydantic-style validation on request bodies

## Scalability

The architecture supports:
- **Horizontal Scaling**: Stateless backend can run multiple instances
- **Async Processing**: All I/O operations are async/await
- **Rate Limiting**: Built-in delays for external API calls
- **Caching**: Token caching for OAuth (Amadeus, Gmail)

## Future Enhancements

- [ ] Redis caching for job/travel results
- [ ] PostgreSQL for persistent job history
- [ ] Docker containerization
- [ ] Kubernetes deployment config
- [ ] WhatsApp notification integration
- [ ] Mobile app (React Native)


