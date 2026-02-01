# Pocketknife Improvements Analysis

## Overview

This document provides a comprehensive analysis of the Pocketknife project, identifying issues, suggesting improvements, and recommending additional integrations.

---

## 1. Rami Levy MCP Token Validation Issue

### Problem Description

Users repeatedly receive "invalid token" errors when using the Rami Levy MCP integration. After analyzing the `ramiLevyService.ts` code and the [official MCP documentation](https://mcpservers.org/servers/shilomagen/rami-levy-mcp), several issues were identified.

### Root Causes Identified

#### Issue 1: Base64URL vs Standard Base64 Decoding

**Location**: `backend/src/services/cooking/ramiLevyService.ts:124`

```typescript
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
```

The JWT parsing uses `base64url` encoding, but some JWT implementations (including Rami Levy's) may use standard base64 with `+`, `/`, and `=` characters. When the token uses standard base64, the parsing silently fails and returns `null` for expiration.

**Fix**: Use a more robust JWT parsing that handles both formats.

#### Issue 2: Cookie String Corruption

When users copy cookies from browser DevTools, special characters can get corrupted (especially Hebrew characters, semicolons, and equals signs). The current validation doesn't detect these corruptions.

#### Issue 3: EcomToken Header Case Sensitivity

**Location**: `backend/src/services/cooking/ramiLevyService.ts:315`

```typescript
headers['ecomtoken'] = cleanedEcomToken;
```

The header is lowercase `ecomtoken`, but according to the MCP documentation, the original header from the browser is `EcomToken`. While HTTP headers are technically case-insensitive, Rami Levy's server might be case-sensitive.

#### Issue 4: Token Cleaning Logic

**Location**: `backend/src/services/cooking/ramiLevyService.ts:281-283`

```typescript
const cleanToken = (token: string): string => {
  return token ? token.replace(/[^A-Za-z0-9\-_\.]+$/, '') : token;
};
```

This regex only cleans trailing characters but doesn't handle:
- Leading/trailing whitespace
- Hidden Unicode characters (zero-width spaces)
- Newlines from multi-line copy/paste

#### Issue 5: Token Expiration Check Timing

The JWT expiration is only checked on the `ecomToken`, but if the `apiKey` is also a JWT (which it often is), it should be checked too.

### Recommended Fix

See the implementation below in the "Fixes Applied" section.

---

## 2. MCP Integrations - Recommendations

### MCPs to Add

| MCP | Purpose | Priority | Complexity |
|-----|---------|----------|------------|
| **Weather MCP** | Travel agent enhancements, outdoor activity planning | High | Low |
| **Google Maps MCP** | Route planning, distance calculations for travel | High | Medium |
| **Todoist MCP** | Sync with popular task management app | Medium | Low |
| **Notion MCP** | Knowledge base integration (already mentioned in code) | Medium | Medium |
| **Spotify MCP** | Cooking music, focus playlists | Low | Low |
| **WhatsApp Business MCP** | Notifications (listed in future enhancements) | Medium | High |
| **Shufersal MCP** | Additional Israeli grocery store (like Rami Levy) | Medium | High |

### MCP Implementation Resources

1. **Model Context Protocol Spec**: https://modelcontextprotocol.io/
2. **MCP Server Registry**: https://mcpservers.org/
3. **Claude Desktop Config**: Update `~/.claude/claude_desktop_config.json`

---

## 3. API Integrations - Recommendations

### APIs to Add

| API | Agent | Purpose | Priority |
|-----|-------|---------|----------|
| **Perplexity API** | Assistant | Real-time web search with citations | High |
| **Clearbit/Apollo.io** | Jobs | Company enrichment with verified data | High |
| **OpenWeather API** | Travel | Weather forecasts for trip planning | Medium |
| **Mapbox API** | Travel | Route visualization, travel times | Medium |
| **Twilio/WhatsApp** | Notifications | Multi-channel notifications | Medium |
| **Spotify Web API** | Cooking/Focus | Music recommendations | Low |
| **Nutritionix API** | Cooking | Better nutritional data | Low |

### APIs to Consider Removing/Consolidating

| Current State | Recommendation |
|--------------|----------------|
| **Multiple Job Sources** (RemoteOK, Remotive, JSearch, Arbeitnow) | Keep JSearch + RemoteOK, remove others for simplicity |
| **Google Custom Search** (100 queries/day limit) | Replace with SerpAPI or Perplexity for unlimited searches |
| **Spoonacular API** | Keep, but add fallback to AI-generated recipes |

### Google Custom Search Quota Solution

The current 100 queries/day limit is very restrictive. Options:

1. **SerpAPI** (~$50/month for 5000 searches)
2. **Perplexity API** (pay-per-use, includes citations)
3. **Brave Search API** (generous free tier)
4. **Self-hosted Searx** (free, unlimited)

---

## 4. AI Chat / Agent Orchestrator Analysis

### Current Architecture

```
User Message → AssistantAgent → AssistantService
                                    ↓
                            Intent Analysis (Claude)
                                    ↓
                        ┌──────────┬──────────┬──────────┐
                        ↓          ↓          ↓          ↓
                   Web Search   Agent Data  AI Knowledge Synthesis
                        ↓          ↓          ↓          ↓
                        └──────────┴──────────┴──────────┘
                                    ↓
                        AgentOrchestrator (routes to agents)
                                    ↓
                        Claude generates response
```

### Gaps Identified

#### Backend Gaps

| Gap | Description | Impact | Priority |
|-----|-------------|--------|----------|
| **Sequential Execution** | Steps run one-by-one even when independent | Slow responses | High |
| **No Native Tool Calling** | Doesn't use Claude's `tool_use` capability | Less accurate intent | High |
| **No Memory Persistence** | Conversations don't persist across sessions | Poor continuity | Medium |
| **No Streaming** | Full response waits until complete | Poor UX | High |
| **Limited Error Recovery** | One step failure = workflow failure | Poor reliability | Medium |
| **No Human-in-the-Loop** | Can't pause for user approval on actions | Safety concern | Medium |
| **No Plan Preview** | User can't see/approve plan before execution | Trust issue | Medium |

#### Frontend Gaps

| Gap | Description | Priority |
|-----|-------------|----------|
| **No Response Streaming** | Entire response appears at once | High |
| **No Plan Preview** | Can't see what will happen before it happens | High |
| **No Token Counter** | Users don't know context window usage | Medium |
| **No Image Upload** | Can't send images to Claude (despite Claude support) | Medium |
| **Limited Error Details** | Generic error messages | Low |

### Recommended Improvements

#### 1. Implement Claude Tool Use (High Priority)

Replace the current intent-parsing-then-execute pattern with Claude's native tool calling:

```typescript
// Current (suboptimal)
const intent = await interpretMessage(message);
const plan = await planWorkflow(intent);
const result = await executeWorkflow(plan);

// Recommended (using Claude tool_use)
const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  tools: agentTools,  // Define tools for each agent action
  messages: [...conversationHistory, { role: 'user', content: message }]
});
// Claude will call tools directly
```

#### 2. Add Response Streaming (High Priority)

Use Claude's streaming API:

```typescript
// Backend
const stream = await claude.messages.stream({...});
for await (const event of stream) {
  socket.emit('assistant:token', event);
}

// Frontend
socket.on('assistant:token', (token) => {
  setMessage(prev => prev + token);
});
```

#### 3. Add Parallel Agent Execution (High Priority)

```typescript
// Current (sequential)
for (const step of steps) {
  await executeStep(step);
}

// Recommended (parallel for independent steps)
const independentSteps = getIndependentSteps(steps);
await Promise.all(independentSteps.map(step => executeStep(step)));
```

#### 4. Add Plan Preview Mode (Medium Priority)

Before executing, show the user what will happen:

```typescript
interface PlanPreview {
  steps: WorkflowStep[];
  estimatedDuration: number;
  potentialRisks: string[];
  requiresApproval: boolean;
}
```

#### 5. Add Conversation Memory (Medium Priority)

Store conversation summaries for long-term context:

```prisma
model ConversationMemory {
  id        String   @id @default(uuid())
  userId    String
  summary   String   // AI-generated summary
  entities  Json     // Extracted entities (names, dates, preferences)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 5. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

1. ✅ Fix Rami Levy token validation issues
2. Add response streaming to Assistant
3. Implement Claude native tool calling

### Phase 2: UX Improvements (Week 2-3)

4. Add plan preview/approval workflow
5. Improve error handling and visualization
6. Add token counter and context management
7. Add image upload support

### Phase 3: Integrations (Week 4+)

8. Add Perplexity/SerpAPI for better web search
9. Add Weather MCP for travel
10. Improve company enrichment in Jobs agent
11. Add WhatsApp notifications

---

## 6. Code Quality Observations

### Strengths

- Clean separation of concerns (agents, services, controllers)
- Good TypeScript usage with proper types
- Comprehensive error logging
- Circuit breaker pattern for external APIs
- Retry logic with exponential backoff

### Areas for Improvement

- Some files are very long (e.g., `ramiLevyService.ts` at 1238 lines)
- Test coverage could be improved
- Some hardcoded values that should be configurable
- Consider splitting large services into smaller modules

---

## Summary

The Pocketknife project is well-architected but has specific issues:

1. **Rami Levy**: Token parsing and validation issues need fixing
2. **AI Chat**: Missing streaming, parallel execution, and native tool calling
3. **Integrations**: Could benefit from Weather, better search APIs, and WhatsApp
4. **Frontend**: Needs streaming support and better error visualization

The fixes and improvements outlined above would significantly enhance the platform's reliability and user experience.
