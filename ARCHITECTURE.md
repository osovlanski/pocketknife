# 🏗️ Pocketknife Architecture

## Overview

Pocketknife is a multi-agent AI platform built with a modern TypeScript stack. The application follows a client-server architecture with real-time communication via WebSockets.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              POCKETKNIFE                                        │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Email Agent  │  │  Jobs Agent  │  │ Travel Agent │  │ ToDo Agent   │       │
│  │              │  │              │  │              │  │              │       │
│  │ • Classify   │  │ • Search     │  │ • Flights    │  │ • Tasks      │       │
│  │ • Tag        │  │ • Match CV   │  │ • Hotels     │  │ • Calendar   │       │
│  │ • Save       │  │ • Score      │  │ • Ski/Beach  │  │ • Routines   │       │
│  │ • Automate   │  │              │  │              │  │ • Agenda     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Learning Agent│  │Problem Solve │  │Shopping Agent│  │ Admin Panel  │       │
│  │              │  │    Agent     │  │              │  │              │       │
│  │ • Aggregate  │  │ • LeetCode   │  │ • Deals      │  │ • Users      │       │
│  │ • Summarize  │  │ • Codeforces │  │ • Search     │  │ • Settings   │       │
│  │ • Organize   │  │ • Curated    │  │ • Alerts     │  │ • Audit Logs │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                 │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime environment |
| **Express.js** | REST API framework |
| **TypeScript** | Type-safe development |
| **Prisma ORM** | Database ORM with type-safe queries |
| **PostgreSQL** | Relational database |
| **Socket.io** | Real-time WebSocket communication |
| **node-cron** | Scheduled task automation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **React Router** | Client-side routing & deep linking |
| **Tailwind CSS** | Utility-first styling |
| **CSS Modules** | Component-scoped styling |
| **Monaco Editor** | Code editor (Problem Solving) |
| **Socket.io Client** | Real-time updates |
| **Lucide React** | Icon library |
| **Axios** | HTTP client |

### External APIs
| API | Agent | Purpose |
|-----|-------|---------|
| **Anthropic Claude** | All | AI classification, matching, summarization, code evaluation |
| **Gmail API** | Email | Read/write emails, labels |
| **Google Drive API** | Email | Store invoices |
| **Google Calendar API** | ToDo | Sync tasks as calendar events |
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
│   ├── prisma/
│   │   └── schema.prisma             # Database schema (PostgreSQL)
│   │
│   ├── src/
│   │   ├── agents/                   # Agent implementations
│   │   │   ├── AbstractAgent.ts          # Base agent class
│   │   │   ├── ToDoAgent.ts              # ToDo agent logic
│   │   │   ├── ShoppingAgent.ts          # Shopping agent logic
│   │   │   └── index.ts                  # Agent registry
│   │   │
│   │   ├── controllers/              # Request handlers
│   │   │   ├── agentController.ts        # Email agent endpoints
│   │   │   ├── authController.ts         # OAuth endpoints
│   │   │   ├── adminController.ts        # Admin endpoints
│   │   │   ├── todoController.ts         # ToDo agent endpoints
│   │   │   ├── shoppingController.ts     # Shopping agent endpoints
│   │   │   ├── jobController.ts          # Job search endpoints
│   │   │   ├── travelController.ts       # Travel search endpoints
│   │   │   ├── learningController.ts     # Learning agent endpoints
│   │   │   └── problemSolvingController.ts # Problem solving endpoints
│   │   │
│   │   ├── middleware/               # Express middleware
│   │   │   └── adminMiddleware.ts        # Admin auth & authorization
│   │   │
│   │   ├── services/                 # Business logic (organized by agent)
│   │   │   ├── calendar/                 # Google Calendar services
│   │   │   │   └── calendarService.ts        # Calendar API integration
│   │   │   │
│   │   │   ├── email/                    # Email Agent services
│   │   │   │   ├── gmailService.ts           # Gmail API integration
│   │   │   │   ├── driveService.ts           # Google Drive integration
│   │   │   │   ├── googleAuthService.ts      # OAuth handling
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── jobs/                     # Job Agent services
│   │   │   ├── travel/                   # Travel Agent services
│   │   │   ├── learning/                 # Learning Agent services
│   │   │   ├── problemSolving/           # Problem Solving Agent services
│   │   │   ├── notifications/            # Cross-cutting notifications
│   │   │   │
│   │   │   ├── core/                     # Shared core services
│   │   │   │   ├── claudeService.ts          # AI client wrapper
│   │   │   │   ├── databaseService.ts        # Prisma database service
│   │   │   │   ├── cacheService.ts           # Caching service
│   │   │   │   ├── configService.ts          # Configuration service
│   │   │   │   ├── processControlService.ts  # Stop/pause control
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                  # Central export
│   │   │
│   │   ├── routes/                   # API route definitions
│   │   │   ├── index.ts                  # Route aggregator
│   │   │   ├── admin.ts                  # /api/admin/*
│   │   │   ├── todo.ts                   # /api/todo/*
│   │   │   ├── shopping.ts               # /api/shopping/*
│   │   │   ├── settings.ts               # /api/settings/*
│   │   │   ├── agent.ts                  # /api/agent/*
│   │   │   ├── auth.ts                   # /api/auth/*
│   │   │   ├── jobs.ts                   # /api/jobs/*
│   │   │   ├── travel.ts                 # /api/travel/*
│   │   │   ├── learning.ts               # /api/learning/*
│   │   │   └── problemSolving.ts         # /api/problems/*
│   │   │
│   │   ├── data/                     # Static data & mappings
│   │   ├── types/                    # TypeScript definitions
│   │   ├── utils/                    # Utility functions
│   │   ├── config/                   # Configuration
│   │   └── index.ts                  # Entry point
│   │
│   ├── credentials/                  # OAuth tokens (gitignored)
│   └── data/                         # Local data storage
│
├── frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── common/                   # Reusable UI components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── NavTabs.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Toast.tsx
│   │   │   │
│   │   │   ├── HomePage.tsx              # Home page
│   │   │   ├── GmailAgent.tsx            # Email processing UI
│   │   │   ├── ToDoAgent.tsx             # ToDo agent UI
│   │   │   ├── ShoppingAgent.tsx         # Shopping agent UI
│   │   │   ├── LearningAgent.tsx         # Learning content UI
│   │   │   ├── ProblemSolvingAgent.tsx   # Coding problems UI
│   │   │   ├── AdminPanel.tsx            # Admin dashboard
│   │   │   ├── SettingsPage.tsx          # User settings
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAuth.ts                # Authentication state
│   │   │   ├── useTodo.ts                # ToDo agent logic
│   │   │   ├── useShopping.ts            # Shopping agent logic
│   │   │   ├── useAdmin.ts               # Admin panel logic
│   │   │   ├── useSettings.ts            # Settings logic
│   │   │   └── ...
│   │   │
│   │   ├── services/                 # API client functions
│   │   │   ├── authApi.ts                # Auth API calls
│   │   │   ├── adminApi.ts               # Admin API calls
│   │   │   ├── todoApi.ts                # ToDo API calls
│   │   │   ├── shoppingApi.ts            # Shopping API calls
│   │   │   ├── api.ts                    # Agent API calls
│   │   │   └── travelApi.ts              # Travel API calls
│   │   │
│   │   ├── styles/                   # CSS modules
│   │   │   ├── todo.module.css
│   │   │   ├── shopping.module.css
│   │   │   ├── admin.module.css
│   │   │   └── ...
│   │   │
│   │   ├── utils/                    # Utilities
│   │   ├── types/                    # TypeScript definitions
│   │   └── App.tsx                   # Main application with routing
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
| GET | `/status` | Get Google auth status |
| GET | `/google` | Initiate Google OAuth flow |
| GET | `/google/callback` | OAuth callback handler |
| POST | `/google/disconnect` | Disconnect Google account |
| POST | `/google/reauth` | Force re-authentication (for new scopes) |

