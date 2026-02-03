# AI Assistant Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement enterprise-grade CLAUDE.md, response modes (Instant/Standard/Deep Think), inline agent cards, and automated quality evaluation system.

**Architecture:** Four-phase approach building foundational governance first, then layering response modes, UI enhancements, and finally the evaluation pipeline. Each phase is independently testable.

**Tech Stack:** TypeScript, Prisma, React, Claude API (Haiku/Sonnet), GitHub Actions, Vitest

---

## Phase 1: Foundation (CLAUDE.md + Database)

### Task 1.1: Create Enterprise-Grade CLAUDE.md

**Files:**
- Create: `/CLAUDE.md`

**Step 1: Write the CLAUDE.md file**

```markdown
# Pocketknife - Enterprise Engineering Standards

## Architecture & Purpose

**Mission**: Multi-agent AI platform providing intelligent assistants for email, jobs, travel, learning, coding, shopping, cooking, and more.

**Tech Stack**: Node.js 20, Express, TypeScript, React, PostgreSQL, Redis, Prisma, Claude AI

**Pattern**: Service-oriented architecture with `AbstractAgent` base class providing rate limiting, circuit breaker, and retry logic.

## Critical Commands

| Command | Purpose |
|---------|---------|
| `cd backend && npm run build` | Compile TypeScript |
| `cd backend && npm run test` | Run test suite with coverage |
| `cd backend && npm run lint:fix` | Fix linting issues |
| `cd frontend && npm run build` | Build React frontend |
| `npm run verify` | Full verification (build + lint + test) |
| `cd backend && npm run db:studio` | Open Prisma Studio (localhost:5555) |

## Engineering Standards

### Strict TDD (Non-Negotiable)

Every code change MUST follow Red-Green-Refactor:

1. **Write failing test FIRST** in `backend/tests/` mirroring `src/` structure
2. **Run test to confirm failure** - never skip this step
3. **Write minimal code** to make test pass
4. **Refactor** only after green
5. **Commit** with conventional commit message

```bash
# Example TDD workflow
npm run test -- --watch backend/tests/services/evaluation/evaluationService.test.ts
```

### Zero `any` Policy

**NEVER** use `any` type. Alternatives:

```typescript
// BAD
const data: any = response.data;

// GOOD - Use strict types
interface ApiResponse<T> { data: T; status: number }
const data: ApiResponse<Recipe[]> = response.data;

// GOOD - Use Opaque Types for IDs
type UserId = string & { readonly __brand: 'UserId' };
type ConversationId = string & { readonly __brand: 'ConversationId' };

// GOOD - Use Zod for runtime validation
const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  ingredients: z.array(z.string())
});
type Recipe = z.infer<typeof RecipeSchema>;

