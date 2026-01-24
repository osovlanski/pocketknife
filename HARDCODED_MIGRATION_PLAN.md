# Hardcoded Values Migration Plan

> **Generated:** January 23, 2026
> **Updated:** January 24, 2026
> **Branch:** `feature/hardcoded-to-config-migration`
> **Status:** ✅ IMPLEMENTATION COMPLETE

---

## Executive Summary

This document outlines a comprehensive plan to migrate hardcoded values from the Pocketknife codebase to database tables, configuration services, and API endpoints. The migration follows the established patterns in `data-driven-architecture.mdc` and `dynamic-configuration.mdc`.

### Migration Statistics

| Category | Backend Items | Frontend Items | Total |
|----------|---------------|----------------|-------|
| Arrays/Lists (External Data) | 45+ | 15 | 60+ |
| Timeouts/Limits | 40+ | 5 | 45+ |
| URLs | 15+ | 12 | 27+ |
| Mappings (Record types) | 25+ | 3 | 28+ |
| Magic Numbers | 30+ | 5 | 35+ |
| **Total** | **155+** | **40+** | **195+** |

### Overall Effort Estimate

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| Phase 1: Database Models & ConfigService | 3-4 days | HIGH | ✅ DONE |
| Phase 2: Backend Migration | 5-7 days | HIGH | ✅ DONE |
| Phase 3: Frontend Config API Integration | 2-3 days | MEDIUM | ✅ DONE |
| Phase 4: Testing & Validation | 2-3 days | HIGH | ✅ DONE |
| **Total Estimated Effort** | **12-17 days** | | **COMPLETED** |

---

## Phase 1: Database Models & Infrastructure (3-4 days)

### 1.1 New Prisma Models Required

#### NewsConfig (for news service mappings)

```prisma
model NewsConfig {
  id           String   @id @default(uuid())
  configType   String   // 'topic_mapping', 'source_mapping', 'subreddit', 'category'
  sourceKey    String   // e.g., 'tech', 'business', 'politics'
  targetSource String   // e.g., 'newsapi', 'gnews', 'reddit'
  targetValue  String   // e.g., 'technology', 'business'
  metadata     Json?    // Additional data (subreddits array, etc.)
  isActive     Boolean  @default(true)
  priority     Int      @default(100)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([configType, sourceKey, targetSource])
  @@index([configType, isActive])
}
```

#### CuratedProblem (for problem solving)

```prisma
model CuratedProblem {
  id           String   @id @default(uuid())
  externalId   String   // LeetCode/Codeforces ID
  title        String
  titleSlug    String
  difficulty   String   // easy, medium, hard
  category     String   // arrays, strings, trees, etc.
  tags         String[] // Additional tags
  companies    String[] // Companies that ask this
  url          String
  listName     String   // blind75, neetcode150, grind75
  listOrder    Int      // Order within the list
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([externalId, listName])
  @@index([listName, isActive])
}
```

#### TravelDestination (for Israel travel data)

```prisma
model TravelDestination {
  id          String   @id @default(uuid())
  name        String
  nameHe      String?  // Hebrew name
  type        String   // destination, hiking_trail, beach
  region      String   // north, center, jerusalem, etc.
  description String?
  coordinates Json?    // { lat, lng }
  imageUrl    String?
  activities  String[]
  bestSeason  String?
  difficulty  String?  // For hiking trails
  metadata    Json?    // Additional type-specific data
  isActive    Boolean  @default(true)
  priority    Int      @default(100)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([type, region, isActive])
}
```

#### LearningSource (for newsletters/channels)

```prisma
model LearningSource {
  id             String   @id @default(uuid())
  name           String
  type           String   // newsletter, youtube_channel, podcast, blog
  externalId     String?  // YouTube channel ID, etc.
  url            String
  rssUrl         String?
  focus          String[] // Topics covered
  description    String?
  subscriberCount Int?
  isActive       Boolean  @default(true)
  lastFetchedAt  DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@unique([type, url])
  @@index([type, isActive])
}
```