### ToDo Agent (`/api/todo/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks` | Create a new task |
| GET | `/tasks` | Get all tasks |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |
| POST | `/tasks/:id/complete` | Mark task as complete |
| POST | `/tasks/:id/uncomplete` | Mark task as incomplete |
| GET | `/agenda` | Get daily agenda |
| POST | `/calendar/sync` | Sync tasks to Google Calendar |
| GET | `/routines` | Get suggested routines |
| POST | `/routines/:id/approve` | Approve a suggested routine |
| POST | `/patterns/learn` | Learn patterns from task history |

### Shopping Agent (`/api/shopping/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search for products |
| GET | `/saved` | Get saved products |
| POST | `/save` | Save a product |
| DELETE | `/saved/:id` | Remove saved product |
| POST | `/alerts` | Create price alert |
| GET | `/interests` | Get user interests |
| PUT | `/interests` | Update user interests |

### Admin (`/api/admin/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/initialize` | Initialize admin (first-time setup) |
| GET | `/me` | Get current user info |
| GET | `/users` | List all users |
| PUT | `/users/:id` | Update user (role, status) |
| GET | `/settings` | Get system settings |
| PUT | `/settings` | Update system settings |
| GET | `/audit-logs` | Get audit logs |
| GET | `/stats` | Get platform statistics |

### Settings (`/api/settings/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/preferences` | Get user preferences |
| PUT | `/preferences` | Update preferences |
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update profile |

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

- [x] PostgreSQL database with Prisma ORM
- [x] Google Calendar integration
- [x] Admin platform with RBAC
- [x] ToDo agent with task management
- [x] Shopping agent with deal finder
- [ ] Redis caching for job/travel results
- [ ] Docker containerization
- [ ] Kubernetes deployment config
- [ ] WhatsApp notification integration
- [ ] Mobile app (React Native)
- [ ] More problem sources (GeeksforGeeks, InterviewBit)
- [ ] AI-powered routine suggestions (advanced ML)
- [ ] Multi-user collaboration features