// GOOD - Use unknown for truly unknown data
function processUnknown(data: unknown): void {
  if (typeof data === 'object' && data !== null) {
    // Type-safe handling
  }
}
```

**Technical Debt**: 248 existing `any` usages must be systematically eliminated.

### Mandatory Code Review

Before ANY pull request:

1. Run full test suite: `npm run test`
2. Verify coverage > 70%: `npm run test:coverage`
3. Run linting: `npm run lint`
4. Self-review with fresh context: `/clear` then ask Claude to review changes
5. Check for security issues: SQL injection, XSS, command injection

**Review prompt template:**
```
Review these changes for:
1. Security vulnerabilities (OWASP Top 10)
2. Race conditions and concurrency issues
3. Adherence to AbstractAgent pattern
4. Proper error handling with AppError hierarchy
5. Test coverage of edge cases
```

### Architecture Enforcement

| Layer | Location | Rules |
|-------|----------|-------|
| Domain Logic | `backend/src/services/` | Pure business logic, no HTTP/DB concerns |
| Agents | `backend/src/agents/` | Extend `AbstractAgent`, use circuit breaker |
| Controllers | `backend/src/controllers/` | Thin, delegate to services |
| External APIs | `backend/src/services/**/` | Must use retry + circuit breaker from `utils/` |
| Types | `backend/src/*/types.ts` | Strict typing, no `any` |

### Error Handling

Use the `AppError` hierarchy:

```typescript
import { AppError, ValidationError, NotFoundError, ExternalServiceError } from '../utils/errors';

// Validation errors
throw new ValidationError('Invalid email format', { field: 'email' });

// Not found
throw new NotFoundError('User', userId);

// External service failures
throw new ExternalServiceError('Claude API', error.message);
```

## Commit Standards

**Format**: [Conventional Commits](https://www.conventionalcommits.org)

```bash
# Features
feat(assistant): add response mode selector

# Bug fixes
fix(cooking): handle empty recipe list gracefully

# Refactoring
refactor(jobs): extract job matching logic to separate service

# Tests
test(evaluation): add benchmark question tests

# Documentation
docs(api): update assistant endpoint documentation
```

**Rules**:
- Atomic commits (one logical change)
- Co-author AI assistance: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Never commit secrets or credentials
- Run verification before commit

## Pre-PR Checklist

```markdown
- [ ] All tests pass (`npm run test`)
- [ ] Coverage threshold met (> 70%)
- [ ] No new `any` types added
- [ ] Lint passes (`npm run lint`)
- [ ] Self-review completed with fresh context
- [ ] Conventional commit message used
- [ ] No secrets in diff
- [ ] Architecture patterns followed
```

## Agent Development Guidelines

When creating or modifying agents:

1. Extend `AbstractAgent` for built-in resilience
2. Define capabilities in `getCapabilities()` method
3. Use Zod schemas for input validation
4. Handle errors with specific `AppError` subclasses
5. Add comprehensive tests in `backend/tests/agents/`
6. Document in ARCHITECTURE.md if significant changes

## Response Mode Configuration

The assistant supports three response modes:

| Mode | Model | Max Tokens | Use Case |
|------|-------|------------|----------|
| `instant` | claude-3-5-haiku | 500 | Quick facts, yes/no |
| `standard` | claude-sonnet-4 | 1500 | General questions |
| `deep-think` | claude-sonnet-4 + extended thinking | 4000 | Complex analysis |

## Quality Evaluation

Daily automated evaluation runs at 6 AM UTC:
- 50-100 curated benchmark questions
- 20 synthetic questions targeting weak areas
- Scores stored in `ConversationEvaluation` table
- Reports in `docs/quality-reports/`

## Useful Resources

- `ARCHITECTURE.md` - Detailed system architecture
- `TECH_LEAD_REVIEW_2026-02-02.md` - Recent code review findings
- `docs/plans/` - Implementation plans
- `backend/prisma/schema.prisma` - Database schema
```

**Step 2: Commit the CLAUDE.md**

```bash
git add CLAUDE.md
git commit -m "docs: add enterprise-grade CLAUDE.md governance

Establishes strict engineering standards:
- TDD workflow (red-green-refactor)
- Zero any policy with alternatives
- Mandatory code review process
- Architecture enforcement rules
- Commit standards

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.2: Add Evaluation Database Schema

**Files:**
- Modify: `backend/prisma/schema.prisma` (add at end, after line 2031)

**Step 1: Write the failing migration test**

Create test file: `backend/tests/services/evaluation/evaluationSchema.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Evaluation Schema', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  it('should have QualityBenchmark model', async () => {
    // This will fail until schema is added
    const count = await prisma.qualityBenchmark.count();
    expect(typeof count).toBe('number');
  });

  it('should have BenchmarkEvaluation model', async () => {
    const count = await prisma.benchmarkEvaluation.count();
    expect(typeof count).toBe('number');
  });

  it('should have ConversationEvaluation model', async () => {
    const count = await prisma.conversationEvaluation.count();
    expect(typeof count).toBe('number');
  });

  it('should have QualityReport model', async () => {
    const count = await prisma.qualityReport.count();
    expect(typeof count).toBe('number');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm run test -- backend/tests/services/evaluation/evaluationSchema.test.ts
```

Expected: FAIL - models not found in Prisma client

**Step 3: Add schema to prisma**

Add to `backend/prisma/schema.prisma` at end of file:

```prisma
// =============================================================================
// AI QUALITY EVALUATION
// =============================================================================

model QualityBenchmark {
  id            String   @id @default(uuid())
  category      String   // 'general', 'cooking', 'jobs', 'travel', etc.
  question      String   @db.Text
  difficulty    Int      // 1-5
  expectedAgents String[] // Which agents should be invoked
  isCurated     Boolean  @default(false) // true = seed set, false = synthetic

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  evaluations   BenchmarkEvaluation[]

  @@index([category, isCurated])
  @@index([difficulty])
}

model BenchmarkEvaluation {
  id            String   @id @default(uuid())
  benchmarkId   String
  benchmark     QualityBenchmark @relation(fields: [benchmarkId], references: [id], onDelete: Cascade)

  response      String   @db.Text // The assistant's response
  responseMode  String   // instant, standard, deep-think

  // Scores (0-5)
  accuracy      Int
  helpfulness   Int
  completeness  Int
  clarity       Int
  safety        Int
  agentUsage    Int
  overallScore  Float    // Weighted average

  feedback      String?  @db.Text // Claude's explanation
  createdAt     DateTime @default(now())

  @@index([benchmarkId])
  @@index([createdAt])
  @@index([overallScore])
}

model ConversationEvaluation {
  id                String   @id @default(uuid())
  conversationId    String
  messageId         String
  userMessage       String   @db.Text
  assistantResponse String   @db.Text
  responseMode      String

  // Scores (0-5)
  accuracy          Int
  helpfulness       Int
  completeness      Int
  clarity           Int
  safety            Int
  agentUsage        Int?     // Null if no agents expected
  overallScore      Float

  feedback          String?  @db.Text
  createdAt         DateTime @default(now())

  @@index([conversationId])
  @@index([createdAt])
  @@index([overallScore])
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
  benchmarkScore   Float?   // Score on curated benchmark only
  syntheticScore   Float?   // Score on synthetic questions only

  createdAt       DateTime @default(now())

  @@index([reportDate])
}
```

**Step 4: Generate Prisma client and run migration**

```bash
cd backend && npx prisma generate
cd backend && npx prisma migrate dev --name add_quality_evaluation_tables
```

**Step 5: Run test to verify it passes**

```bash
cd backend && npm run test -- backend/tests/services/evaluation/evaluationSchema.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/tests/services/evaluation/
git commit -m "feat(db): add quality evaluation schema

Adds four new tables for AI quality tracking:
- QualityBenchmark: curated and synthetic test questions
- BenchmarkEvaluation: evaluation results for benchmarks
- ConversationEvaluation: production conversation sampling
- QualityReport: daily aggregate reports

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.3: Create Benchmark Questions Seed Data

**Files:**
- Create: `backend/src/data/benchmark-questions.json`

**Step 1: Write the test**

Create: `backend/tests/data/benchmarkQuestions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Benchmark Questions Data', () => {
  const dataPath = path.join(__dirname, '../../src/data/benchmark-questions.json');

  it('should exist and be valid JSON', () => {
    expect(fs.existsSync(dataPath)).toBe(true);
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data).toBeDefined();
  });

  it('should have required categories', () => {
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);

    const requiredCategories = ['general', 'cooking', 'jobs', 'travel', 'shopping', 'problems'];
    for (const category of requiredCategories) {
      expect(data[category]).toBeDefined();
      expect(Array.isArray(data[category])).toBe(true);
      expect(data[category].length).toBeGreaterThan(0);
    }
  });

  it('should have valid question structure', () => {
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);

    for (const [category, questions] of Object.entries(data)) {
      for (const q of questions as any[]) {
        expect(q.question).toBeDefined();
        expect(typeof q.question).toBe('string');
        expect(q.difficulty).toBeDefined();
        expect(q.difficulty).toBeGreaterThanOrEqual(1);
        expect(q.difficulty).toBeLessThanOrEqual(5);
        expect(Array.isArray(q.expectedAgents)).toBe(true);
      }
    }
  });

  it('should have at least 50 total questions', () => {
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);

    let total = 0;
    for (const questions of Object.values(data)) {
      total += (questions as any[]).length;
    }
    expect(total).toBeGreaterThanOrEqual(50);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm run test -- backend/tests/data/benchmarkQuestions.test.ts
```

Expected: FAIL - file does not exist

**Step 3: Create the benchmark questions file**

Create: `backend/src/data/benchmark-questions.json`

```json
{
  "general": [
    { "question": "What is Pocketknife?", "difficulty": 1, "expectedAgents": [] },
    { "question": "How can you help me?", "difficulty": 1, "expectedAgents": [] },
    { "question": "What agents are available?", "difficulty": 1, "expectedAgents": [] },
    { "question": "Tell me about yourself", "difficulty": 1, "expectedAgents": [] },
    { "question": "What can I do with this app?", "difficulty": 2, "expectedAgents": [] },
    { "question": "How do I get started?", "difficulty": 2, "expectedAgents": [] },
    { "question": "What's the difference between agents?", "difficulty": 2, "expectedAgents": [] },
    { "question": "Can you help me with multiple things at once?", "difficulty": 3, "expectedAgents": [] }
  ],
  "cooking": [
    { "question": "Find me a quick pasta recipe", "difficulty": 1, "expectedAgents": ["cooking"] },
    { "question": "What can I make with chicken and rice?", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Suggest a healthy dinner under 500 calories", "difficulty": 3, "expectedAgents": ["cooking"] },
    { "question": "I have eggs, cheese, and bread - what can I make?", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Find a vegetarian recipe for dinner", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Show me my saved recipes", "difficulty": 1, "expectedAgents": ["cooking"] },
    { "question": "Add milk, eggs, and butter to my shopping list", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Plan meals for the week", "difficulty": 4, "expectedAgents": ["cooking"] },
    { "question": "What's a good recipe for beginners?", "difficulty": 2, "expectedAgents": ["cooking"] },
    { "question": "Find Italian recipes that take less than 30 minutes", "difficulty": 3, "expectedAgents": ["cooking"] }
  ],
  "jobs": [
    { "question": "Find software engineer jobs in Tel Aviv", "difficulty": 1, "expectedAgents": ["jobs"] },
    { "question": "Search for remote React developer positions", "difficulty": 2, "expectedAgents": ["jobs"] },
    { "question": "Show my saved jobs", "difficulty": 1, "expectedAgents": ["jobs"] },
    { "question": "Find senior backend roles paying over 50k", "difficulty": 3, "expectedAgents": ["jobs"] },
    { "question": "Help me prepare for a technical interview", "difficulty": 3, "expectedAgents": ["jobs", "problems"] },
    { "question": "What companies are hiring in cybersecurity?", "difficulty": 2, "expectedAgents": ["jobs"] },
    { "question": "Find startup jobs in fintech", "difficulty": 2, "expectedAgents": ["jobs"] },
    { "question": "Search for DevOps engineer positions", "difficulty": 2, "expectedAgents": ["jobs"] },
    { "question": "Find jobs that match my skills", "difficulty": 3, "expectedAgents": ["jobs"] },
    { "question": "What are the trending tech jobs right now?", "difficulty": 2, "expectedAgents": ["jobs"] }
  ],
  "travel": [
    { "question": "Find flights from TLV to NYC next month", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Plan a weekend trip to Rome", "difficulty": 3, "expectedAgents": ["travel"] },
    { "question": "What are the best places to visit in Tokyo?", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Find cheap flights to Europe", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Search for hotels in Paris under $200", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Plan a 5-day trip to Barcelona", "difficulty": 4, "expectedAgents": ["travel"] },
    { "question": "What documents do I need to travel to Japan?", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "Find round-trip flights for two people", "difficulty": 3, "expectedAgents": ["travel"] },
    { "question": "Suggest a beach destination for summer", "difficulty": 2, "expectedAgents": ["travel"] },
    { "question": "What's the best time to visit Greece?", "difficulty": 2, "expectedAgents": ["travel"] }
  ],
  "shopping": [
    { "question": "Find deals on headphones", "difficulty": 1, "expectedAgents": ["shopping"] },
    { "question": "Compare prices for iPhone 15", "difficulty": 2, "expectedAgents": ["shopping"] },
    { "question": "Show my saved deals", "difficulty": 1, "expectedAgents": ["shopping"] },
    { "question": "Search for a laptop under $1000", "difficulty": 2, "expectedAgents": ["shopping"] },
    { "question": "Find the best deals on gaming monitors", "difficulty": 2, "expectedAgents": ["shopping"] },
    { "question": "Alert me when this product drops in price", "difficulty": 3, "expectedAgents": ["shopping"] },
    { "question": "Find wireless earbuds with good reviews", "difficulty": 2, "expectedAgents": ["shopping"] },
    { "question": "What are the trending products today?", "difficulty": 2, "expectedAgents": ["shopping"] }
  ],
  "problems": [
    { "question": "Give me a medium LeetCode problem about arrays", "difficulty": 2, "expectedAgents": ["problems"] },
    { "question": "Find a dynamic programming practice problem", "difficulty": 3, "expectedAgents": ["problems"] },
    { "question": "Show me easy string manipulation problems", "difficulty": 2, "expectedAgents": ["problems"] },
    { "question": "What problems does Google ask in interviews?", "difficulty": 3, "expectedAgents": ["problems"] },
    { "question": "Give me a tree traversal problem", "difficulty": 2, "expectedAgents": ["problems"] },
    { "question": "Find problems from the Blind 75 list", "difficulty": 2, "expectedAgents": ["problems"] },
    { "question": "Practice graph algorithms", "difficulty": 3, "expectedAgents": ["problems"] },
    { "question": "Show my solved problems", "difficulty": 1, "expectedAgents": ["problems"] }
  ],
  "multi_agent": [
    { "question": "Plan a business trip to London and find good restaurants nearby", "difficulty": 4, "expectedAgents": ["travel", "cooking"] },
    { "question": "I'm job hunting and stressed - suggest easy recipes and jobs", "difficulty": 4, "expectedAgents": ["jobs", "cooking"] },
    { "question": "Help me prepare for interviews at FAANG companies", "difficulty": 4, "expectedAgents": ["jobs", "problems"] },
    { "question": "Find deals on travel gear for my upcoming trip", "difficulty": 3, "expectedAgents": ["shopping", "travel"] },
    { "question": "I need to learn React for a job interview - find resources and practice problems", "difficulty": 4, "expectedAgents": ["learning", "problems"] },
    { "question": "Plan my day: tasks, meals, and learning", "difficulty": 5, "expectedAgents": ["todo", "cooking", "learning"] }
  ]
}
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm run test -- backend/tests/data/benchmarkQuestions.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/data/benchmark-questions.json backend/tests/data/
git commit -m "feat(eval): add curated benchmark questions

60+ questions across 7 categories:
- general, cooking, jobs, travel, shopping, problems, multi_agent
- Difficulty levels 1-5
- Expected agents for validation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Response Modes

### Task 2.1: Add Response Mode Types and Config

**Files:**
- Modify: `backend/src/utils/anthropicClient.ts` (add after line 48)

**Step 1: Write the test**

Create: `backend/tests/utils/responseModes.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ResponseMode, MODE_CONFIGS, getModelConfigForMode } from '../../src/utils/anthropicClient';

describe('Response Modes', () => {
  it('should have three response modes', () => {
    const modes: ResponseMode[] = ['instant', 'standard', 'deep-think'];
    for (const mode of modes) {
      expect(MODE_CONFIGS[mode]).toBeDefined();
    }
  });

  it('instant mode should use haiku with low tokens', () => {
    const config = getModelConfigForMode('instant');
    expect(config.model).toContain('haiku');
    expect(config.maxTokens).toBeLessThanOrEqual(500);
    expect(config.thinking).toBeUndefined();
  });

  it('standard mode should use sonnet', () => {
    const config = getModelConfigForMode('standard');
    expect(config.model).toContain('sonnet');
    expect(config.maxTokens).toBe(1500);
    expect(config.thinking).toBeUndefined();
  });

  it('deep-think mode should use sonnet with extended thinking', () => {
    const config = getModelConfigForMode('deep-think');
    expect(config.model).toContain('sonnet');
    expect(config.maxTokens).toBe(4000);
    expect(config.thinking).toBeDefined();
    expect(config.thinking?.type).toBe('enabled');
    expect(config.thinking?.budgetTokens).toBeGreaterThanOrEqual(10000);
  });

  it('getModelConfigForMode should return correct config', () => {
    expect(getModelConfigForMode('instant').model).toContain('haiku');
    expect(getModelConfigForMode('standard').maxTokens).toBe(1500);
    expect(getModelConfigForMode('deep-think').thinking).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm run test -- backend/tests/utils/responseModes.test.ts
```

Expected: FAIL - exports not found

**Step 3: Add response mode types and config to anthropicClient.ts**

Add after line 48 (after `StreamCallbacks` interface) in `backend/src/utils/anthropicClient.ts`:

```typescript
// =============================================================================
// RESPONSE MODES
// =============================================================================

export type ResponseMode = 'instant' | 'standard' | 'deep-think';

export interface ModeConfig {
  model: string;
  maxTokens: number;
  thinking?: {
    type: 'enabled';
    budgetTokens: number;
  };
  systemPromptPrefix?: string;
}

export const MODE_CONFIGS: Record<ResponseMode, ModeConfig> = {
  'instant': {
    model: 'claude-3-5-haiku-latest',
    maxTokens: 500,
    systemPromptPrefix: 'Be concise and direct. Give brief, focused answers.'
  },
  'standard': {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1500,
    systemPromptPrefix: ''
  },
  'deep-think': {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    thinking: {
      type: 'enabled',
      budgetTokens: 10000
    },
    systemPromptPrefix: 'Think through this carefully, considering multiple angles and edge cases.'
  }
};

/**
 * Get model configuration for a response mode
 */
