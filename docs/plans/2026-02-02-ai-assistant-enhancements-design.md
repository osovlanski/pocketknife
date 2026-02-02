# AI Assistant Enhancements Design

**Date**: 2026-02-02
**Author**: Itay Osov + Claude
**Status**: Approved
**Branch**: `feature/ai-assistant-enhancements`

---

## Overview

This design document covers four interconnected features to enhance the pocketknife AI assistant:

1. **Enterprise-Grade CLAUDE.md** - Strict engineering governance
2. **Response Modes** - Instant/Standard/Deep Think speed tiers
3. **Inline Agent Results** - Expandable cards in chat
4. **Automated Quality Evaluation** - Daily learning and improvement system

---

## Feature 1: Enterprise-Grade CLAUDE.md

### Purpose

Establish strict engineering standards for experienced developers working on the pocketknife codebase. Zero tolerance for shortcuts, mandatory TDD, and formal review gates.

### CLAUDE.md Structure

```markdown
# Pocketknife - Enterprise Engineering Standards

## Architecture & Purpose
- Multi-agent AI platform (8+ specialized agents)
- Tech stack: Node.js/Express, React, PostgreSQL, Redis, Claude AI
- Pattern: Service-oriented with AbstractAgent base class

## Critical Commands
- Build: `npm run build`
- Test: `npm run test` (coverage threshold: 70%)
- Lint: `npm run lint:fix`
- Verify: `npm run verify` (must pass before commit)
- DB Studio: `npm run db:studio`

## Engineering Standards

### Strict TDD (Non-Negotiable)
- Write failing test FIRST in `backend/tests/`
- Test file mirrors src structure
- No implementation without red-green-refactor cycle

### Zero `any` Policy
- Use Opaque Types for IDs: `type UserId = string & { readonly brand: unique symbol }`
- Use Zod schemas for runtime validation
- Use strict generics over `any`
- Document the 248 existing violations as tech debt

### Mandatory Code Review
- Self-critique before PR using fresh Claude context
- Run: "Review for security vulnerabilities, race conditions, architecture adherence"
- Document decisions in `docs/rfc/`

### Architecture Enforcement
- Domain logic: `backend/src/services/`
- Agents extend: `AbstractAgent` pattern
- External integrations: Use circuit breaker + retry from `utils/`
- No business logic in controllers

## Commit Standards
- Format: Conventional Commits
- Scope: Atomic (one logical change)
- AI-assisted: Include `Co-authored-by: Claude`

## Pre-PR Checklist
1. [ ] All tests pass (`npm run test`)
2. [ ] Coverage > 70%
3. [ ] No `any` added
4. [ ] Lint passes (`npm run lint:fix`)
5. [ ] Self-review completed
6. [ ] Architecture patterns followed
```

### Implementation

- Create `/CLAUDE.md` at repository root
- Remove conflicting guidance from other docs
- Update CI to enforce coverage thresholds

---

## Feature 2: AI Chat Response Modes

### Purpose

Provide users control over response speed/depth tradeoff. Match or exceed quality of simple prompts in other LLMs by leveraging appropriate model configurations.

### Mode Definitions

| Mode | Model | Max Tokens | Thinking | Use Case |
|------|-------|------------|----------|----------|
| **Instant** | `claude-3-5-haiku-latest` | 500 | Disabled | Quick facts, yes/no, simple lookups |
| **Standard** | `claude-sonnet-4-20250514` | 1,500 | Disabled | General questions, agent coordination |
| **Deep Think** | `claude-sonnet-4-20250514` | 4,000 | 10,000 budget | Complex analysis, planning, debugging |

### UI Design

```
┌─────────────────────────────────────────────────────┐
│  Pocketknife Assistant                    [⚡▾]    │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚡ Instant                                  │   │
│  │ 💬 Standard (default)                       │   │
│  │ 🧠 Deep Think                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Chat messages...                                   │
└─────────────────────────────────────────────────────┘
```

### Backend Changes

**File: `backend/src/utils/anthropicClient.ts`**

```typescript
export type ResponseMode = 'instant' | 'standard' | 'deep-think';

interface ModeConfig {
  model: string;
  maxTokens: number;
  thinking?: { type: 'enabled'; budgetTokens: number };
}

const MODE_CONFIGS: Record<ResponseMode, ModeConfig> = {
  'instant': {
    model: 'claude-3-5-haiku-latest',
    maxTokens: 500,
  },
  'standard': {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1500,
  },
  'deep-think': {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    thinking: { type: 'enabled', budgetTokens: 10000 },
  },
};

export function getModelConfigForMode(mode: ResponseMode): ModeConfig {
  return MODE_CONFIGS[mode];
}
```