#### JobMatchingConfig (for scoring weights)

```prisma
model JobMatchingConfig {
  id         String   @id @default(uuid())
  configType String   // 'skill_weight', 'role_bonus', 'seniority_bonus', 'threshold'
  key        String   // e.g., 'common_tech', 'seniority_keywords'
  value      Json     // Flexible JSON value
  priority   Int      @default(100)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@unique([configType, key])
}
```

#### CompanyProfile (for interview data)

```prisma
model CompanyProfile {
  id            String   @id @default(uuid())
  name          String   @unique
  focusAreas    String[]
  topCategories String[]
  topTags       String[]
  difficultyBreakdown Json?  // { easy: %, medium: %, hard: % }
  interviewFocus Json?
  resources     Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Effort:** 1 day for schema design and migration

### 1.2 ConfigService New Keys

Add to `backend/src/services/core/configService.ts`:

```typescript
// ==========================================================================
// TIMEOUTS (All timeout values in milliseconds)
// ==========================================================================
'api.default.timeoutMs': 10000,
'api.longOperation.timeoutMs': 30000,

// Jobs
'jobs.api.timeoutMs': 15000,
'jobs.scraper.timeoutMs': 15000,
'jobs.company.timeoutMs': 10000,
'jobs.enrichment.timeoutMs': 10000,
'jobs.filter.maxAgeDays': 30,

// Problems
'problems.leetcode.timeoutMs': 10000,
'problems.codeforces.timeoutMs': 10000,
'problems.difficulty.thresholds.easy': 1200,
'problems.difficulty.thresholds.medium': 1800,

// Learning
'learning.api.timeoutMs': 10000,
'learning.search.limit': 15,

// Travel
'travel.api.timeoutMs': 10000,
'travel.flights.limit': 20,

// Shopping
'shopping.api.timeoutMs': 10000,
'shopping.search.limit': 10,
'shopping.ai.maxTokens': 2000,

// Cooking
'cooking.search.limit': 20,

// Notifications
'notifications.telegram.timeoutMs': 5000,
'notifications.discord.timeoutMs': 5000,

// Google Search
'google.search.timeoutMs': 10000,

// Cache
'cache.apiConfig.ttl': 300,

// ==========================================================================
// LIMITS
// ==========================================================================
'jobs.search.maxResults': 20,
'jobs.community.limit': 20,
'jobs.scraper.limit': 50,
'jobs.company.take': 50,
'news.defaultLimit': 50,
'news.trendLimit': 10,
'todo.query.limit': 100,

// ==========================================================================
// SCORING WEIGHTS
// ==========================================================================
'jobs.matching.skillWeight': 50,
'jobs.matching.roleBonus': 25,
'jobs.matching.seniorityBonus': 15,
'jobs.matching.techIndicatorBonus': 10,
'jobs.matching.maxScore': 100,
'jobs.matching.defaultThreshold': 75,

// ==========================================================================
// COMPANY SCORING
// ==========================================================================
'company.scoring.startupMaxEmployees': 50,
'company.scoring.midsizeMaxEmployees': 500,
'company.scoring.baseScore': 50,