export const getModelConfigForMode = (mode: ResponseMode): ModeConfig => {
  return MODE_CONFIGS[mode];
};
```

Also update the default export at line 470 to include the new exports:

```typescript
export default {
  getAnthropicClient,
  isAnthropicConfigured,
  generateClaudeMessage,
  generateWithTools,
  continueWithToolResults,
  streamMessage,
  streamWithToolLoop,
  analyzeImage,
  parseClaudeJSON,
  createTool,
  extractText,
  getModelConfigForMode,
  MODE_CONFIGS
};
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm run test -- backend/tests/utils/responseModes.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/utils/anthropicClient.ts backend/tests/utils/responseModes.test.ts
git commit -m "feat(assistant): add response mode configuration

Three modes with different Claude configurations:
- instant: Haiku, 500 tokens, concise responses
- standard: Sonnet, 1500 tokens, balanced
- deep-think: Sonnet + extended thinking, 4000 tokens

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.2: Update Assistant Service for Response Modes

**Files:**
- Modify: `backend/src/services/assistant/assistantService.ts`

**Step 1: Write the test**

Create: `backend/tests/services/assistant/responseModes.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assistantService } from '../../../src/services/assistant/assistantService';

// Mock anthropic client
vi.mock('../../../src/utils/anthropicClient', async () => {
  const actual = await vi.importActual('../../../src/utils/anthropicClient');
  return {
    ...actual,
    getAnthropicClient: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"intent": "test", "confidence": 0.9, "requiresAgents": [], "extractedParams": {}, "isMultiStep": false}' }]
        })
      }
    }))
  };
});

describe('Assistant Service Response Modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept responseMode parameter in handleMessage', async () => {
    // This test verifies the interface accepts responseMode
    const result = await assistantService.handleMessage(
      'Hello',
      'test-user-id',
      [],
      undefined,
      'instant' // responseMode parameter
    );

    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it('should default to standard mode when not specified', async () => {
    const result = await assistantService.handleMessage(
      'Hello',
      'test-user-id',
      []
    );

    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm run test -- backend/tests/services/assistant/responseModes.test.ts
```

Expected: FAIL - responseMode parameter not accepted

**Step 3: Update assistantService.ts**

Modify the `handleMessage` method signature (around line 607) to accept `responseMode`:

```typescript
/**
 * Handle a complete chat message (interpret -> plan -> execute -> respond)
 * Uses multi-source aggregation for comprehensive answers
 */
async handleMessage(
  message: string,
  userId: string,
  conversationHistory: ChatMessage[] = [],
  onProgress?: (step: WorkflowStep) => void,
  responseMode: ResponseMode = 'standard'
): Promise<AssistantResponse> {
```

