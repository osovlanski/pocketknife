# Tech Lead Code Review - Pocketknife

**Date:** 2026-02-02
**Reviewer:** Principal Tech Lead / AI Assistant
**Branch:** `review/tech-lead-audit-2026-02-02`
**Focus:** Architecture, AI Agent Infrastructure, Best Practices, Scalability, Security

---

## Executive Summary

Pocketknife is a well-architected multi-agent AI platform with strong foundational patterns. However, several areas require attention to meet production-grade standards. This review identifies **23 weak points** categorized by severity.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Needs immediate attention |
| High | 7 | Should address before scaling |
| Medium | 8 | Technical debt to track |
| Low | 5 | Nice-to-have improvements |

---

## Critical Issues

### 1. Extremely Low Test Coverage Thresholds

**Location:** `backend/vitest.config.ts:31-36`

```typescript
thresholds: {
  statements: 1,   // CRITICAL: Only 1% required
  branches: 15,
  functions: 5,    // CRITICAL: Only 5% required
  lines: 1         // CRITICAL: Only 1% required
}
```

**Problem:** These thresholds provide no meaningful protection against regressions. The codebase could lose 99% of test coverage without CI failing.

**Recommendation:**
- Immediate: Raise to `statements: 30, branches: 25, functions: 30, lines: 30`
- Target: `statements: 70, branches: 60, functions: 70, lines: 70` within 3 months
- Add coverage gates to PR process

**Effort:** 2-4 weeks to write missing tests

---

### 2. Excessive `any` Type Usage (248 instances)

**Location:** 30+ files across backend

**Files with highest `any` usage:**
- `problemSolvingService.ts` - 95 instances
- `googleAuthService.ts` - 17 instances
- `leetcodeService.ts` - 15 instances
- `learningService.ts` - 19 instances
- `gmailService.ts` - 9 instances

**Problem:** Violates the "Zero `any` usage" standard in CLAUDE.md. Each `any` is a potential runtime bug waiting to happen.

**Recommendation:**
1. Enable `noImplicitAny: true` in tsconfig.json
2. Create proper types for all external API responses
3. Use `unknown` with type guards instead of `any`
4. Add eslint rule: `@typescript-eslint/no-explicit-any: error`

**Effort:** 3-5 days focused refactoring

---

### 3. CSP Allows Unsafe Inline Scripts

**Location:** `backend/src/middleware/securityMiddleware.ts:20`

```typescript
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // SECURITY RISK
```

**Problem:** `'unsafe-inline'` and `'unsafe-eval'` defeat the purpose of CSP and expose the application to XSS attacks.

**Recommendation:**
1. Remove `'unsafe-inline'` and `'unsafe-eval'`
2. Use nonce-based CSP for legitimate inline scripts
3. Refactor frontend to load scripts from files
4. Add `'strict-dynamic'` if needed for trusted scripts

**Effort:** 2-3 days

---

## High Priority Issues

### 4. Missing Agent-Level Input Validation

**Location:** `backend/src/agents/AbstractAgent.ts:192-210`

**Problem:** Validation schemas are optional and not enforced:
```typescript
protected validationSchemas: Record<string, z.ZodSchema> = {};
// ...
if (!schema) {
  // No schema registered, pass through  <-- WEAK POINT
  return { valid: true, data: params as T };
}
```

**Recommendation:** Make validation mandatory for all agent actions. Add compile-time enforcement.

---

### 5. Conversation Memory Uses Cache Only

**Location:** `backend/src/agents/AssistantAgent.ts:181-204`

```typescript
const cached = await cacheService.get<ChatMessage[]>(
  conversationCacheKey(userId, conversationId)
);
// No database fallback - conversations are lost when cache expires
```

**Problem:** Conversation history is lost after cache TTL expires (default 1 hour). Users lose context mid-conversation.

**Recommendation:**
- Persist conversations to `ConversationMemory` or `AssistantConversation` tables
- Use cache as fast-path, database as source of truth
- Implement conversation archival for long-term memory

---

### 6. Circuit Breaker Per-Agent, Not Per-Service

**Location:** `backend/src/agents/AbstractAgent.ts:100-101`

```typescript
private circuitBreaker: CircuitBreaker;
// One circuit breaker per agent instance
```