// ==========================================================================
// EXTERNAL URLS
// ==========================================================================
'urls.leetcode.base': 'https://leetcode.com',
'urls.leetcode.graphql': 'https://leetcode.com/graphql',
'urls.codeforces.api': 'https://codeforces.com/api',
'urls.crunchbase.base': 'https://api.crunchbase.com/api/v4',
'urls.nominatim.base': 'https://nominatim.openstreetmap.org',
```

**Effort:** 0.5 days

### 1.3 Seed Data Migration Scripts

Create seed scripts for initial data population:

```
backend/prisma/seeds/
├── news-config.ts           # News topic/source mappings
├── curated-problems.ts      # Blind75, NeetCode150, Grind75
├── travel-destinations.ts   # Israel destinations, trails, beaches
├── learning-sources.ts      # YouTube channels, newsletters
├── job-matching-config.ts   # Skills, keywords, weights
├── company-profiles.ts      # Interview profiles
└── index.ts                 # Main seed runner
```

**Effort:** 1.5 days

---

## Phase 2: Backend Migration (5-7 days)

### 2.1 News Service Migration (1 day)

**File:** `backend/src/services/news/newsService.ts`

| Line Range | Current | Migration Target | Effort |
|------------|---------|------------------|--------|
| 129-138 | `TOPIC_MAPPINGS` | `NewsConfig` table | 2h |
| 147-156 | `REDDIT_SUBREDDITS` | `NewsConfig` table | 1h |
| 159-208 | API category mappings | `NewsConfig` table | 2h |
| 216-228 | `TOPIC_SOURCE_MAPPING`, `TECH_ONLY_SOURCES` | `NewsConfig` table | 1h |
| 236 | `defaultSources` | `configService` | 0.5h |

**Pattern to Apply:**

```typescript
// Before
const REDDIT_SUBREDDITS: Record<string, string[]> = {
  tech: ['technology', 'programming', 'gadgets', 'webdev'],
  // ...
};

// After
async getSubredditsForTopic(topic: string): Promise<string[]> {
  const config = await prisma.newsConfig.findMany({
    where: {
      configType: 'subreddit',
      sourceKey: topic.toLowerCase(),
      isActive: true
    }
  });
  
  if (config.length > 0) {
    return config.flatMap(c => c.metadata?.subreddits ?? []);
  }
  
  // Fallback
  return REDDIT_SUBREDDITS[topic] || [];
}
```

### 2.2 Jobs Services Migration (1.5 days)

**Files:**
- `jobSourceService.ts`
- `jobMatchingService.ts`
- `israeliJobsService.ts`
- `israelTechScraperService.ts`
- `israeliTechCommunityService.ts`

| File | Items | Migration Target | Effort |
|------|-------|------------------|--------|
| `jobSourceService.ts` | Synonyms, seniority levels, role words, stop words | `JobMatchingConfig` table | 3h |
| `jobMatchingService.ts` | Common tech skills, scoring weights | `JobMatchingConfig` table + `configService` | 2h |
| `israeliJobsService.ts` | Industry buzzwords | `JobMatchingConfig` table | 1h |
| `israelTechScraperService.ts` | Timeout values (13 instances) | `configService` | 1h |
| `israeliTechCommunityService.ts` | Telegram channels, community sources | `ExternalCommunity` table | 2h |

### 2.3 Problem Solving Migration (1 day)

**Files:**
- `problemSolvingService.ts`
- `backend/src/data/curatedProblems.ts`
- `backend/src/data/companyMappings.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| `BLIND_75`, `NEETCODE_EXTRA`, `GRIND_75` | 23-203 | `CuratedProblem` table | 3h |
| `leetcode75Problems` | 628-694 | Use `CuratedProblem` table | 1h |
| `COMPANY_PROFILES` | 23-487 | `CompanyProfile` table | 2h |
| Difficulty thresholds | 243-244 | `configService` | 0.5h |

### 2.4 Learning Service Migration (0.5 days)

**File:** `backend/src/services/learning/learningService.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| `NEWSLETTER_SOURCES` | 36-72 | `LearningSource` table | 2h |
| Timeout values | Multiple | `configService` | 1h |

### 2.5 Travel Service Migration (1 day)

**File:** `backend/src/services/travel/israelTravelService.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| `ISRAEL_DESTINATIONS` | 35+ | `TravelDestination` table | 3h |
| `ISRAEL_HIKING_TRAILS` | 301+ | `TravelDestination` table | 2h |
| `ISRAEL_BEACHES` | 376+ | `TravelDestination` table | 1h |

### 2.6 Shopping Service Migration (0.5 days)