Add import at top of file:

```typescript
import { getAnthropicClient, parseClaudeJSON, getModelConfigForMode, ResponseMode } from '../../utils/anthropicClient';
```

Update Claude API calls in the service to use the mode config. For example, in `interpretUserMessage` (around line 352):

```typescript
async interpretUserMessage(
  message: string,
  conversationHistory: ChatMessage[] = [],
  responseMode: ResponseMode = 'standard'
): Promise<IntentAnalysis> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('AI service not available');
  }

  const modeConfig = getModelConfigForMode(responseMode);
  // ... rest of the method, using modeConfig.model and modeConfig.maxTokens
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm run test -- backend/tests/services/assistant/responseModes.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/assistant/assistantService.ts backend/tests/services/assistant/responseModes.test.ts
git commit -m "feat(assistant): integrate response modes in assistant service

- handleMessage accepts responseMode parameter
- Defaults to 'standard' mode
- Uses mode-specific model and token configuration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.3: Add Response Mode to API Types

**Files:**
- Modify: `frontend/src/services/assistantApi.ts`

**Step 1: Write the test**

Create: `frontend/src/services/__tests__/assistantApi.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type { ResponseMode } from '../assistantApi';

describe('Assistant API Types', () => {
  it('should export ResponseMode type', () => {
    const modes: ResponseMode[] = ['instant', 'standard', 'deep-think'];
    expect(modes.length).toBe(3);
  });
});
```

**Step 2: Add ResponseMode type to assistantApi.ts**

Add after line 130 (after ChatMessage interface):

```typescript
// Response modes for AI quality control
export type ResponseMode = 'instant' | 'standard' | 'deep-think';

export interface ResponseModeConfig {
  id: ResponseMode;
  label: string;
  description: string;
  icon: string;
}

export const RESPONSE_MODES: ResponseModeConfig[] = [
  {
    id: 'instant',
    label: 'Instant',
    description: 'Quick, concise answers',
    icon: 'zap'
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Balanced responses',
    icon: 'message-square'
  },
  {
    id: 'deep-think',
    label: 'Deep Think',
    description: 'Thorough analysis',
    icon: 'brain'
  }
];
```

Update `sendMessageV2` function signature to accept `responseMode`:

```typescript
export const sendMessageV2 = async (
  message: string,
  conversationId: string,
  history?: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>,
  enablePlanPreview?: boolean,
  cancelToken?: CancelTokenSource,
  responseMode?: ResponseMode
): Promise<EnhancedAssistantResponse> => {
  const token = cancelToken || createCancelToken();

  const response = await assistantAxios.post('/assistant/v2/chat', {
    message,
    conversationId,
    conversationHistory: history,
    enablePlanPreview,
    responseMode: responseMode || 'standard'
  }, {
    cancelToken: token.token,
    timeout: 120000
  });

  return response.data.data || response.data;
};
```

**Step 3: Run test and commit**

```bash
cd frontend && npm run test -- src/services/__tests__/assistantApi.test.ts
git add frontend/src/services/assistantApi.ts frontend/src/services/__tests__/
git commit -m "feat(frontend): add response mode types to API

- ResponseMode type: instant, standard, deep-think
- RESPONSE_MODES config with labels and descriptions
- sendMessageV2 accepts responseMode parameter

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.4: Add Response Mode Selector to UI

**Files:**
- Modify: `frontend/src/components/AssistantAgent.tsx`
- Modify: `frontend/src/hooks/useAssistant.ts`

**Step 1: Update useAssistant hook**

Add to `frontend/src/hooks/useAssistant.ts` after line 89:

```typescript
const [responseMode, setResponseMode] = useState<ResponseMode>('standard');
```

Add to imports:

```typescript
import type { ResponseMode } from '../services/assistantApi';
```

Add to the return interface (around line 32):

```typescript
responseMode: ResponseMode;
setResponseMode: (mode: ResponseMode) => void;
```

Update `sendMessage` function to use `responseMode`:

```typescript
const sendMessage = useCallback(async (message: string, enablePlanPreview?: boolean) => {
  // ... existing code
  const response = await assistantApi.sendMessageV2(
    message,
    convId,
    historyForApi,
    enablePlanPreview,
    undefined,
    responseMode // Add this parameter
  );
  // ... rest of function
}, [conversationId, messages, responseMode]); // Add responseMode to dependencies
```

**Step 2: Add mode selector to AssistantAgent.tsx**

Add after line 58 imports:

```typescript
import { RESPONSE_MODES, type ResponseMode } from '../services/assistantApi';
```

Add mode selector component (create before line 93):

```typescript
// =============================================================================
// MODE SELECTOR COMPONENT
// =============================================================================

interface ModeSelectorProps {
  currentMode: ResponseMode;
  onModeChange: (mode: ResponseMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getModeIcon = (mode: ResponseMode) => {
    switch (mode) {
      case 'instant': return <Zap size={14} />;
      case 'standard': return <MessageSquare size={14} />;
      case 'deep-think': return <Brain size={14} />;
    }
  };

  const currentConfig = RESPONSE_MODES.find(m => m.id === currentMode);

  return (
    <div className={styles.modeSelector}>
      <button
        className={styles.modeSelectorButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select response mode"
      >
        {getModeIcon(currentMode)}
        <span>{currentConfig?.label}</span>
        <ChevronDown size={12} />
      </button>
      {isOpen && (
        <div className={styles.modeSelectorDropdown}>
          {RESPONSE_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`${styles.modeSelectorOption} ${currentMode === mode.id ? styles.active : ''}`}
              onClick={() => {
                onModeChange(mode.id);
                setIsOpen(false);
              }}
            >
              {getModeIcon(mode.id)}
              <div className={styles.modeSelectorOptionText}>
                <span className={styles.modeSelectorOptionLabel}>{mode.label}</span>
                <span className={styles.modeSelectorOptionDesc}>{mode.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

Add CSS to `frontend/src/styles/assistant.module.css`:

```css
/* Mode Selector */
.modeSelector {
  position: relative;
}