**File: `backend/src/services/assistant/assistantService.ts`**

- Add `responseMode` parameter to `processMessage()`
- Apply mode config when calling Claude
- Store mode in conversation metadata

**File: `backend/src/services/assistant/conversationMemoryService.ts`**

- Add `defaultMode` field to conversation preferences
- Persist user's last selected mode

### Frontend Changes

**File: `frontend/src/components/AssistantAgent.tsx`**

- Add mode selector dropdown in header
- Display mode indicator on assistant messages
- Pass mode in API requests

**File: `frontend/src/services/assistantApi.ts`**

- Add `responseMode` to request payload

**File: `frontend/src/hooks/useAssistant.ts`**

- Track current mode in state
- Persist preference to localStorage

---

## Feature 3: Inline Agent Results

### Purpose

When the assistant invokes specialized agents, display results as expandable cards within the chat flow. Users stay in context without navigation.

### Card Design

```
┌─────────────────────────────────────────────────────┐
│ 🍝 Pasta Carbonara                        [Expand ▾]│
│ ⏱️ 25 min  |  👤 4 servings  |  ⭐ Easy            │
│                                                     │
│ [Save Recipe]  [Open in Cooking Agent →]           │
└─────────────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────────────┐
│ 🍝 Pasta Carbonara                      [Collapse ▴]│
│ ⏱️ 25 min  |  👤 4 servings  |  ⭐ Easy            │
├─────────────────────────────────────────────────────┤
│ Ingredients:                                        │
│ • 400g spaghetti                                   │
│ • 200g guanciale                                   │
│ • 4 egg yolks                                      │
│ • ...                                              │
├─────────────────────────────────────────────────────┤
│ Instructions:                                       │
│ 1. Boil pasta in salted water...                   │
│ 2. ...                                             │
├─────────────────────────────────────────────────────┤
│ [Save Recipe]  [Open in Cooking Agent →]           │
└─────────────────────────────────────────────────────┘
```

### Card Types by Agent

| Agent | Summary Fields | Expanded Fields |
|-------|----------------|-----------------|
| **Cooking** | Title, time, servings, difficulty | Ingredients, steps, nutrition, image |
| **Jobs** | Title, company, salary, location | Description, requirements, apply link |
| **Travel** | Route, price, dates | Full itinerary, booking options, alternatives |
| **Shopping** | Product, price, store | Price history, reviews, similar items |
| **Problems** | Title, difficulty, platform | Full problem, hints, tags, solution link |
| **ToDo** | Task title, due date, priority | Subtasks, notes, calendar link |
| **Email** | Subject, sender, snippet | Full body, attachments, actions |
| **Learning** | Resource title, type, source | Description, duration, link, related |

### Standardized Response Format

**Backend agent response structure:**

```typescript
interface AgentResultCard {
  agentType: 'cooking' | 'jobs' | 'travel' | 'shopping' | 'problems' | 'todo' | 'email' | 'learning';
  id: string;
  summary: {
    title: string;
    subtitle?: string;
    metadata: Array<{ icon: string; label: string; value: string }>;
    image?: string;
  };
  details: Record<string, unknown>; // Agent-specific expanded content
  actions: Array<{
    label: string;
    action: 'save' | 'open' | 'apply' | 'book' | 'custom';
    endpoint?: string;
    params?: Record<string, unknown>;
  }>;
}
```

### Implementation

**Backend:**
- Create `AgentResultFormatter` utility in `backend/src/utils/`
- Update each agent to return standardized card format
- Add `cards` array to assistant response

**Frontend:**
- Create `frontend/src/components/common/AgentResultCard.tsx`
- Create variant components per agent type
- Integrate into chat message renderer
- Handle action button clicks via existing APIs

---

## Feature 4: Automated Quality Evaluation System

### Purpose

Continuously test and improve AI chat quality through automated evaluation, synthetic test generation, and daily learning cycles.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUALITY EVALUATION SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Curated    │    │  Synthetic   │    │  Production  │      │
│  │  Benchmark   │    │  Generator   │    │   Sampling   │      │
│  │  (50-100 Q)  │    │  (20/day)    │    │    (10%)     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Chat Execution  │                          │
│                   │    Pipeline      │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │   Evaluation     │                          │
│                   │  (Claude Haiku)  │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │  Score Storage   │                          │
│                   │   (PostgreSQL)   │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │  Daily Report    │                          │
│                   │   & Learning     │                          │
│                   └──────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Evaluation Rubric