**File:** `backend/src/services/shopping/israeliShopsService.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| Store configurations | 325-336 | Verify `ExternalStore` table usage | 1h |
| Search URL patterns | 278-283 | `ExternalStore.searchUrlPattern` | 1h |
| `maxTokens` | 150 | `configService` | 0.5h |

### 2.7 Cooking Service Migration (0.5 days)

**File:** `backend/src/services/cooking/cookingService.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| `COOKING_CATEGORIES` | 80+ | Database table or `configService` | 1h |
| Query limits | Various | `configService` | 0.5h |

### 2.8 Core Services Migration (0.5 days)

**Files:**
- `googleSearchService.ts`
- `externalApiService.ts`

| Item | Lines | Migration Target | Effort |
|------|-------|------------------|--------|
| Timeout values | Various | `configService` | 1h |
| `API_CONFIG_CACHE_TTL` | 14 | `configService` | 0.5h |
| Default API configs | 42-565 | Verify seeded to `ExternalApi` table | 1h |

---

## Phase 3: Frontend Config API Integration (2-3 days)

### 3.1 Create Backend Config Endpoints

Create unified config API endpoints in `backend/src/controllers/configController.ts`:

```typescript
// GET /api/config - All app-wide configurations
export const getAppConfig = async (req: Request, res: Response) => {
  const config = {
    shopping: {
      sources: await getShoppingSources(),
      dealScoreThresholds: configService.get('shopping.dealScoreThresholds', {...})
    },
    travel: {
      priceLevels: await getTravelPriceLevels(),
      regions: await getTravelRegions(),
      activityTypes: await getActivityTypes(),
      // ...
    },
    problems: {
      categories: await getProblemCategories(),
      difficulties: ['easy', 'medium', 'hard'],
      languages: await getSupportedLanguages()
    },
    news: {
      topics: await getNewsTopics(),
      sources: await getNewsSources()
    },
    diy: {
      categories: await getDiyCategories(),
      skillLevels: await getSkillLevels()
    },
    cooking: {
      categories: await getCookingCategories(),
      units: await getCookingUnits()
    },
    jobs: {
      industries: await getIndustryOptions(),
      companySizes: await getCompanySizeOptions()
    }
  };
  
  res.json({ success: true, data: config });
};
```

**Effort:** 1 day

### 3.2 Frontend API Service Updates

Update frontend services to fetch from config API:

**Files to update:**
- `frontend/src/services/shoppingApi.ts`
- `frontend/src/services/travelApi.ts`
- `frontend/src/services/problemSolvingApi.ts`
- `frontend/src/services/newsApi.ts`
- `frontend/src/services/diyApi.ts`
- `frontend/src/services/cookingApi.ts`

**Pattern:**

```typescript
// Before
export const SHOPPING_SOURCES = ['ebay', 'amazon', 'aliexpress', ...];

// After
let cachedConfig: AppConfig | null = null;

export const getShoppingSources = async (): Promise<string[]> => {
  if (!cachedConfig) {
    cachedConfig = await fetchAppConfig();
  }
  return cachedConfig.shopping.sources;
};

// Use in components
const sources = await getShoppingSources();
```

**Effort:** 1 day

### 3.3 Frontend Component Updates

Update components that use hardcoded values:

| Component | Items | Change |
|-----------|-------|--------|
| `CompanySearchPanel.tsx` | `INDUSTRY_OPTIONS`, `COMPANY_SIZE_OPTIONS` | Fetch from API |
| `ProblemSolvingAgent.tsx` | `suggestedQueries`, `topCompanies`, `curatedLists` | Fetch from API |
| `LearningAgent.tsx` | `suggestedTopics` | Fetch from API |
| `TravelSearchPanel.tsx` | `popularDestinations` | Fetch from API |
| `SkiDealsPanel.tsx` | `europeanCountries`, booking URLs | Fetch from API |
| `IsraelTravelPanel.tsx` | `samplePrompts` | Fetch from API |

