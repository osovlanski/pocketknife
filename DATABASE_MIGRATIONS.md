# 🗄️ Database Migrations

This document describes all database migrations for the Pocketknife platform and how to apply them.

## Prerequisites

- PostgreSQL database running and accessible
- `DATABASE_URL` configured in `backend/.env`
- Node.js 18+ installed

## Running Migrations

### Development

```bash
cd backend
npx prisma migrate dev
```

This will:
1. Create all missing migrations
2. Apply pending migrations
3. Regenerate Prisma Client

### Production

```bash
cd backend
npx prisma migrate deploy
```

This applies all pending migrations without creating new ones.

---

## Migration History

### Initial Setup (20260104121014_add_todo_shopping_agents)

**Date:** January 4, 2026

**Changes:**
- Added `Task` model for ToDo agent task management
- Added `RoutinePattern` model for AI-learned routine patterns
- Added `CalendarSync` model for Google Calendar integration
- Added `ProductSearch` model for shopping searches
- Added `Product` model for tracked products
- Added `UserInterest` model for hobby-based suggestions
- Added `PriceAlert` model for price drop notifications

### Admin Platform (20260104151138_add_admin_platform)

**Date:** January 4, 2026

**Changes:**
- Added `UserRole` enum (USER, ADMIN, SUPER_ADMIN)
- Added `UserStatus` enum (ACTIVE, INACTIVE, SUSPENDED, PENDING)
- Added admin fields to `User` model (role, status, verification)
- Added `AdminAuditLog` model for tracking admin actions
- Added `SystemSetting` model for platform configuration
- Added `ApiKey` model for API key management
- Added `FeatureFlag` model for feature toggles

### Email Sender Pattern Learning (20260106_add_email_sender_patterns) ⚠️ PENDING

**Date:** January 6, 2026

**Description:** Adds intelligent email sender pattern learning for auto-tagging recurring emails (e.g., daily OpenAI newsletters, GitHub notifications).

**Changes:**
- Added `EmailSenderPattern` model with fields:
  - `senderEmail` - Exact sender email address
  - `senderDomain` - Domain pattern (e.g., "openai.com")
  - `senderName` - Display name pattern
  - `subjectPattern` - Subject line pattern matching
  - `category` - Learned classification category
  - `customTag` - User-friendly tag (e.g., "OpenAI Updates")
  - `occurrenceCount` - Number of times pattern was seen
  - `confidence` - Classification confidence score (0-1)
  - `isUserApproved` - Whether user confirmed the pattern
  - `isAutoLearned` - Whether system learned it automatically

**To Apply:**
```bash
cd backend
npx prisma migrate dev --name add_email_sender_patterns
```

---

## Schema Overview

### Core Models

| Model | Purpose | Agent |
|-------|---------|-------|
| `User` | User accounts with roles | All |
| `UserPreferences` | User settings and preferences | All |
| `ActivityLog` | Activity tracking | All |
| `AppConfig` | Application configuration | All |

### Email Agent Models

| Model | Purpose |
|-------|---------|
| `EmailStats` | Email processing statistics |
| `EmailSenderPattern` | Learned sender patterns for auto-tagging |

### ToDo Agent Models

| Model | Purpose |
|-------|---------|
| `Task` | User tasks with priorities, due dates, recurrence |
| `RoutinePattern` | AI-learned routine patterns |
| `CalendarSync` | Google Calendar sync settings |

### Shopping Agent Models

| Model | Purpose |
|-------|---------|
| `ProductSearch` | Search history |
| `Product` | Tracked products with deal scores |
| `UserInterest` | User hobbies and interests |
| `PriceAlert` | Price drop notifications |

### Problem Solving Agent Models

| Model | Purpose |
|-------|---------|
| `SolvedProblem` | User's solved coding problems |

### Travel Agent Models

| Model | Purpose |
|-------|---------|
| `TripPlan` | Saved trip plans |

### Job Agent Models

| Model | Purpose |
|-------|---------|
| `JobSearch` | Job search history |
| `SavedJob` | Saved/applied jobs |

### Admin Models

| Model | Purpose |
|-------|---------|
| `AdminAuditLog` | Admin action audit trail |
| `SystemSetting` | Platform-wide settings |
| `ApiKey` | API key management |
| `FeatureFlag` | Feature toggles |

---

## Troubleshooting

### "Migration has already been applied"

This is normal - it means the migration was already run. No action needed.

### "Drift detected"

Your database schema doesn't match the migration history. Run:
```bash
npx prisma migrate reset  # WARNING: This deletes all data!
```

Or manually resolve with:
```bash
npx prisma db push --accept-data-loss  # Force schema sync
```

### "Database connection failed"

Check your `DATABASE_URL` in `backend/.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pocketknife"
```

### "Permission denied"

Ensure your PostgreSQL user has CREATE/ALTER permissions on the database.

---

## Creating New Migrations

When adding new models or modifying existing ones:

1. Edit `backend/prisma/schema.prisma`
2. Run:
   ```bash
   cd backend
   npx prisma migrate dev --name descriptive_name
   ```
3. Document the migration in this file
4. Commit both the migration files and this documentation

---

## Viewing Current Schema

```bash
# Open Prisma Studio (visual database browser)
cd backend
npx prisma studio
```

This opens a web UI at http://localhost:5555 to browse your database.

