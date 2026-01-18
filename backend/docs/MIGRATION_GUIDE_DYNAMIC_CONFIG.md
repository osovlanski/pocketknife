# Dynamic Configuration Migration Guide

This document provides a comprehensive migration plan for externalizing hardcoded values from the Pocketknife codebase to dynamic configuration sources.

## Table of Contents

1. [Overview](#overview)
2. [Migration Categories](#migration-categories)
3. [Phase 1: Config Service Migration](#phase-1-config-service-migration)
4. [Phase 2: Rule Engine Migration](#phase-2-rule-engine-migration)
5. [Phase 3: Feature Flags Migration](#phase-3-feature-flags-migration)
6. [Database Migration Script](#database-migration-script)
7. [Deployment Steps](#deployment-steps)
8. [Rollback Plan](#rollback-plan)

---

## Overview

### Problem Statement

The codebase contains numerous hardcoded values that should be externalized for:
- **Runtime configurability** without code deployment
- **A/B testing** and gradual feature rollouts
- **Environment-specific** configurations
- **Business rule flexibility**

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Agents     │  │   Services   │  │     Controllers      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Configuration Layer                         ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ ││
│  │  │ configSvc  │  │ ruleEngine │  │  featureFlagService    │ ││
│  │  │ (runtime)  │  │  (BL rules)│  │  (toggles & rollouts)  │ ││
│  │  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────────┘ ││
│  │        │               │                     │               ││
│  └────────┼───────────────┼─────────────────────┼───────────────┘│
│           ▼               ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                                │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │  AppConfig │  │BusinessRule│  │     FeatureFlag        │ │ │
│  │  │   (DB)     │  │   (DB)     │  │       (DB/Flipt)       │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Categories

### Category 1: Simple Values → ConfigService

Values that are static numbers, strings, or simple structures that rarely change.

| Value Type | Examples | Destination |
|------------|----------|-------------|
| Rate limits | Requests/minute, timeout ms | configService |
| Query limits | `take: 100`, `maxResults: 50` | configService |
| AI token limits | `maxTokens: 1500` | configService |
| API endpoints | Base URLs, webhook URLs | configService |
| Cache TTLs | `ttlSeconds: 3600` | configService |

### Category 2: Business Rules → Rule Engine

Complex conditional logic that may need to change based on business requirements.

| Rule Type | Examples | Destination |
|-----------|----------|-------------|
| Scoring algorithms | Deal score thresholds, match scoring | ruleEngineService |
| Filtering logic | Content filtering, relevance filtering | ruleEngineService |
| Notification triggers | Alert conditions, digest rules | ruleEngineService |
| Pricing rules | Discount calculations, price comparisons | ruleEngineService |

### Category 3: Feature Toggles → Feature Flags

On/off toggles and gradual rollouts.

| Feature Type | Examples | Destination |
|--------------|----------|-------------|
| Feature toggles | AI generation, Israeli shops | featureFlagService |
| Gradual rollouts | New agent features | featureFlagService |
| A/B tests | UI variations, algorithm versions | featureFlagService |
| Kill switches | Emergency disable for features | featureFlagService |

---

## Phase 1: Config Service Migration

### Completed Migrations

The following hardcoded values have been migrated to `configService`:

#### AbstractAgent (base class)
```typescript
// BEFORE
constructor(config?: AgentConfig) {
  this.config = {
    rateLimit: config?.rateLimit || 60,           // ❌ Hardcoded
    defaultTimeoutMs: config?.defaultTimeoutMs || 30000,
    circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
    // ...
  };
}

// AFTER
constructor(config?: AgentConfig) {
  const defaultRateLimit = configService.get('agent.default.rateLimit', 60);
  const defaultTimeoutMs = configService.get('agent.default.timeoutMs', 30000);
  // ...
}
```

#### JobsAgent
```typescript
// BEFORE
constructor(config?: AgentConfig) {
  super({
    rateLimit: 30,
    defaultTimeoutMs: 60000,
    actionTimeouts: {
      'extract-interview-questions': 120000,
      'evaluate-system-design': 90000,
    }
  });
}

// AFTER
constructor(config?: AgentConfig) {
  super({
    rateLimit: configService.get('jobs.agent.rateLimit', 30),
    defaultTimeoutMs: configService.get('jobs.agent.timeoutMs', 60000),
    actionTimeouts: {
      'extract-interview-questions': configService.get('jobs.action.extractQuestions.timeoutMs', 120000),
      'evaluate-system-design': configService.get('jobs.action.evaluateDesign.timeoutMs', 90000),
    }
  });
}
```

#### ShoppingAgent
```typescript
// BEFORE
const sourcesToSearch = sources || ['ebay', 'aliexpress', 'amazon'];
const deals = await prisma.product.findMany({ take: 20 });

// AFTER
const defaultSources = configService.get('shopping.search.defaultSources', ['ebay', 'aliexpress', 'amazon']);
const maxDeals = configService.get('shopping.deals.maxResults', 20);
```

### New Config Keys Added

```typescript
// Agent defaults
'agent.default.rateLimit': 60,
'agent.default.timeoutMs': 30000,
'agent.default.retryMaxAttempts': 3,
'agent.default.retryInitialDelayMs': 1000,
'agent.default.retryMaxDelayMs': 30000,
'agent.default.retryBackoffMultiplier': 2,
'agent.default.circuitBreakerThreshold': 5,
'agent.default.circuitBreakerResetMs': 60000,
'agent.default.historyLimit': 50,

// Jobs agent
'jobs.agent.rateLimit': 30,
'jobs.agent.timeoutMs': 60000,
'jobs.action.extractQuestions.timeoutMs': 120000,
'jobs.action.evaluateDesign.timeoutMs': 90000,
'jobs.action.generateAnswer.timeoutMs': 45000,
'jobs.agent.circuitBreakerThreshold': 3,
'jobs.saved.maxResults': 100,

// Shopping agent
'shopping.search.defaultSources': ['ebay', 'aliexpress', 'amazon'],
'shopping.deals.maxResults': 20,
'shopping.interests.maxResults': 10,
'shopping.searches.maxResults': 5,
'shopping.ai.dealScoringMaxTokens': 1500,
'shopping.feature.israeliShopsDefault': true,

// News agent
'news.feed.defaultMaxResults': 20,
'news.saved.maxResults': 50,
'news.preferences.minWeightThreshold': 0.4,
'news.preferences.maxTopicsToUse': 5,
'news.trends.maxResults': 10,

// Cache TTLs
'cache.flights.ttlSeconds': 1800,
'cache.locations.ttlSeconds': 86400,
'cache.products.ttlSeconds': 1800,
// ... more in configService.ts

// Rule Engine
'ruleEngine.evaluation.maxRulesPerRequest': 100,
'ruleEngine.evaluation.timeoutMs': 5000,
'ruleEngine.cache.ttlSeconds': 300,
'ruleEngine.audit.enabled': true,

// Feature Flags
'feature.featureFlags.enabled': true,
'feature.featureFlags.flipt.enabled': false,
'feature.featureFlags.flipt.url': 'http://localhost:8080',
'feature.featureFlags.cacheSeconds': 60,
```

### Remaining Migrations (TODO)

The following files still have hardcoded values that should be migrated:

```bash
# Run this to find remaining hardcoded values:
grep -r "take: [0-9]" backend/src/agents --include="*.ts"
grep -r "maxTokens: [0-9]" backend/src/services --include="*.ts"
grep -r "timeout.*[0-9]{4,}" backend/src/services --include="*.ts"
```

---

## Phase 2: Rule Engine Migration

### Database Schema

New tables added to `schema.prisma`:

```prisma
model BusinessRule {
  id          String   @id @default(uuid())
  name        String
  description String?  @db.Text
  category    String   // agent_config, scoring, filtering, etc.
  conditions  Json     // RuleConditionGroup
  actions     Json     // RuleAction[]
  priority    Int      @default(100)
  enabled     Boolean  @default(true)
  startDate   DateTime?
  endDate     DateTime?
  daysOfWeek  Int[]
  timezone    String?  @default("UTC")
  version     Int      @default(1)
  tags        String[]
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  ruleSetId   String?
  ruleSet     RuleSet? @relation(...)
  auditLogs   RuleAuditLog[]
}

model RuleSet {
  id              String   @id @default(uuid())
  name            String
  description     String?
  category        String
  stopOnFirstMatch Boolean @default(false)
  defaultAction    Json?
  enabled          Boolean @default(true)
  rules       BusinessRule[]
}

model RuleAuditLog {
  id          String   @id @default(uuid())
  action      String   // create, update, delete, evaluate
  previousState Json?
  newState      Json?
  context       Json?
  result        Json?
  userId      String?
  timestamp   DateTime @default(now())
  ruleId      String?
  rule        BusinessRule? @relation(...)
}
```

### Example Rule Definitions

```typescript
// Deal Scoring Rule
const dealScoringRule: Rule = {
  id: 'deal-score-excellent',
  name: 'Excellent Deal Threshold',
  category: 'scoring',
  priority: 10,
  enabled: true,
  conditions: {
    operator: 'and',
    conditions: [
      { field: 'data.discount', operator: 'gte', value: 50 },
      { field: 'data.price', operator: 'lt', value: 100 }
    ]
  },
  actions: [
    { type: 'set_value', target: 'data.dealScore', value: 95 },
    { type: 'set_value', target: 'data.dealReason', value: 'Exceptional discount on affordable item' }
  ]
};

// Job Match Rule
const jobMatchRule: Rule = {
  id: 'job-match-senior',
  name: 'Senior Role Match Boost',
  category: 'scoring',
  priority: 20,
  enabled: true,
  conditions: {
    operator: 'and',
    conditions: [
      { field: 'data.experienceLevel', operator: 'eq', value: 'senior' },
      { field: 'data.skills', operator: 'contains', value: 'leadership' }
    ]
  },
  actions: [
    { type: 'multiply', target: 'data.matchScore', value: 1.2 }
  ]
};
```

### Usage in Services

```typescript
import { ruleEngineService } from '../services/rules';

// In shopping service
async function scoreDeal(product: Product): Promise<Product> {
  const context: RuleContext = {
    agentId: 'shopping',
    action: 'score-deal',
    data: {
      price: product.price,
      discount: product.discount,
      category: product.category
    }
  };

  const result = await ruleEngineService.evaluate(context, 'scoring');
  
  return {
    ...product,
    dealScore: result.finalContext.data.dealScore as number,
    dealReason: result.finalContext.data.dealReason as string
  };
}
```

---

## Phase 3: Feature Flags Migration

### Database Schema

```prisma
model FeatureFlag {
  id          String   @id @default(uuid())
  key         String   @unique
  name        String
  description String?  @db.Text
  enabled     Boolean  @default(false)
  targetingRules Json?
  variants    Json?
  defaultVariant String? @default("control")
  startDate   DateTime?
  endDate     DateTime?
  tags        String[]
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Example Feature Flags

```typescript
// Simple toggle
const aiGenerationFlag: FeatureFlag = {
  id: 'ff-ai-generation',
  key: 'ai_generation_enabled',
  name: 'AI Content Generation',
  description: 'Enable AI-powered content generation across agents',
  enabled: true
};

// Percentage rollout
const newSearchAlgorithm: FeatureFlag = {
  id: 'ff-new-search',
  key: 'new_search_algorithm_v2',
  name: 'New Search Algorithm V2',
  enabled: true,
  targetingRules: [
    {
      id: 'beta-users',
      priority: 1,
      conditions: [
        { attribute: 'email', operator: 'ends_with', value: '@company.com' }
      ],
      percentage: 100 // 100% of internal users
    },
    {
      id: 'gradual-rollout',
      priority: 2,
      conditions: [],
      percentage: 10 // 10% of all other users
    }
  ]
};

// A/B Test with variants
const uiVariantTest: FeatureFlag = {
  id: 'ff-ui-ab-test',
  key: 'dashboard_layout_test',
  name: 'Dashboard Layout A/B Test',
  enabled: true,
  variants: [
    { key: 'control', name: 'Original Layout', weight: 50, payload: { layout: 'classic' } },
    { key: 'treatment', name: 'New Layout', weight: 50, payload: { layout: 'modern' } }
  ],
  defaultVariant: 'control'
};
```

### Usage in Services

```typescript
import { featureFlagService } from '../services/featureFlags';

// Simple check
async function processEmail(email: Email): Promise<void> {
  const aiEnabled = await featureFlagService.isEnabled('ai_generation_enabled');
  
  if (aiEnabled) {
    // Use AI processing
    await aiEmailService.process(email);
  } else {
    // Use rule-based processing
    await basicEmailService.process(email);
  }
}

// With user context
async function searchProducts(userId: string, query: string): Promise<Product[]> {
  const context = {
    userId,
    attributes: { plan: 'premium' }
  };
  
  const result = await featureFlagService.evaluate('new_search_algorithm_v2', context);
  
  if (result.enabled) {
    return newSearchService.search(query);
  }
  return legacySearchService.search(query);
}

// A/B test variant
async function renderDashboard(userId: string): Promise<DashboardConfig> {
  const variant = await featureFlagService.getVariant('dashboard_layout_test', { userId });
  
  return {
    layout: variant === 'treatment' ? 'modern' : 'classic'
  };
}
```

### Flipt Integration (Optional)

For advanced feature flag management, integrate with Flipt:

1. **Install Flipt** (Docker):
```bash
docker run -d \
  -p 8080:8080 \
  -v $PWD/flipt-data:/var/opt/flipt \
  flipt/flipt:latest
```

2. **Enable in config**:
```typescript
// In .env or AppConfig
FLIPT_ENABLED=true
FLIPT_URL=http://localhost:8080
```

3. **The service automatically uses Flipt when available**:
```typescript
// featureFlagService.ts
async evaluate(key: string, context?: FlagContext): Promise<FlagEvaluationResult> {
  // Try Flipt first if enabled
  if (this.fliptClient) {
    const fliptResult = await this.evaluateWithFlipt(key, context);
    if (fliptResult) return fliptResult;
  }
  // Fall back to local database
  return await this.evaluateFromDatabase(key, context);
}
```

---

## Database Migration Script

### Step 1: Generate Prisma Migration

```bash
cd backend
npx prisma migrate dev --name add_rule_engine_and_feature_flags
```

### Step 2: Seed Initial Data

Create a seed file `backend/prisma/seeds/config-migration.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedConfigMigration() {
  // Seed initial feature flags
  const featureFlags = [
    {
      key: 'ai_generation_enabled',
      name: 'AI Content Generation',
      description: 'Enable AI-powered content generation',
      enabled: true,
      tags: ['core', 'ai']
    },
    {
      key: 'israeli_shops_enabled',
      name: 'Israeli Shops Integration',
      description: 'Enable Israeli shop search in Shopping Agent',
      enabled: true,
      tags: ['shopping', 'regional']
    },
    {
      key: 'rule_engine_enabled',
      name: 'Business Rule Engine',
      description: 'Enable dynamic business rules evaluation',
      enabled: true,
      tags: ['core', 'rules']
    }
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: flag
    });
  }

  // Seed initial business rules
  const businessRules = [
    {
      name: 'Excellent Deal Threshold',
      category: 'scoring',
      priority: 10,
      enabled: true,
      conditions: {
        operator: 'and',
        conditions: [
          { field: 'data.discount', operator: 'gte', value: 50 }
        ]
      },
      actions: [
        { type: 'set_value', target: 'data.dealScore', value: 90 }
      ],
      tags: ['shopping', 'deals']
    },
    {
      name: 'News Source Priority',
      category: 'filtering',
      priority: 20,
      enabled: true,
      conditions: {
        operator: 'or',
        conditions: [
          { field: 'data.source', operator: 'eq', value: 'hackernews' },
          { field: 'data.source', operator: 'eq', value: 'reddit' }
        ]
      },
      actions: [
        { type: 'multiply', target: 'data.relevanceScore', value: 1.5 }
      ],
      tags: ['news', 'ranking']
    }
  ];

  for (const rule of businessRules) {
    await prisma.businessRule.create({
      data: {
        ...rule,
        conditions: rule.conditions as any,
        actions: rule.actions as any
      }
    });
  }

  console.log('Configuration migration seeded successfully');
}

seedConfigMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 3: Run Seed

```bash
npx ts-node prisma/seeds/config-migration.ts
```

---

## Deployment Steps

### Pre-Deployment Checklist

- [ ] Run Prisma migrations on staging database
- [ ] Seed initial configuration data
- [ ] Test feature flag evaluations
- [ ] Test rule engine evaluations
- [ ] Verify config service fallbacks work correctly
- [ ] Update environment variables if needed

### Deployment Order

1. **Deploy Database Changes**
   ```bash
   npx prisma migrate deploy
   ```

2. **Deploy Backend with New Services**
   - Rule engine service
   - Feature flag service
   - Updated config service

3. **Seed Initial Data**
   ```bash
   npx ts-node prisma/seeds/config-migration.ts
   ```

4. **Verify Services**
   ```bash
   # Health check
   curl http://localhost:3001/api/health
   
   # Test feature flag
   curl http://localhost:3001/api/feature-flags/ai_generation_enabled/evaluate
   ```

5. **Deploy Frontend** (if applicable)

### Post-Deployment Verification

```bash
# Check rule engine
curl -X POST http://localhost:3001/api/rules/evaluate \
  -H "Content-Type: application/json" \
  -d '{"category": "scoring", "context": {"data": {"discount": 60}}}'

# Check feature flags
curl http://localhost:3001/api/feature-flags
```

---

## Rollback Plan

### If Issues Occur

1. **Disable Feature Flags**
   ```sql
   UPDATE "FeatureFlag" SET enabled = false WHERE key = 'problematic_feature';
   ```

2. **Disable Business Rules**
   ```sql
   UPDATE "BusinessRule" SET enabled = false WHERE category = 'problematic_category';
   ```

3. **Revert to Previous Config Values**
   - Config service has default fallbacks built-in
   - All new config keys have sensible defaults

4. **Full Rollback**
   ```bash
   # Revert migration
   npx prisma migrate resolve --rolled-back add_rule_engine_and_feature_flags
   
   # Deploy previous version
   git checkout <previous-tag>
   npm run build
   npm run deploy
   ```

---

## Appendix: Identified Hardcoded Values

### Complete List of Migrated Values

| File | Original Value | Config Key | Status |
|------|---------------|------------|--------|
| AbstractAgent.ts | `rateLimit: 60` | `agent.default.rateLimit` | ✅ |
| AbstractAgent.ts | `defaultTimeoutMs: 30000` | `agent.default.timeoutMs` | ✅ |
| AbstractAgent.ts | `circuitBreakerThreshold: 5` | `agent.default.circuitBreakerThreshold` | ✅ |
| AbstractAgent.ts | `maxRetries: 3` | `agent.default.retryMaxAttempts` | ✅ |
| JobsAgent.ts | `rateLimit: 30` | `jobs.agent.rateLimit` | ✅ |
| JobsAgent.ts | `defaultTimeoutMs: 60000` | `jobs.agent.timeoutMs` | ✅ |
| JobsAgent.ts | `take: 100` | `jobs.saved.maxResults` | ✅ |
| ShoppingAgent.ts | `['ebay', 'aliexpress', 'amazon']` | `shopping.search.defaultSources` | ✅ |
| ShoppingAgent.ts | `take: 20` | `shopping.deals.maxResults` | ✅ |
| productAggregatorService.ts | `maxTokens: 1500` | `shopping.ai.dealScoringMaxTokens` | ✅ |
| emailPatternService.ts | `maxTokens: 1500` | `email.ai.maxTokens` | ✅ |
| cookingService.ts | `maxTokens: 2000` | `cooking.ai.maxTokens` | ✅ |
| zapScraperService.ts | `maxTokens: 2500` | `shopping.ai.maxTokens` | ✅ |
| israeliShopsService.ts | `maxTokens: 2000` | `shopping.ai.maxTokens` | ✅ |

### Remaining Values (Future Migration)

Run this command to find remaining hardcoded values:

```bash
# Find hardcoded take limits
grep -rn "take: [0-9]" backend/src --include="*.ts" | grep -v "node_modules"

# Find hardcoded timeout values
grep -rn "timeout.*[0-9]{4,}" backend/src --include="*.ts" | grep -v "node_modules"

# Find hardcoded API URLs
grep -rn "https://" backend/src --include="*.ts" | grep -v "node_modules" | grep -v ".d.ts"
```

---

## Summary

This migration provides:

1. **ConfigService** - Runtime configuration for simple values
2. **RuleEngine** - Dynamic business logic evaluation
3. **FeatureFlagService** - Feature toggles and gradual rollouts

All services are:
- Cached for performance
- Database-backed for persistence
- Audited for compliance
- Fallback-enabled for reliability