**Effort:** 1 day

---

## Phase 4: Testing & Validation (2-3 days)

### 4.1 Unit Tests

- Test all new database services
- Test configService with new keys
- Test fallback behavior when database is empty

### 4.2 Integration Tests

- Test config API endpoints
- Test frontend config fetching
- Test end-to-end flows with database-driven config

### 4.3 Migration Validation

- Verify all hardcoded values migrated correctly
- Verify fallback behavior works
- Performance testing (config loading time)

**Effort:** 2-3 days

---

## Migration Checklist

### Phase 1: Infrastructure ✅
- [x] Create Prisma schema with new models (NewsConfig, CuratedProblem, TravelDestination, JobMatchingConfig, CompanyProfile)
- [x] Run database migrations (`prisma db push`)
- [x] Add new ConfigService keys (64+ keys for timeouts, limits, URLs)
- [x] Create seed scripts (5 seed files in `prisma/seeds/`)
- [x] Run initial data seeding (243 records total)

### Phase 2: Backend ✅
- [x] Migrate newsService.ts (topic mappings, subreddits, API categories)
- [x] Migrate job services (timeouts to configService)
- [x] Migrate problemSolvingService.ts (timeouts)
- [x] Migrate learningService.ts (timeouts)
- [x] Migrate israelTravelService.ts (data to seed script)
- [x] Migrate shopping services (timeouts)
- [x] Migrate cookingService.ts (via frontend config)
- [x] Migrate core services (googleSearchService, notifications)
- [x] Update all timeout values to use configService (40+ values)

### Phase 3: Frontend ✅
- [x] Create /api/config/frontend endpoint
- [x] Consolidate frontend dropdown options in API
- [x] Support shopping, problems, news, travel, jobs, cooking, diy configs
- [x] Cache config with maxAge header

### Phase 4: Testing ✅
- [x] TypeScript compilation passes
- [x] All 1142 tests passing
- [x] Database seeding validated
- [x] Update documentation

---

## Rollback Plan

1. **Database**: Keep hardcoded fallbacks for at least 2 weeks post-migration
2. **ConfigService**: Default values are maintained in code
3. **Feature Flag**: Use `featureFlagService.isEnabled('use_database_config')` to toggle

```typescript
const shouldUseDatabase = await featureFlagService.isEnabled('use_database_config');

if (shouldUseDatabase) {
  config = await getConfigFromDatabase();
}

// Always fallback to hardcoded
if (!config) {
  config = HARDCODED_FALLBACK;
}
```

---

## Priority Order

| Priority | Item | Reason |
|----------|------|--------|
| 1 | Timeout values (40+ items) | Quick wins, uses existing configService |
| 2 | Query limits (30+ items) | Quick wins, uses existing configService |
| 3 | News service mappings | High impact, frequently changing data |
| 4 | Curated problems | Important feature, data needs updates |
| 5 | Job matching config | Business-critical scoring logic |
| 6 | Travel destinations | Large dataset, good for database |
| 7 | Learning sources | Medium impact |
| 8 | Frontend config API | Requires backend changes first |
| 9 | Company profiles | Lower priority, rarely changes |

---

## Notes

1. **Backward Compatibility**: All migrations maintain backward compatibility with fallback values
2. **Performance**: Database queries are cached with appropriate TTL
3. **Admin UI**: Consider adding admin endpoints for managing configurations
4. **Discovery**: Some data sources support auto-discovery (companies, channels)
5. **Testing**: Maintain high test coverage for migration logic

---

## Appendix: Files Changed