**Problem:** If the LeetCode API goes down, it should trip circuit breakers for ALL agents calling LeetCode, not just one instance.

**Recommendation:**
- Create a shared `CircuitBreakerRegistry` service
- Key circuit breakers by external service (e.g., `leetcode`, `amadeus`, `google-cse`)
- Share state across all agent instances

---

### 7. Large Files Violate Single Responsibility

| File | Lines | Recommendation |
|------|-------|----------------|
| `ramiLevyService.ts` | 1710 | Split into: `ramiLevyAuthService`, `ramiLevyCartService`, `ramiLevySearchService` |
| `adminController.ts` | ~58KB | Split into: `userAdminController`, `configAdminController`, `auditAdminController` |
| `configService.ts` | ~25KB | Split config into domain-specific files |

---

### 8. Missing Rate Limiting on Public Endpoints

**Problem:** No rate limiting visible on `/api/auth/*` endpoints, which are common targets for abuse.

**Recommendation:** Add rate limiting middleware to sensitive endpoints:
- `/api/auth/google` - 5 requests/minute per IP
- `/api/auth/callback` - 10 requests/minute per IP
- `/api/admin/*` - 20 requests/minute per user

---

### 9. No Health Check Endpoints

**Problem:** No `/health` or `/ready` endpoints for Kubernetes/load balancer probes.

**Recommendation:** Add:
```typescript
GET /health - Returns 200 if server is running
GET /ready - Returns 200 if database and cache are connected
GET /metrics - Prometheus-compatible metrics endpoint
```

---

### 10. Hardcoded Data Still Pending Migration

**Location:** `HARDCODED_DATA_AUDIT.md`

Still hardcoded (Medium Priority items):
- Telegram Channels (5 channels)
- Community Sources (15+ sources)
- YouTube Tech Channels (9 channels)
- Google Search Site Configs (50+ sites)
- Israeli Shops (10+ stores)

**Impact:** Cannot update these without code deployment.

---

## Medium Priority Issues

### 11. No Structured Request Context Propagation

**Problem:** Request IDs are generated but not consistently passed through service layers.

**Recommendation:** Implement AsyncLocalStorage for request context:
```typescript
const requestContext = new AsyncLocalStorage<RequestContext>();
// Pass requestId, userId, traceId through all service calls
```

---

### 12. Missing Database Retry Logic

**Problem:** Prisma operations don't have retry logic for transient failures.

**Recommendation:** Wrap database calls with retry for specific errors:
- Connection pool exhaustion
- Temporary network issues
- Lock timeouts

---

### 13. Inconsistent Error Handling in Services

**Problem:** Some services return `{ success: false, error: string }`, others throw exceptions, some return `null`.

**Recommendation:** Standardize on Result pattern or consistently throw typed errors.

---

### 14. Frontend Bundle Size Risk

**Problem:** Heavy dependencies may cause slow initial load:
- Monaco Editor (~2MB)
- Excalidraw (~1MB)
- PDF.js (~500KB)

**Recommendation:**
- Implement code splitting with lazy loading
- Measure bundle size in CI
- Set bundle size budgets

---

### 15. Missing API Versioning

**Problem:** All routes are unversioned (`/api/jobs/*` vs `/api/v1/jobs/*`).

**Recommendation:** Add version prefix to enable future breaking changes:
```
/api/v1/jobs/*
/api/v1/travel/*
```

---

### 16. Socket.io Has No Authentication

**Location:** Uses Socket.io without visible authentication middleware.