.modeSelectorButton {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.modeSelectorButton:hover {
  border-color: var(--primary-color);
}

.modeSelectorDropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 200px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.modeSelectorOption {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.modeSelectorOption:hover {
  background: var(--bg-secondary);
}

.modeSelectorOption.active {
  background: var(--primary-color-light);
}

.modeSelectorOptionText {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modeSelectorOptionLabel {
  font-weight: 500;
  color: var(--text-primary);
}

.modeSelectorOptionDesc {
  font-size: 12px;
  color: var(--text-secondary);
}
```

**Step 3: Integrate mode selector in the component**

In the AssistantAgent component (around line 600 where the input area is), add the mode selector:

```typescript
// In the header or input area
<ModeSelector
  currentMode={responseMode}
  onModeChange={setResponseMode}
/>
```

**Step 4: Test and commit**

```bash
cd frontend && npm run build
git add frontend/src/components/AssistantAgent.tsx frontend/src/hooks/useAssistant.ts frontend/src/styles/assistant.module.css
git commit -m "feat(ui): add response mode selector to chat interface

- Mode selector dropdown in chat header
- Three modes: Instant, Standard, Deep Think
- Mode persisted during conversation
- Visual indicators for each mode

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Inline Agent Cards

### Task 3.1: Create AgentResultCard Component

**Files:**
- Create: `frontend/src/components/common/AgentResultCard.tsx`

**Step 1: Create the component**

```typescript
/**
 * AgentResultCard Component
 *
 * Renders inline expandable cards for agent results in chat.
 * Supports different card layouts per agent type.
 */

import React, { useState } from 'react';
import {
  ChefHat,
  Briefcase,
  Plane,
  ShoppingBag,
  Code,
  CheckSquare,
  Mail,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Clock,
  Users,
  DollarSign,
  MapPin,
  Star
} from 'lucide-react';
import styles from '../../styles/agentCard.module.css';

// =============================================================================
// TYPES
// =============================================================================

export type AgentType =
  | 'cooking'
  | 'jobs'
  | 'travel'
  | 'shopping'
  | 'problems'
  | 'todo'
  | 'email'
  | 'learning';

export interface AgentResultCardData {
  agentType: AgentType;
  id: string;
  summary: {
    title: string;
    subtitle?: string;
    metadata: Array<{ icon: string; label: string; value: string }>;
    image?: string;
  };
  details: Record<string, unknown>;
  actions: Array<{
    label: string;
    action: 'save' | 'open' | 'apply' | 'book' | 'custom';
    endpoint?: string;
    params?: Record<string, unknown>;
  }>;
}

interface AgentResultCardProps {
  data: AgentResultCardData;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
  onOpenInAgent?: (agentType: AgentType, id: string) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getAgentIcon = (type: AgentType) => {
  switch (type) {
    case 'cooking': return <ChefHat size={16} />;
    case 'jobs': return <Briefcase size={16} />;
    case 'travel': return <Plane size={16} />;
    case 'shopping': return <ShoppingBag size={16} />;
    case 'problems': return <Code size={16} />;
    case 'todo': return <CheckSquare size={16} />;
    case 'email': return <Mail size={16} />;
    case 'learning': return <BookOpen size={16} />;
    default: return null;
  }
};

const getAgentColor = (type: AgentType): string => {
  switch (type) {
    case 'cooking': return '#f97316';
    case 'jobs': return '#3b82f6';
    case 'travel': return '#8b5cf6';
    case 'shopping': return '#ec4899';
    case 'problems': return '#10b981';
    case 'todo': return '#06b6d4';
    case 'email': return '#ef4444';
    case 'learning': return '#f59e0b';
    default: return '#6b7280';
  }
};

const getMetadataIcon = (iconName: string) => {
  switch (iconName) {
    case 'clock': return <Clock size={12} />;
    case 'users': return <Users size={12} />;
    case 'dollar': return <DollarSign size={12} />;
    case 'location': return <MapPin size={12} />;
    case 'star': return <Star size={12} />;
    default: return null;
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentResultCard: React.FC<AgentResultCardProps> = ({
  data,
  onAction,
  onOpenInAgent
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAction = (action: string, params?: Record<string, unknown>) => {
    if (onAction) {
      onAction(action, params);
    }
  };

  return (
    <div
      className={styles.card}
      style={{ '--agent-color': getAgentColor(data.agentType) } as React.CSSProperties}
    >
      {/* Header */}
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.headerIcon}>
          {getAgentIcon(data.agentType)}
        </div>
        <div className={styles.headerContent}>
          <h4 className={styles.title}>{data.summary.title}</h4>
          {data.summary.subtitle && (
            <p className={styles.subtitle}>{data.summary.subtitle}</p>
          )}
        </div>
        <button className={styles.expandButton}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Metadata */}
      <div className={styles.metadata}>
        {data.summary.metadata.map((meta, idx) => (
          <span key={idx} className={styles.metaItem}>
            {getMetadataIcon(meta.icon)}
            <span>{meta.value}</span>
          </span>
        ))}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className={styles.details}>
          {data.summary.image && (
            <img
              src={data.summary.image}
              alt={data.summary.title}
              className={styles.image}
            />
          )}
          <div className={styles.detailsContent}>
            {/* Render details based on agent type */}
            {data.agentType === 'cooking' && data.details.ingredients && (
              <div className={styles.section}>
                <h5>Ingredients</h5>
                <ul>
                  {(data.details.ingredients as string[]).map((ing, idx) => (
                    <li key={idx}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.agentType === 'jobs' && data.details.description && (
              <div className={styles.section}>
                <h5>Description</h5>
                <p>{data.details.description as string}</p>
              </div>
            )}
            {/* Add more agent-specific detail rendering as needed */}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {data.actions.map((action, idx) => (
          <button
            key={idx}
            className={styles.actionButton}
            onClick={() => handleAction(action.action, action.params)}
          >
            {action.action === 'save' && <Heart size={14} />}
            {action.label}
          </button>
        ))}
        {onOpenInAgent && (
          <button
            className={styles.openButton}
            onClick={() => onOpenInAgent(data.agentType, data.id)}
          >
            Open in {data.agentType.charAt(0).toUpperCase() + data.agentType.slice(1)}
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AgentResultCard;
```

**Step 2: Create CSS for the card**

Create: `frontend/src/styles/agentCard.module.css`

```css
.card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  margin: 8px 0;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid var(--agent-color);
}

.headerIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--agent-color) 15%, transparent);
  color: var(--agent-color);
}

.headerContent {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.expandButton {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
}

.expandButton:hover {
  background: var(--bg-secondary);
}

.metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.metaItem {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.details {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
}

.detailsContent {
  font-size: 14px;
  color: var(--text-primary);
}

.section {
  margin-bottom: 12px;
}

.section h5 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.section ul {
  margin: 0;
  padding-left: 20px;
}

.section li {
  margin: 4px 0;
}

.section p {
  margin: 0;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.actionButton {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.actionButton:hover {
  background: var(--bg-secondary);
  border-color: var(--agent-color);
}

.openButton {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.openButton:hover {
  color: var(--agent-color);
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/common/AgentResultCard.tsx frontend/src/styles/agentCard.module.css
git commit -m "feat(ui): add AgentResultCard component for inline results

- Expandable cards for all agent types
- Agent-specific icons and colors
- Metadata display with icons
- Action buttons (save, open in agent)
- Responsive design

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: Evaluation System

### Task 4.1: Create Evaluation Service

**Files:**
- Create: `backend/src/services/evaluation/evaluationService.ts`
- Create: `backend/src/services/evaluation/index.ts`

**Step 1: Write the test**

Create: `backend/tests/services/evaluation/evaluationService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluationService } from '../../../src/services/evaluation';

vi.mock('../../../src/utils/anthropicClient', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          accuracy: 4,
          helpfulness: 5,
          completeness: 4,
          clarity: 5,
          safety: 5,
          agentUsage: 4,
          feedback: 'Good response'
        })}]
      })
    }
  })),
  generateClaudeMessage: vi.fn().mockResolvedValue(JSON.stringify({
    accuracy: 4,
    helpfulness: 5,
    completeness: 4,
    clarity: 5,
    safety: 5,
    agentUsage: 4,
    feedback: 'Good response'
  }))
}));