| Dimension | Weight | Criteria (0-5) |
|-----------|--------|----------------|
| **Accuracy** | 25% | Factually correct, no hallucinations |
| **Helpfulness** | 25% | Addresses user's actual need |
| **Completeness** | 15% | Sufficient detail, nothing critical missing |
| **Clarity** | 15% | Easy to understand, well-structured |
| **Safety** | 10% | No harmful content, appropriate boundaries |
| **Agent Usage** | 10% | Correctly identified and invoked relevant agents |

**Overall Score** = Weighted average (0.0 - 5.0)

### Database Schema

```prisma
// Add to backend/prisma/schema.prisma

model QualityBenchmark {
  id          String   @id @default(uuid())
  category    String   // 'general', 'cooking', 'jobs', 'travel', etc.
  question    String
  difficulty  Int      // 1-5
  expectedAgents String[] // Which agents should be invoked
  isCurated   Boolean  @default(false) // true = seed set, false = synthetic
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  evaluations BenchmarkEvaluation[]
}

model BenchmarkEvaluation {
  id            String   @id @default(uuid())
  benchmarkId   String
  benchmark     QualityBenchmark @relation(fields: [benchmarkId], references: [id])

  response      String   // The assistant's response
  responseMode  String   // instant, standard, deep-think

  // Scores (0-5)
  accuracy      Int
  helpfulness   Int
  completeness  Int
  clarity       Int
  safety        Int
  agentUsage    Int
  overallScore  Float    // Weighted average

  feedback      String?  // Claude's explanation
  createdAt     DateTime @default(now())
}

model ConversationEvaluation {
  id              String   @id @default(uuid())
  conversationId  String
  messageId       String
  userMessage     String
  assistantResponse String
  responseMode    String

  // Scores (0-5)
  accuracy        Int
  helpfulness     Int
  completeness    Int
  clarity         Int
  safety          Int
  agentUsage      Int?
  overallScore    Float

  feedback        String?
  createdAt       DateTime @default(now())
}

model QualityReport {
  id              String   @id @default(uuid())
  reportDate      DateTime @unique

  // Aggregate scores
  avgOverallScore Float
  avgAccuracy     Float
  avgHelpfulness  Float
  avgCompleteness Float
  avgClarity      Float
  avgSafety       Float
  avgAgentUsage   Float

  // Breakdown by category
  categoryScores  Json     // { cooking: 4.2, jobs: 3.8, ... }

  // Insights
  weakestAreas    String[]
  improvements    String[] // Suggested improvements

  totalEvaluations Int
  createdAt       DateTime @default(now())
}
```

### Curated Benchmark Questions

**File: `backend/src/data/benchmark-questions.json`**

```json
{
  "general": [
    { "question": "What is pocketknife?", "difficulty": 1, "expectedAgents": [] },
    { "question": "How can you help me?", "difficulty": 1, "expectedAgents": [] },
    { "question": "What's the weather like?", "difficulty": 2, "expectedAgents": [] }
  ],
  "cooking": [
    { "question": "Find me a quick pasta recipe", "difficulty": 1, "expectedAgents": ["cooking"] },
    { "question": "I have chicken and rice, what can I make?", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Suggest a healthy dinner under 500 calories", "difficulty": 3, "expectedAgents": ["cooking"] }
  ],
  "jobs": [
    { "question": "Find software engineer jobs in Tel Aviv", "difficulty": 1, "expectedAgents": ["jobs"] },
    { "question": "Search for remote React developer positions", "difficulty": 2, "expectedAgents": ["jobs"] }
  ],
  "travel": [
    { "question": "Find flights from TLV to NYC next month", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Plan a weekend trip to Rome", "difficulty": 3, "expectedAgents": ["travel"] }
  ],
  "shopping": [
    { "question": "Find deals on headphones", "difficulty": 1, "expectedAgents": ["shopping"] },
    { "question": "Compare prices for iPhone 15", "difficulty": 2, "expectedAgents": ["shopping"] }
  ],
  "problems": [
    { "question": "Give me a medium LeetCode problem about arrays", "difficulty": 2, "expectedAgents": ["problems"] },
    { "question": "Find a dynamic programming practice problem", "difficulty": 3, "expectedAgents": ["problems"] }
  ],
  "multi-agent": [
    { "question": "Plan a business trip to London and find meeting-appropriate restaurants", "difficulty": 4, "expectedAgents": ["travel", "cooking"] },
    { "question": "I'm job hunting and stressed, suggest some easy recipes and jobs", "difficulty": 4, "expectedAgents": ["jobs", "cooking"] }
  ]
}
```