**Recommendation:** Add JWT verification to socket connections:
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT before allowing connection
});
```

---

### 17. Magic Numbers in Agent Configuration

**Location:** Various agent files

```typescript
const maxHistory = configService.get('assistant.conversation.maxHistory', 20); // Why 20?
const rateLimitRefillMs = 60000; // Why 60 seconds?
```

**Recommendation:** Document the reasoning behind default values or move to named constants with comments.

---

### 18. Missing Database Indexes

**Problem:** Query patterns suggest missing indexes:
- `ActivityLog.userId + createdAt` for user history queries
- `Task.userId + status + dueDate` for agenda queries
- `SavedJob.userId + matchScore` for sorted listings

**Recommendation:** Run `EXPLAIN ANALYZE` on common queries and add appropriate indexes.

---

## Low Priority Issues

### 19. Inconsistent Naming Conventions

- `AgentId` vs `agentId` vs `agent_id` across different files
- `UserId` vs `userId` vs `user_id`
- Some services use camelCase, some use snake_case in database fields

---

### 20. Missing JSDoc on Public Methods

Many public methods lack documentation, making it harder for new developers to understand the codebase.

---

### 21. No Retry on Cache Operations

Cache failures are logged but not retried. For Redis connections that fail transiently, a single retry could help.

---

### 22. Test Files Lack Organization

Tests are organized by file type (`agents/`, `services/`, `controllers/`) rather than by feature domain.

**Recommendation:** Consider reorganizing:
```
tests/
  features/
    shopping/
    jobs/
    travel/
  integration/
  e2e/
```

---

### 23. Missing OpenAPI/Swagger Documentation

**Problem:** No auto-generated API documentation for frontend developers or external integrations.

**Recommendation:** Add `@nestjs/swagger` equivalent for Express or use `tsoa` for TypeScript-first OpenAPI generation.

---

## Positive Observations

The codebase has many strong points:

1. **Excellent Base Agent Architecture** - `AbstractAgent` with rate limiting, circuit breaker, retry logic
2. **Comprehensive Dynamic Configuration** - Three-tier config system (ConfigService, Rule Engine, Feature Flags)
3. **Good Error Type Hierarchy** - `AppError` with proper subclasses
4. **Strong Documentation** - ARCHITECTURE.md, HARDCODED_DATA_AUDIT.md, migration guides
5. **Real-time Communication** - Socket.io properly integrated
6. **Production Resilience Patterns** - Exponential backoff, jitter, timeout handling
7. **Security Headers** - Comprehensive Helmet configuration (except CSP issues)
8. **Activity Logging** - Audit trail for user actions

---

## Scheduling Automated Reviews with Claude

**Question:** Is there a way to schedule this task to run every 24 hours automatically from Claude?

**Answer:** Claude Code itself doesn't have built-in scheduling, but you can achieve this with:

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/code-review.yml`:

```yaml
name: Daily Code Review

on:
  schedule:
    - cron: '0 6 * * *'  # Run at 6 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Claude Code Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @anthropic-ai/claude-code
          claude-code --prompt "Review the codebase as a strict principal tech lead. Focus on: architecture, AI agent code, security, scalability. Create a detailed report in DAILY_REVIEW.md" --output-file DAILY_REVIEW.md

      - name: Create Issue from Review
        uses: peter-evans/create-issue-from-file@v4
        with:
          title: "Daily Tech Lead Review - $(date +%Y-%m-%d)"
          content-filepath: DAILY_REVIEW.md
          labels: tech-debt, review
```

### Option 2: Cron Job on Server

```bash
# Add to crontab: crontab -e
0 6 * * * cd /path/to/pocketknife && claude-code --prompt "Daily tech lead review" >> /var/log/claude-reviews.log 2>&1
```

### Option 3: Use Claude Code Hooks

If you have persistent access, create a hook in `.claude/hooks/daily-review.sh`:

```bash
#!/bin/bash
# Triggered by your task scheduler
claude-code "Review codebase as tech lead, output to DAILY_REVIEW.md"
git add DAILY_REVIEW.md && git commit -m "chore: daily tech lead review"
```

---

## Recommended Action Plan

### Week 1: Critical Issues
- [ ] Raise test coverage thresholds
- [ ] Fix CSP security headers
- [ ] Start `any` type elimination (top 5 files)

### Week 2-3: High Priority
- [ ] Implement shared circuit breaker registry
- [ ] Add database persistence for conversations
- [ ] Add health check endpoints
- [ ] Add rate limiting to auth endpoints

### Week 4+: Medium Priority
- [ ] Split large files
- [ ] Add API versioning
- [ ] Socket.io authentication
- [ ] Complete hardcoded data migration

---

## Files Changed in This Review

This review branch contains only this documentation file. No code changes were made to allow for proper discussion before implementation.

---

**Next Steps:**
1. Review this document with the team
2. Prioritize items based on current roadmap
3. Create Jira/GitHub issues for each item
4. Schedule fixes in upcoming sprints