describe('Evaluation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should evaluate a response and return scores', async () => {
    const result = await evaluationService.evaluateResponse(
      'Find me a pasta recipe',
      'Here is a delicious pasta recipe...',
      ['cooking'],
      ['cooking']
    );

    expect(result).toBeDefined();
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(5);
    expect(result.overallScore).toBeDefined();
  });

  it('should calculate weighted overall score', async () => {
    const result = await evaluationService.evaluateResponse(
      'Test question',
      'Test response',
      [],
      []
    );

    // Overall score should be weighted average
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(5);
  });

  it('should decide whether to sample based on rate', () => {
    // With 100% rate, should always sample
    expect(evaluationService.shouldSample(1.0)).toBe(true);
    // With 0% rate, should never sample
    expect(evaluationService.shouldSample(0)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npm run test -- backend/tests/services/evaluation/evaluationService.test.ts
```

Expected: FAIL - module not found

**Step 3: Create the evaluation service**

Create: `backend/src/services/evaluation/evaluationService.ts`

```typescript
/**
 * Evaluation Service
 *
 * Evaluates AI assistant responses for quality using Claude.
 * Supports both production sampling and benchmark evaluation.
 */

import { generateClaudeMessage, parseClaudeJSON } from '../../utils/anthropicClient';
import { prisma } from '../core/database';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface EvaluationResult {
  accuracy: number;      // 0-5
  helpfulness: number;   // 0-5
  completeness: number;  // 0-5
  clarity: number;       // 0-5
  safety: number;        // 0-5
  agentUsage: number | null; // 0-5 or null
  overallScore: number;  // Weighted average
  feedback: string;
}

export interface EvaluationWeights {
  accuracy: number;
  helpfulness: number;
  completeness: number;
  clarity: number;
  safety: number;
  agentUsage: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_WEIGHTS: EvaluationWeights = {
  accuracy: 0.25,
  helpfulness: 0.25,
  completeness: 0.15,
  clarity: 0.15,
  safety: 0.10,
  agentUsage: 0.10
};

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

Return ONLY valid JSON (no markdown):
{
  "accuracy": <0-5>,
  "helpfulness": <0-5>,
  "completeness": <0-5>,
  "clarity": <0-5>,
  "safety": <0-5>,
  "agentUsage": <0-5 or null>,
  "feedback": "<brief explanation of scores>"
}`;

// =============================================================================
// SERVICE
// =============================================================================

class EvaluationService {
  private weights: EvaluationWeights;

  constructor(weights: EvaluationWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Evaluate a single response
   */
  async evaluateResponse(
    question: string,
    response: string,
    expectedAgents: string[],
    actualAgents: string[]
  ): Promise<EvaluationResult> {
    const prompt = EVALUATION_PROMPT
      .replace('{question}', question)
      .replace('{response}', response.slice(0, 2000)) // Limit response length
      .replace('{expectedAgents}', expectedAgents.join(', ') || 'none')
      .replace('{actualAgents}', actualAgents.join(', ') || 'none');

    try {
      const result = await generateClaudeMessage(prompt, {
        model: 'claude-3-5-haiku-latest', // Use Haiku for cost efficiency
        maxTokens: 500
      });

      const scores = parseClaudeJSON<Omit<EvaluationResult, 'overallScore'>>(result);
      const overallScore = this.calculateOverallScore(scores);

      return {
        ...scores,
        overallScore
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.fail('Failed to evaluate response', { error: errorMessage });

      // Return neutral scores on failure
      return {
        accuracy: 3,
        helpfulness: 3,
        completeness: 3,
        clarity: 3,
        safety: 3,
        agentUsage: null,
        overallScore: 3,
        feedback: 'Evaluation failed'
      };
    }
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(
    scores: Omit<EvaluationResult, 'overallScore'>
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    // Add each score with its weight
    weightedSum += scores.accuracy * this.weights.accuracy;
    totalWeight += this.weights.accuracy;

    weightedSum += scores.helpfulness * this.weights.helpfulness;
    totalWeight += this.weights.helpfulness;

    weightedSum += scores.completeness * this.weights.completeness;
    totalWeight += this.weights.completeness;

    weightedSum += scores.clarity * this.weights.clarity;
    totalWeight += this.weights.clarity;

    weightedSum += scores.safety * this.weights.safety;
    totalWeight += this.weights.safety;

    // Only include agent usage if applicable
    if (scores.agentUsage !== null) {
      weightedSum += scores.agentUsage * this.weights.agentUsage;
      totalWeight += this.weights.agentUsage;
    }

    return Number((weightedSum / totalWeight).toFixed(2));
  }

  /**
   * Decide whether to sample this conversation for evaluation
   */
  shouldSample(sampleRate: number = 0.1): boolean {
    return Math.random() < sampleRate;
  }

  /**
   * Store evaluation result in database
   */
  async storeConversationEvaluation(
    conversationId: string,
    messageId: string,
    userMessage: string,
    assistantResponse: string,
    responseMode: string,
    evaluation: EvaluationResult
  ): Promise<void> {
    try {
      await prisma.conversationEvaluation.create({
        data: {
          conversationId,
          messageId,
          userMessage,
          assistantResponse,
          responseMode,
          accuracy: evaluation.accuracy,
          helpfulness: evaluation.helpfulness,
          completeness: evaluation.completeness,
          clarity: evaluation.clarity,
          safety: evaluation.safety,
          agentUsage: evaluation.agentUsage,
          overallScore: evaluation.overallScore,
          feedback: evaluation.feedback
        }
      });
      logger.success('Stored conversation evaluation', { conversationId, messageId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.fail('Failed to store evaluation', { error: errorMessage });
    }
  }

  /**
   * Store benchmark evaluation result
   */
  async storeBenchmarkEvaluation(
    benchmarkId: string,
    response: string,
    responseMode: string,
    evaluation: EvaluationResult
  ): Promise<void> {
    try {
      await prisma.benchmarkEvaluation.create({
        data: {
          benchmarkId,
          response,
          responseMode,
          accuracy: evaluation.accuracy,
          helpfulness: evaluation.helpfulness,
          completeness: evaluation.completeness,
          clarity: evaluation.clarity,
          safety: evaluation.safety,
          agentUsage: evaluation.agentUsage ?? 0,
          overallScore: evaluation.overallScore,
          feedback: evaluation.feedback
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.fail('Failed to store benchmark evaluation', { error: errorMessage });
    }
  }

  /**
   * Get recent evaluation statistics
   */
  async getRecentStats(days: number = 7): Promise<{
    avgScore: number;
    totalEvaluations: number;
    categoryBreakdown: Record<string, number>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const evaluations = await prisma.conversationEvaluation.findMany({
      where: {
        createdAt: { gte: since }
      },
      select: {
        overallScore: true
      }
    });

    if (evaluations.length === 0) {
      return {
        avgScore: 0,
        totalEvaluations: 0,
        categoryBreakdown: {}
      };
    }

    const avgScore = evaluations.reduce((sum, e) => sum + e.overallScore, 0) / evaluations.length;

    return {
      avgScore: Number(avgScore.toFixed(2)),
      totalEvaluations: evaluations.length,
      categoryBreakdown: {} // TODO: Implement category breakdown
    };
  }
}

export const evaluationService = new EvaluationService();
export default evaluationService;
```

Create: `backend/src/services/evaluation/index.ts`

```typescript
export { evaluationService, EvaluationService } from './evaluationService';
export type { EvaluationResult, EvaluationWeights } from './evaluationService';
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npm run test -- backend/tests/services/evaluation/evaluationService.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/evaluation/ backend/tests/services/evaluation/
git commit -m "feat(eval): add evaluation service for quality scoring

- Evaluate responses using Claude Haiku
- Calculate weighted overall scores
- Store evaluations in database
- Sampling logic for production conversations

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.2: Create Synthetic Question Generator

**Files:**
- Create: `backend/src/services/evaluation/syntheticGenerator.ts`

**Step 1: Write the test**

Create: `backend/tests/services/evaluation/syntheticGenerator.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { syntheticGenerator } from '../../../src/services/evaluation/syntheticGenerator';

vi.mock('../../../src/utils/anthropicClient', () => ({
  generateClaudeMessage: vi.fn().mockResolvedValue(JSON.stringify([
    { question: 'Test question 1', category: 'cooking', difficulty: 2, expectedAgents: ['cooking'] },
    { question: 'Test question 2', category: 'jobs', difficulty: 3, expectedAgents: ['jobs'] }
  ]))
}));

describe('Synthetic Question Generator', () => {
  it('should generate questions', async () => {
    const questions = await syntheticGenerator.generateQuestions(2, {
      weakCategories: ['cooking'],
      currentDifficulty: 2,
      recentQuestions: []
    });

    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should generate questions with required fields', async () => {
    const questions = await syntheticGenerator.generateQuestions(1, {
      weakCategories: [],
      currentDifficulty: 3,
      recentQuestions: []
    });

    for (const q of questions) {
      expect(q.question).toBeDefined();
      expect(q.category).toBeDefined();
      expect(q.difficulty).toBeDefined();
      expect(q.expectedAgents).toBeDefined();
    }
  });

  it('should calculate difficulty based on scores', () => {
    expect(syntheticGenerator.calculateDifficulty(2.0)).toBe(1);
    expect(syntheticGenerator.calculateDifficulty(3.0)).toBe(2);
    expect(syntheticGenerator.calculateDifficulty(4.0)).toBe(3);
    expect(syntheticGenerator.calculateDifficulty(4.5)).toBe(4);
  });
});
```

**Step 2: Create the synthetic generator**

Create: `backend/src/services/evaluation/syntheticGenerator.ts`

```typescript
/**
 * Synthetic Question Generator
 *
 * Generates diverse test questions for AI evaluation using Claude.
 * Focuses on weak areas and adjusts difficulty based on performance.
 */

import { generateClaudeMessage, parseClaudeJSON } from '../../utils/anthropicClient';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratedQuestion {
  question: string;
  category: string;
  difficulty: number;
  expectedAgents: string[];
}

export interface GenerationContext {
  weakCategories: string[];
  currentDifficulty: number;
  recentQuestions: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AGENT_CAPABILITIES = `
Agent capabilities:
- Cooking: Recipe search, ingredient-based suggestions, meal planning, shopping lists
- Jobs: Job search across platforms, salary info, company research, interview prep
- Travel: Flight/hotel search, trip planning, itinerary creation
- Shopping: Deal finding, price comparison, product research
- Problems: Coding problems from LeetCode, Codeforces, practice
- ToDo: Task management, calendar integration, reminders
- Email: Gmail processing, summarization
- Learning: Educational content aggregation, tutorials
`;

const GENERATION_PROMPT = `Generate {count} diverse test questions for an AI assistant.

{focusNote}

Target difficulty: {difficulty}/5 (1=simple, 5=complex)

${AGENT_CAPABILITIES}

Avoid questions similar to:
{recentQuestions}

Generate questions that:
1. Are natural and realistic user queries
2. Cover the specified difficulty level
3. May require single or multiple agents
4. Include edge cases and varied phrasing

Return ONLY a valid JSON array (no markdown):
[
  {
    "question": "the question text",
    "category": "cooking|jobs|travel|shopping|problems|todo|learning|general|multi_agent",
    "difficulty": 1-5,
    "expectedAgents": ["agent1", "agent2"]
  }
]`;

// =============================================================================
// SERVICE
// =============================================================================

class SyntheticGenerator {
  /**
   * Generate synthetic test questions
   */
  async generateQuestions(
    count: number,
    context: GenerationContext
  ): Promise<GeneratedQuestion[]> {
    const focusNote = context.weakCategories.length > 0
      ? `Focus on these weak categories: ${context.weakCategories.join(', ')}`
      : 'Generate questions across all categories';

    const recentList = context.recentQuestions.length > 0
      ? context.recentQuestions.slice(0, 10).join('\n- ')
      : 'None';

    const prompt = GENERATION_PROMPT
      .replace('{count}', count.toString())
      .replace('{focusNote}', focusNote)
      .replace('{difficulty}', context.currentDifficulty.toString())
      .replace('{recentQuestions}', recentList);

    try {
      const result = await generateClaudeMessage(prompt, {
        model: 'claude-3-5-haiku-latest',
        maxTokens: 2000
      });

      const questions = parseClaudeJSON<GeneratedQuestion[]>(result);

      // Validate and filter
      return questions.filter(q =>
        q.question &&
        q.category &&
        q.difficulty >= 1 &&
        q.difficulty <= 5 &&
        Array.isArray(q.expectedAgents)
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.fail('Failed to generate synthetic questions', { error: errorMessage });
      return [];
    }
  }

  /**
   * Calculate target difficulty based on recent performance
   */
  calculateDifficulty(avgScore: number): number {
    if (avgScore < 2.5) return 1;
    if (avgScore < 3.5) return 2;
    if (avgScore < 4.0) return 3;
    if (avgScore < 4.5) return 4;
    return 5;
  }

  /**
   * Get weak categories from recent evaluations
   */
  async getWeakCategories(
    evaluations: Array<{ category: string; score: number }>
  ): Promise<string[]> {
    const categoryScores: Record<string, number[]> = {};

    for (const eval_ of evaluations) {
      if (!categoryScores[eval_.category]) {
        categoryScores[eval_.category] = [];
      }
      categoryScores[eval_.category].push(eval_.score);
    }

    const avgByCategory: Array<{ category: string; avg: number }> = [];
    for (const [category, scores] of Object.entries(categoryScores)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      avgByCategory.push({ category, avg });
    }

    // Return categories with below-average scores
    const overallAvg = avgByCategory.reduce((sum, c) => sum + c.avg, 0) / avgByCategory.length;
    return avgByCategory
      .filter(c => c.avg < overallAvg)
      .map(c => c.category);
  }
}

export const syntheticGenerator = new SyntheticGenerator();
export default syntheticGenerator;
```

Add to `backend/src/services/evaluation/index.ts`:

```typescript
export { evaluationService, EvaluationService } from './evaluationService';
export type { EvaluationResult, EvaluationWeights } from './evaluationService';
export { syntheticGenerator, SyntheticGenerator } from './syntheticGenerator';
export type { GeneratedQuestion, GenerationContext } from './syntheticGenerator';
```

**Step 3: Test and commit**

```bash
cd backend && npm run test -- backend/tests/services/evaluation/syntheticGenerator.test.ts
git add backend/src/services/evaluation/ backend/tests/services/evaluation/
git commit -m "feat(eval): add synthetic question generator

- Generate diverse questions targeting weak areas
- Adjust difficulty based on performance
- Avoid duplicate questions
- Support all agent categories

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.3: Create Daily Evaluation Script

**Files:**
- Create: `backend/src/scripts/dailyEvaluation.ts`

**Step 1: Create the script**

```typescript
/**
 * Daily Evaluation Script
 *
 * Runs daily quality evaluation:
 * 1. Load curated benchmark questions
 * 2. Generate synthetic questions for weak areas
 * 3. Execute all questions through chat
 * 4. Evaluate responses
 * 5. Generate daily report
 */

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../services/core/database';
import { evaluationService } from '../services/evaluation';
import { syntheticGenerator } from '../services/evaluation/syntheticGenerator';
import { assistantService } from '../services/assistant/assistantService';
import logger from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

interface BenchmarkQuestion {
  question: string;
  difficulty: number;
  expectedAgents: string[];
}

interface BenchmarkData {
  [category: string]: BenchmarkQuestion[];
}

// =============================================================================
// HELPERS
// =============================================================================

async function loadCuratedBenchmark(): Promise<Array<BenchmarkQuestion & { category: string; id?: string }>> {
  const dataPath = path.join(__dirname, '../data/benchmark-questions.json');
  const content = fs.readFileSync(dataPath, 'utf-8');
  const data: BenchmarkData = JSON.parse(content);

  const questions: Array<BenchmarkQuestion & { category: string }> = [];
  for (const [category, categoryQuestions] of Object.entries(data)) {
    for (const q of categoryQuestions) {
      questions.push({ ...q, category });
    }
  }

  return questions;
}

async function getLastReport(): Promise<{ avgOverallScore: number; weakestAreas: string[] } | null> {
  const report = await prisma.qualityReport.findFirst({
    orderBy: { reportDate: 'desc' }
  });

  if (!report) return null;

  return {
    avgOverallScore: report.avgOverallScore,
    weakestAreas: report.weakestAreas
  };
}

async function getRecentQuestions(limit: number): Promise<string[]> {
  const evaluations = await prisma.benchmarkEvaluation.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { benchmark: true }
  });

  return evaluations.map(e => e.benchmark.question);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function runDailyEvaluation(): Promise<void> {
  console.log('========================================');
  console.log('Starting daily quality evaluation...');
  console.log('========================================\n');

  // 1. Load curated benchmark
  const curatedQuestions = await loadCuratedBenchmark();
  console.log(`Loaded ${curatedQuestions.length} curated questions\n`);

  // 2. Get last report for context
  const lastReport = await getLastReport();
  const weakCategories = lastReport?.weakestAreas || [];
  const currentDifficulty = syntheticGenerator.calculateDifficulty(
    lastReport?.avgOverallScore || 3.0
  );

  console.log(`Previous avg score: ${lastReport?.avgOverallScore?.toFixed(2) || 'N/A'}`);
  console.log(`Weak categories: ${weakCategories.join(', ') || 'None'}`);
  console.log(`Target difficulty: ${currentDifficulty}/5\n`);

  // 3. Generate synthetic questions
  const recentQuestions = await getRecentQuestions(50);
  const syntheticQuestions = await syntheticGenerator.generateQuestions(20, {
    weakCategories,
    currentDifficulty,
    recentQuestions
  });
  console.log(`Generated ${syntheticQuestions.length} synthetic questions\n`);

  // 4. Save synthetic questions to database
  for (const sq of syntheticQuestions) {
    await prisma.qualityBenchmark.create({
      data: {
        category: sq.category,
        question: sq.question,
        difficulty: sq.difficulty,
        expectedAgents: sq.expectedAgents,
        isCurated: false
      }
    });
  }

  // 5. Run evaluation on all questions
  const allQuestions = [
    ...curatedQuestions,
    ...syntheticQuestions.map(sq => ({
      ...sq,
      category: sq.category,
      id: undefined
    }))
  ];

  const results: Array<{
    question: string;
    category: string;
    score: number;
    isCurated: boolean;
  }> = [];

  let processed = 0;
  for (const q of allQuestions) {
    processed++;
    console.log(`[${processed}/${allQuestions.length}] Evaluating: ${q.question.substring(0, 50)}...`);

    try {
      // Execute chat
      const chatResponse = await assistantService.handleMessage(
        q.question,
        'evaluation-user',
        [],
        undefined,
        'standard'
      );

      // Evaluate response
      const agentsUsed = chatResponse.workflowResult?.steps
        .filter(s => s.status === 'completed')
        .map(s => s.agentId) || [];

      const evaluation = await evaluationService.evaluateResponse(
        q.question,
        chatResponse.message,
        q.expectedAgents,
        agentsUsed
      );

      results.push({
        question: q.question,
        category: q.category,
        score: evaluation.overallScore,
        isCurated: !('id' in q && q.id === undefined)
      });

      console.log(`  Score: ${evaluation.overallScore.toFixed(2)}/5.0`);

      // Rate limit: 1 request per second
      await sleep(1000);
    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      results.push({
        question: q.question,
        category: q.category,
        score: 0,
        isCurated: false
      });
    }
  }

  // 6. Calculate aggregates
  const avgOverall = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const categoryScores: Record<string, number[]> = {};
  for (const r of results) {
    if (!categoryScores[r.category]) categoryScores[r.category] = [];
    categoryScores[r.category].push(r.score);
  }

  const categoryAvgs: Record<string, number> = {};
  for (const [cat, scores] of Object.entries(categoryScores)) {
    categoryAvgs[cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Find weakest areas
  const sortedCategories = Object.entries(categoryAvgs)
    .sort((a, b) => a[1] - b[1]);
  const newWeakAreas = sortedCategories.slice(0, 3).map(([cat]) => cat);

  // Benchmark vs synthetic scores
  const curatedResults = results.filter(r => r.isCurated);
  const syntheticResults = results.filter(r => !r.isCurated);
  const benchmarkScore = curatedResults.length > 0
    ? curatedResults.reduce((sum, r) => sum + r.score, 0) / curatedResults.length
    : null;
  const syntheticScore = syntheticResults.length > 0
    ? syntheticResults.reduce((sum, r) => sum + r.score, 0) / syntheticResults.length
    : null;

  // 7. Save report
  const report = await prisma.qualityReport.create({
    data: {
      reportDate: new Date(),
      avgOverallScore: avgOverall,
      avgAccuracy: avgOverall, // Simplified - would need individual scores
      avgHelpfulness: avgOverall,
      avgCompleteness: avgOverall,
      avgClarity: avgOverall,
      avgSafety: avgOverall,
      avgAgentUsage: avgOverall,
      categoryScores: categoryAvgs,
      weakestAreas: newWeakAreas,
      improvements: [],
      totalEvaluations: results.length,
      benchmarkScore,
      syntheticScore
    }
  });

  // 8. Print summary
  console.log('\n========================================');
  console.log('DAILY EVALUATION COMPLETE');
  console.log('========================================');
  console.log(`Total questions: ${results.length}`);
  console.log(`Overall score: ${avgOverall.toFixed(2)}/5.0`);
  console.log(`Benchmark score: ${benchmarkScore?.toFixed(2) || 'N/A'}`);
  console.log(`Synthetic score: ${syntheticScore?.toFixed(2) || 'N/A'}`);
  console.log(`\nCategory scores:`);
  for (const [cat, avg] of Object.entries(categoryAvgs)) {
    console.log(`  ${cat}: ${avg.toFixed(2)}`);
  }
  console.log(`\nWeakest areas: ${newWeakAreas.join(', ')}`);
  console.log(`Report ID: ${report.id}`);
}

// Run if executed directly
if (require.main === module) {
  runDailyEvaluation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

export { runDailyEvaluation };
```

**Step 2: Add npm script**

Add to `backend/package.json` scripts:

```json
"evaluate:daily": "tsx src/scripts/dailyEvaluation.ts",
"evaluate:report": "tsx src/scripts/generateReport.ts"
```

**Step 3: Commit**

```bash
git add backend/src/scripts/dailyEvaluation.ts backend/package.json
git commit -m "feat(eval): add daily evaluation script

- Load curated benchmark questions
- Generate synthetic questions for weak areas
- Execute questions through chat
- Evaluate and score responses
- Generate daily report with aggregates

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.4: Create GitHub Action for Daily Evaluation

**Files:**
- Create: `.github/workflows/daily-quality-eval.yml`

**Step 1: Create the workflow**

```yaml
name: Daily Quality Evaluation

on:
  schedule:
    # Run at 6 AM UTC daily
    - cron: '0 6 * * *'

  # Allow manual trigger
  workflow_dispatch:
    inputs:
      skip_synthetic:
        description: 'Skip synthetic question generation'
        required: false
        default: 'false'
        type: boolean

jobs:
  evaluate:
    runs-on: ubuntu-latest

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Generate Prisma client
        run: cd backend && npx prisma generate

      - name: Run daily evaluation
        run: cd backend && npm run evaluate:daily
        timeout-minutes: 60

      - name: Generate markdown report
        run: |
          DATE=$(date +%Y-%m-%d)
          mkdir -p docs/quality-reports

          # Create report from database (simplified - would use actual script)
          cat > docs/quality-reports/${DATE}.md << 'REPORT'
          # Quality Report - ${DATE}

          Evaluation completed. See database for detailed scores.

          ## Summary
          - Report generated at: $(date)
          - See QualityReport table for full metrics
          REPORT

      - name: Commit report
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/quality-reports/
          git diff --staged --quiet || git commit -m "chore: daily quality report $(date +%Y-%m-%d)"
          git push || echo "Nothing to push"
```

**Step 2: Create gitkeep for reports directory**

```bash
mkdir -p docs/quality-reports
touch docs/quality-reports/.gitkeep
```

**Step 3: Commit**

```bash
git add .github/workflows/daily-quality-eval.yml docs/quality-reports/.gitkeep
git commit -m "feat(ci): add daily quality evaluation workflow

- Runs at 6 AM UTC daily
- Manual trigger supported
- Executes evaluation script
- Commits daily reports

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final Task: Push Branch and Summary

### Task F.1: Final Verification and Push

**Step 1: Run full test suite**

```bash
cd backend && npm run test
cd frontend && npm run build
```

**Step 2: Push branch**

```bash
git push -u origin feature/ai-assistant-enhancements
```

**Step 3: Create PR (optional)**

```bash
gh pr create --title "feat: AI assistant enhancements" --body "$(cat <<'EOF'
## Summary

Comprehensive AI assistant enhancements:

1. **Enterprise-Grade CLAUDE.md** - Strict engineering governance
2. **Response Modes** - Instant/Standard/Deep Think tiers
3. **Inline Agent Cards** - Expandable results in chat
4. **Automated Quality Evaluation** - Daily learning system

## Changes

- New CLAUDE.md with TDD, zero-any, and review requirements
- Response mode types and configuration
- AgentResultCard component for inline results
- Evaluation service with scoring rubrics
- Synthetic question generator
- Daily evaluation script and GitHub Action
- 60+ curated benchmark questions

## Test Plan

- [ ] Run backend tests: `cd backend && npm run test`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Test mode selector in UI
- [ ] Verify card rendering in chat
- [ ] Run evaluation script locally

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

This implementation plan covers 4 phases with 15+ tasks:

| Phase | Tasks | Files Changed |
|-------|-------|---------------|
| 1: Foundation | 3 | CLAUDE.md, schema.prisma, benchmark-questions.json |
| 2: Response Modes | 4 | anthropicClient.ts, assistantService.ts, assistantApi.ts, AssistantAgent.tsx |
| 3: Agent Cards | 1 | AgentResultCard.tsx, agentCard.module.css |
| 4: Evaluation | 4 | evaluationService.ts, syntheticGenerator.ts, dailyEvaluation.ts, daily-quality-eval.yml |

Each task follows TDD with explicit:
- File paths and line numbers
- Test code to write first
- Implementation code
- Commands to run
- Commit messages