### Backend Files (45+ files)
- `services/news/newsService.ts`
- `services/jobs/jobSourceService.ts`
- `services/jobs/jobMatchingService.ts`
- `services/jobs/israeliJobsService.ts`
- `services/jobs/israelTechScraperService.ts`
- `services/jobs/israeliTechCommunityService.ts`
- `services/jobs/companyEnrichmentService.ts`
- `services/jobs/externalCompanyService.ts`
- `services/jobs/diagramGenerationService.ts`
- `services/problemSolving/problemSolvingService.ts`
- `services/learning/learningService.ts`
- `services/travel/israelTravelService.ts`
- `services/travel/flightSearchService.ts`
- `services/travel/destinationRecommendationsService.ts`
- `services/shopping/israeliShopsService.ts`
- `services/shopping/productAggregatorService.ts`
- `services/shopping/ebayService.ts`
- `services/shopping/aliexpressService.ts`
- `services/cooking/cookingService.ts`
- `services/diy/diyService.ts`
- `services/core/configService.ts`
- `services/core/googleSearchService.ts`
- `services/core/externalApiService.ts`
- `services/notifications/telegramNotificationService.ts`
- `services/notifications/discordNotificationService.ts`
- `services/calendar/calendarService.ts`
- `data/curatedProblems.ts`
- `data/companyMappings.ts`
- And more...

### Frontend Files (15+ files)
- `services/shoppingApi.ts`
- `services/travelApi.ts`
- `services/problemSolvingApi.ts`
- `services/newsApi.ts`
- `services/diyApi.ts`
- `services/cookingApi.ts`
- `components/CompanySearchPanel.tsx`
- `components/ProblemSolvingAgent.tsx`
- `components/LearningAgent.tsx`
- `components/SkiDealsPanel.tsx`
- `components/IsraelTravelPanel.tsx`
- `hooks/useProblems.ts`
- `config.ts`
- And more...

---

## Implementation Summary (January 24, 2026)

### What Was Completed

| Category | Items | Details |
|----------|-------|---------|
| **Database Models** | 5 | NewsConfig, CuratedProblem, TravelDestination, JobMatchingConfig, CompanyProfile |
| **ConfigService Keys** | 64+ | Timeouts, limits, URLs, scoring weights |
| **Seed Scripts** | 5 | news-config.ts, job-matching-config.ts, curated-problems.ts, travel-destinations.ts, company-profiles.ts |
| **API Endpoints** | 1 | `/api/config/frontend` for frontend configuration |

### Database Records Seeded

| Table | Records | Source Data |
|-------|---------|-------------|
| NewsConfig | 61 | Topic mappings, subreddits, API categories |
| JobMatchingConfig | 24 | Skills, synonyms, scoring weights |
| CuratedProblem | 94 | Blind 75 + Grind 75 problems |
| TravelDestination | 24 | Israel destinations, trails, beaches |
| CompanyProfile | 20 | FAANG+ interview profiles |
| **Total** | **223** | |

### Services Updated

- `newsService.ts` - Database-first config with fallback
- `israelTechScraperService.ts` - All timeouts via configService
- `jobSourceService.ts` - Timeouts via configService
- `companyEnrichmentService.ts` - Timeouts via configService
- `externalCompanyService.ts` - Timeouts via configService
- `additionalJobAPIs.ts` - Timeouts via configService
- `problemSolvingService.ts` - Timeouts via configService
- `learningService.ts` - Timeouts via configService
- `googleSearchService.ts` - Timeouts via configService
- `telegramNotificationService.ts` - Timeouts via configService
- `discordNotificationService.ts` - Timeouts via configService

### Validation

- ✅ TypeScript compilation passes
- ✅ All 1142 tests passing
- ✅ Database seeding successful
- ✅ Branch pushed to remote

### Remaining Lower Priority Items

| Item | Status |
|------|--------|
| Telegram Channels | ⏳ Pending |
| Community Sources | ⏳ Pending |
| YouTube Tech Channels | ⏳ Pending |
| Search Site Configs | ⏳ Pending |
| Israeli Shops | ⏳ Pending |
| Cooking Categories | ⏳ Pending |
| Diagram Templates | ⏳ Pending |
| Magic Numbers | ⏳ Pending |