### Synthetic Question Generator

**File: `backend/src/services/evaluation/syntheticGenerator.ts`**

```typescript
interface GenerationContext {
  weakCategories: string[];      // Focus on weak areas
  currentDifficulty: number;     // Increase if scores > 4.0
  recentQuestions: string[];     // Avoid duplicates
}

async function generateSyntheticQuestions(
  count: number,
  context: GenerationContext
): Promise<QualityBenchmark[]> {
  const prompt = `Generate ${count} diverse test questions for an AI assistant.

Categories to focus on (these scored lowest): ${context.weakCategories.join(', ')}

Target difficulty: ${context.currentDifficulty}/5

Agent capabilities:
- Cooking: Recipe search, ingredient-based suggestions, meal planning
- Jobs: Job search across platforms, salary info, company research
- Travel: Flight/hotel search, trip planning, itinerary creation
- Shopping: Deal finding, price comparison, product research
- Problems: Coding problems from LeetCode, Codeforces, etc.
- ToDo: Task management, calendar integration
- Email: Gmail processing, summarization
- Learning: Educational content aggregation

Avoid questions similar to: ${context.recentQuestions.slice(0, 10).join('; ')}

Return JSON array with: question, category, difficulty (1-5), expectedAgents[]`;

  // Call Claude Haiku for cost efficiency
  const response = await generateClaudeMessage(prompt, {
    model: 'claude-3-5-haiku-latest',
    maxTokens: 2000,
  });

  return parseGeneratedQuestions(response);
}
```

### Evaluation Service

**File: `backend/src/services/evaluation/evaluationService.ts`**

```typescript
const EVALUATION_PROMPT = `You are evaluating an AI assistant response. Score each dimension 0-5.

User Question: {question}
Assistant Response: {response}
Expected Agents: {expectedAgents}
Agents Actually Used: {actualAgents}

Score these dimensions (0=terrible, 5=excellent):
1. Accuracy: Is the response factually correct? Any hallucinations?
2. Helpfulness: Does it address what the user actually needs?
3. Completeness: Is there sufficient detail? Anything missing?
4. Clarity: Is it easy to understand and well-structured?
5. Safety: Is the content appropriate and harmless?
6. Agent Usage: Were the right agents invoked? (N/A if no agents expected)

Return JSON:
{
  "accuracy": <0-5>,
  "helpfulness": <0-5>,
  "completeness": <0-5>,
  "clarity": <0-5>,
  "safety": <0-5>,
  "agentUsage": <0-5 or null>,
  "feedback": "<brief explanation of scores>"
}`;

async function evaluateResponse(
  question: string,
  response: string,
  expectedAgents: string[],
  actualAgents: string[]
): Promise<EvaluationResult> {
  const prompt = EVALUATION_PROMPT
    .replace('{question}', question)
    .replace('{response}', response)
    .replace('{expectedAgents}', expectedAgents.join(', ') || 'none')
    .replace('{actualAgents}', actualAgents.join(', ') || 'none');

  const result = await generateClaudeMessage(prompt, {
    model: 'claude-3-5-haiku-latest',
    maxTokens: 500,
  });

  return parseEvaluationResult(result);
}
```

### Daily Workflow (GitHub Action)

**File: `.github/workflows/daily-quality-eval.yml`**

```yaml
name: Daily Quality Evaluation

on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:      # Manual trigger

jobs:
  evaluate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Generate Prisma client
        run: cd backend && npx prisma generate

      - name: Run evaluation pipeline
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: cd backend && npm run evaluate:daily

      - name: Generate report
        run: cd backend && npm run evaluate:report

      - name: Commit report
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/quality-reports/
          git diff --staged --quiet || git commit -m "chore: daily quality report $(date +%Y-%m-%d)"
          git push
```

### Daily Evaluation Script

**File: `backend/src/scripts/dailyEvaluation.ts`**

```typescript
async function runDailyEvaluation() {
  console.log('Starting daily quality evaluation...');

  // 1. Load curated benchmark
  const curatedQuestions = await loadCuratedBenchmark();
  console.log(`Loaded ${curatedQuestions.length} curated questions`);

  // 2. Get yesterday's weak areas
  const lastReport = await getLastQualityReport();
  const weakCategories = lastReport?.weakestAreas || [];
  const currentDifficulty = calculateDifficultyLevel(lastReport?.avgOverallScore);

  // 3. Generate synthetic questions
  const syntheticQuestions = await generateSyntheticQuestions(20, {
    weakCategories,
    currentDifficulty,
    recentQuestions: await getRecentQuestions(50),
  });
  console.log(`Generated ${syntheticQuestions.length} synthetic questions`);

  // 4. Run all questions through chat
  const allQuestions = [...curatedQuestions, ...syntheticQuestions];
  const results: EvaluationResult[] = [];

  for (const q of allQuestions) {
    console.log(`Evaluating: ${q.question.substring(0, 50)}...`);

    // Execute chat
    const chatResponse = await executeChat(q.question, 'standard');

    // Evaluate response
    const evaluation = await evaluateResponse(
      q.question,
      chatResponse.response,
      q.expectedAgents,
      chatResponse.agentsUsed
    );

    // Store result
    await storeBenchmarkEvaluation(q.id, evaluation);
    results.push(evaluation);

    // Rate limit: 1 request per second
    await sleep(1000);
  }

  // 5. Generate daily report
  const report = generateDailyReport(results);
  await storeQualityReport(report);

  // 6. Write markdown report
  await writeReportMarkdown(report);

  console.log('Daily evaluation complete!');
  console.log(`Overall score: ${report.avgOverallScore.toFixed(2)}/5.0`);
}
```

### Learning Progression

The system automatically increases difficulty when performance improves:

| Average Score | Difficulty Level | Focus |
|---------------|------------------|-------|
| < 2.5 | 1-2 (Easy) | Basic functionality, simple queries |
| 2.5 - 3.5 | 2-3 (Medium) | Standard use cases, single agents |
| 3.5 - 4.0 | 3-4 (Hard) | Complex queries, multi-agent coordination |
| > 4.0 | 4-5 (Expert) | Edge cases, ambiguous queries, stress tests |

---

## Implementation Order

### Phase 1: Foundation (CLAUDE.md + Database)
1. Create CLAUDE.md
2. Add Prisma schema for evaluation tables
3. Run migrations
4. Create benchmark-questions.json seed data

### Phase 2: Response Modes
1. Add mode configs to anthropicClient.ts
2. Update assistantService.ts
3. Add mode selector to frontend
4. Update API contracts

### Phase 3: Inline Agent Cards
1. Create AgentResultCard component
2. Standardize agent response format
3. Integrate into chat renderer
4. Add action handlers

### Phase 4: Evaluation System
1. Create evaluationService.ts
2. Create syntheticGenerator.ts
3. Create dailyEvaluation.ts script
4. Set up GitHub Action
5. Create report template

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response mode adoption | 30% use non-default modes | Analytics |
| Card interaction rate | 50% expand at least one card | Click tracking |
| Quality score baseline | Establish baseline in week 1 | Daily reports |
| Quality improvement | +0.5 score in 30 days | Trend analysis |
| Evaluation coverage | 100% benchmark, 10% production | Daily counts |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| API costs from evaluation | Use Haiku for eval, rate limit, sample production |
| Synthetic questions drift from real usage | Curated benchmark as stable baseline |
| Extended thinking latency | Clear UI indicator, optional mode |
| Card complexity | Progressive disclosure, collapsed by default |

---

## Appendix: File Changes Summary

### New Files
- `/CLAUDE.md`
- `backend/src/data/benchmark-questions.json`
- `backend/src/services/evaluation/evaluationService.ts`
- `backend/src/services/evaluation/syntheticGenerator.ts`
- `backend/src/scripts/dailyEvaluation.ts`
- `frontend/src/components/common/AgentResultCard.tsx`
- `.github/workflows/daily-quality-eval.yml`
- `docs/quality-reports/.gitkeep`

### Modified Files
- `backend/src/utils/anthropicClient.ts` - Add mode configs
- `backend/src/services/assistant/assistantService.ts` - Mode support, card format
- `backend/src/services/assistant/conversationMemoryService.ts` - Store mode preference
- `backend/prisma/schema.prisma` - Evaluation tables
- `frontend/src/components/AssistantAgent.tsx` - Mode selector, card renderer
- `frontend/src/services/assistantApi.ts` - Mode parameter
- `frontend/src/hooks/useAssistant.ts` - Mode state
- `backend/package.json` - Add evaluation scripts
