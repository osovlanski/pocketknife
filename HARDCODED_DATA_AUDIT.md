# Hardcoded Data Audit Report

> **Migration Status: PHASE 2 COMPLETE** (Updated January 23, 2026)
> - Phase 1 COMPLETED: 141 items migrated (companies to database)
> - Phase 2 COMPLETED: 85+ backend timeout/config values migrated to configService
> - Phase 3 COMPLETED: Frontend config API endpoint created
> - Remaining: Lower priority items (curated problems, travel destinations, etc.)
> - See `HARDCODED_MIGRATION_PLAN.md` for detailed migration plan

**Generated:** 2026-01-22 | **Updated:** 2026-01-23
**Branch:** `feature/hardcoded-to-config-migration`
**Purpose:** Identify hardcoded values that should be moved to database or API configuration

---

## Summary

| Priority | Category | Location | Estimated Items | Effort | Status |
|----------|----------|----------|-----------------|--------|--------|
| 🔴 HIGH | Companies (Comeet) | `comeetCareersService.ts` | ~55 companies | 4h | ✅ DONE |
| 🔴 HIGH | Companies (Israeli) | `israeliJobsService.ts` | ~50 companies | 4h | ✅ DONE |
| 🔴 HIGH | Companies (Enrichment) | `companyEnrichmentService.ts` | ~30 companies | 3h | ✅ DONE |
| 🔴 HIGH | Timeouts (40+ values) | Multiple services | 40+ values | 4h | ✅ DONE |
| 🔴 HIGH | Query Limits | Multiple services | 30+ values | 3h | ✅ DONE |
| 🔴 HIGH | News Mappings | `newsService.ts` | 8 mappings | 6h | ✅ DONE (DB seeded) |
| 🔴 HIGH | Job Matching Config | `jobMatchingService.ts` | 20+ items | 3h | ✅ DONE (DB seeded) |
| 🟠 MEDIUM | Frontend Config | Multiple components | 35+ items | 8h | ✅ DONE (API created) |
| 🟠 MEDIUM | Curated Problems | `curatedProblems.ts` | 200+ problems | 4h | ⏳ Schema ready |
| 🟠 MEDIUM | Telegram Channels | `israeliTechCommunityService.ts` | 5 channels | 2h | ⏳ Pending |
| 🟠 MEDIUM | Community Sources | `israeliTechCommunityService.ts` | 15+ sources | 2h | ⏳ Pending |
| 🟠 MEDIUM | YouTube Tech Channels | `youtubeService.ts` | 9 channels | 2h | ⏳ Pending |
| 🟠 MEDIUM | Search Site Configs | `googleSearchService.ts` | 50+ sites | 3h | ⏳ Pending |
| 🟠 MEDIUM | Israeli Shops | `israeliShopsService.ts` | 10+ stores | 2h | ⏳ Pending |
| 🟠 MEDIUM | Travel Destinations | `israelTravelService.ts` | 100+ items | 6h | ⏳ Schema ready |
| 🟠 MEDIUM | Company Profiles | `companyMappings.ts` | 50+ profiles | 4h | ⏳ Schema ready |
| 🟡 LOW | Skills/Tech Keywords | `jobMatchingService.ts` | 20+ skills | 2h | ✅ DONE (DB seeded) |
| 🟡 LOW | Cooking Categories | `cookingService.ts` | 8 categories | 1h | ⏳ Pending |
| 🟡 LOW | Diagram Templates | `diagramGenerationService.ts` | 20+ templates | 2h | ⏳ Pending |
| 🟡 LOW | Magic Numbers | Multiple files | 35+ values | 4h | ⏳ Pending |

**Total Estimated Effort: 12-17 days** (see HARDCODED_MIGRATION_PLAN.md)

---

## 🔴 HIGH PRIORITY (Completed)

### 1. Comeet Companies ✅
**File:** `backend/src/services/jobs/comeetCareersService.ts`
**Status:** Migrated to `ExternalCompany` database table
**Lines:** 77-156

```typescript
// BEFORE: Hardcoded array
private getComeetCompanies(): ComeetCompany[] {
  return [
    { name: 'Piiano', uid: 'piiano', token: 'Piiano.007', ... },
    // 55 companies
  ];
}

// AFTER: Database-first with fallback
private async getCompaniesFromDatabase(): Promise<ComeetCompany[]> {
  const dbCompanies = await prisma.externalCompany.findMany({
    where: { atsProvider: 'COMEET', status: 'ACTIVE' }
  });
  // Falls back to hardcoded list if DB is empty
}
```

### 2. Israeli Tech Companies ✅
**File:** `backend/src/services/jobs/israeliJobsService.ts`
**Status:** Added async database method with fallback
**Lines:** 29-80

### 3. Known Companies for Enrichment ✅
**File:** `backend/src/services/jobs/companyEnrichmentService.ts`
**Status:** Added database lookup with fallback
**Lines:** 330-650

---

## 🟠 MEDIUM PRIORITY (Pending)

### 4. Telegram Channels
**File:** `backend/src/services/jobs/israeliTechCommunityService.ts`
**Lines:** 56-89
**Current State:** Hardcoded array of 5 Telegram channels

```typescript
private getTelegramChannels(): TelegramChannel[] {
  return [
    { name: 'Israel High-Tech Jobs', username: 'israel_hightech_jobs', focus: ['software'] },
    { name: 'Israel Startups Jobs', username: 'israelstartupsjobs', focus: ['startups'] },
    { name: 'Israeli Cyber Jobs', username: 'israeli_cyber_jobs', focus: ['cybersecurity'] },
    { name: 'Dev Jobs IL', username: 'devjobsil', focus: ['development'] },
    { name: 'Tech Jobs Israel', username: 'techjobsisrael', focus: ['tech'] }
  ];
}
```

**Recommended Action:**
- Create `ExternalCommunity` model in Prisma schema
- Add admin endpoints for community management
- Implement discovery via Telegram API

### 5. Community Sources (Facebook, Discord, Newsletters)
**File:** `backend/src/services/jobs/israeliTechCommunityService.ts`
**Lines:** 94-160
**Current State:** Hardcoded array of 15+ sources

```typescript
private getCommunitySourcesInfo(): CommunitySource[] {
  return [
    { name: 'Startup Nation Finder', type: 'jobboard', url: '...' },
    { name: 'Israel Tech Jobs', type: 'facebook', url: '...' },
    { name: 'Israel Dev Community', type: 'discord', url: '...' },
    { name: 'Geektime Newsletter', type: 'newsletter', url: '...' },
    // 15+ sources
  ];
}
```

**Recommended Action:**
- Extend `ExternalCommunity` model to include type, URL, API config
- Add validation/verification logic
- Admin UI for managing sources

### 6. YouTube Tech Channels
**File:** `backend/src/services/learning/youtubeService.ts`
**Lines:** 265-279
**Current State:** Hardcoded array of 9 tech channels

```typescript
getRecommendedTechChannels(): { name: string; id: string; focus: string }[] {
  return [
    { name: 'Traversy Media', id: 'UC29ju8bIPH5as8OGnQzwJyA', focus: 'Web Development' },
    { name: 'Fireship', id: 'UCsBjURrPoezykLs9EqgamOA', focus: 'Modern Web & Firebase' },
    { name: 'The Coding Train', id: 'UCvjgXvBlldQHFPArL9SHjQ', focus: 'Creative Coding' },
    // 9 channels
  ];
}
```

**Recommended Action:**
- Create `LearningResource` model for channels, playlists, courses
- Store channel metadata (subscriber count, last video date)
- Allow users to add/suggest channels

### 7. Google Search Site Configurations
**File:** `backend/src/services/core/googleSearchService.ts`
**Lines:** 148-204
**Current State:** Hardcoded site lists for each agent type

```typescript
const AGENT_SEARCH_CONFIGS: Record<AgentType, { sites: string[]; description: string; parsePrompt: string }> = {
  shopping: {
    sites: ['zap.co.il', 'ksp.co.il', 'ivory.co.il', 'bug.co.il', ...], // 10 sites
  },
  travel: {
    sites: ['tripadvisor.com', 'booking.com', 'hotels.com', ...], // 9 sites
  },
  learning: {
    sites: ['dev.to', 'medium.com', 'freecodecamp.org', ...], // 12 sites
  },
  problems: {
    sites: ['leetcode.com', 'hackerrank.com', 'codewars.com', ...], // 9 sites
  },
  jobs: {
    sites: ['linkedin.com/jobs', 'indeed.com', 'glassdoor.com', ...], // 9 sites
  },
};
```

**Recommended Action:**
- Create `SearchSiteConfig` model
- Store sites per agent type with status, priority, and custom prompts
- Admin UI for managing site lists

### 8. Israeli Shops
**File:** `backend/src/services/shopping/israeliShopsService.ts`
**Lines:** 177-215
**Current State:** Hardcoded store name mappings and search URLs

```typescript
private extractStoreName(displayLink: string): string {
  const storeNames: Record<string, string> = {
    'zap.co.il': 'Zap',
    'ksp.co.il': 'KSP',
    'ivory.co.il': 'Ivory',
    'bug.co.il': 'Bug',
    'shufersal.co.il': 'Shufersal',
    // 10+ stores
  };
}

getSearchUrls(query: string): Record<string, string> {
  return {
    zap: `https://www.zap.co.il/search.aspx?keyword=${encodedQuery}`,
    ksp: `https://ksp.co.il/m_action/search/?q=${encodedQuery}`,
    // hardcoded URL patterns
  };
}
```

**Recommended Action:**
- Create `ExternalStore` model
- Store name, domain, search URL pattern, scraper config
- Enable/disable individual stores

---

## 🟡 LOW PRIORITY (Pending)

### 9. Skills and Tech Keywords
**File:** `backend/src/services/jobs/jobMatchingService.ts`
**Lines:** 156, 192

```typescript
const commonTech = ['python', 'java', 'javascript', 'typescript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'go', 'rust'];
const techIndicators = ['startup', 'tech', 'software', 'engineering', 'developer', 'engineer'];
```

**Recommended Action:** Move to `configService.get('jobs.matching.commonTech', [...])`

### 10. Job Source Service Keywords
**File:** `backend/src/services/jobs/jobSourceService.ts`
**Lines:** 328-360

```typescript
const seniorityLevels = ['senior', 'sr.', 'sr', 'lead', 'principal', 'staff', 'architect', 'expert'];
const midLevels = ['mid', 'mid-level', 'intermediate', 'experienced'];
const juniorLevels = ['junior', 'jr.', 'jr', 'entry', 'entry-level', 'graduate', 'associate'];
const roleWords = ['developer', 'engineer', 'architect', 'programmer', 'software', 'designer', 'analyst', 'manager'];
const stopWords = ['and', 'or', 'the', 'for', 'with', 'job', 'position', 'role'];
const commonSkills = ['javascript', 'typescript', 'python', 'java', 'react', ...]; // 20+ skills
```

**Recommended Action:** Move to `configService` or Rule Engine

### 11. Curated Problem Lists
**File:** `backend/src/services/problemSolving/problemSolvingService.ts`
**Lines:** 32

```typescript
export const CURATED_LISTS = ['blind75', 'neetcode150', 'grind75'] as const;
```

**Recommended Action:** Store in database with problem IDs, enable user-created lists

### 12. Cooking Categories
**File:** `backend/src/services/cooking/cookingService.ts`
**Lines:** 80+

```typescript
export const COOKING_CATEGORIES = [
  'produce', 'dairy', 'meat', 'seafood', 'frozen', 'pantry', 'beverages', 'snacks'
];
```

**Recommended Action:** Move to `configService` or database reference table

### 13. Diagram Templates
**File:** `backend/src/services/jobs/diagramGenerationService.ts`
**Lines:** 54+

```typescript
const VALID_TEMPLATES = [
  'client', 'mobile', 'load_balancer', 'network', 'api_gateway', 'shield',
  'web_server', 'globe', 'database', 'cache', 'message_queue', 'message',
  // 20+ templates
];
```

**Recommended Action:** Store in database with icons, descriptions, and categories

---

## Recommended Database Models

### ExternalCommunity (for Telegram, Discord, Facebook, Newsletters)

```prisma
model ExternalCommunity {
  id            String   @id @default(uuid())
  name          String
  type          CommunityType  // TELEGRAM, DISCORD, FACEBOOK, NEWSLETTER, JOBBOARD
  identifier    String         // Username, URL, or invite code
  url           String?
  description   String?
  focus         String[]       // ['software', 'cybersecurity', 'startups']
  isActive      Boolean  @default(true)
  lastScrapedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([type, identifier])
}

enum CommunityType {
  TELEGRAM
  DISCORD
  FACEBOOK
  NEWSLETTER
  JOBBOARD
}
```

### LearningResource (for YouTube channels, courses, tutorials)

```prisma
model LearningResource {
  id            String   @id @default(uuid())
  name          String
  type          LearningResourceType  // YOUTUBE_CHANNEL, COURSE, TUTORIAL_SITE
  externalId    String?               // Channel ID, course ID
  url           String
  focus         String[]              // ['react', 'backend', 'system-design']
  description   String?
  subscriberCount Int?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum LearningResourceType {
  YOUTUBE_CHANNEL
  COURSE_PLATFORM
  TUTORIAL_SITE
  DOCUMENTATION
}
```

### SearchSiteConfig (for Google Search site lists)

```prisma
model SearchSiteConfig {
  id            String   @id @default(uuid())
  agentType     String                // 'shopping', 'travel', 'learning', etc.
  domain        String
  displayName   String?
  priority      Int      @default(100)
  isActive      Boolean  @default(true)
  searchUrlPattern String?            // URL template for direct search
  parsePrompt   String?               // AI prompt for parsing results
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([agentType, domain])
  @@index([agentType, isActive])
}
```

---

## Migration Plan

### Phase 1: Already Completed ✅
- [x] ExternalCompany model created
- [x] Comeet companies migrated
- [x] Israeli companies fallback added
- [x] Company enrichment database lookup
- [x] Admin endpoints for company management
- [x] Discovery and enrichment services

### Phase 2: Medium Priority (Recommended Next)
- [ ] ExternalCommunity model and migration
- [ ] LearningResource model and migration
- [ ] SearchSiteConfig model and migration

### Phase 3: Low Priority
- [ ] Move keyword lists to configService
- [ ] Curated problem lists to database
- [ ] Cooking categories to config
- [ ] Diagram templates to database

---

## Admin Endpoints Needed

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `/api/admin/communities` | ExternalCommunity | Manage Telegram, Discord, Facebook sources |
| `/api/admin/learning-resources` | LearningResource | Manage YouTube channels, courses |
| `/api/admin/search-sites` | SearchSiteConfig | Manage Google Search site lists |
| `/api/admin/stores` | ExternalStore | Manage Israeli shops |

---

---

## 🔴 NEW: Hardcoded Timeouts (40+ instances)

> These should use `configService.get()` pattern

### Backend Timeouts

| File | Lines | Current Value | Recommended Config Key |
|------|-------|---------------|------------------------|
| `problemSolvingService.ts` | 230 | `timeout: 10000` | `problems.codeforces.timeoutMs` |
| `jobSourceService.ts` | 573, 695, 751 | `timeout: 15000-20000` | `jobs.api.timeoutMs` |
| `israelTechScraperService.ts` | 46, 99, 163, 226, 280, 339, 397, 447, 509, 564, 633, 684, 746 | `timeout: 15000` | `jobs.scraper.timeoutMs` |
| `externalCompanyService.ts` | 246, 344, 366, 463 | `timeout: 10000-15000` | `jobs.company.timeoutMs` |
| `companyEnrichmentService.ts` | 175, 191 | `timeout: 10000` | `jobs.enrichment.timeoutMs` |
| `googleSearchService.ts` | 389 | `timeout: 10000` | `google.search.timeoutMs` |
| `learningService.ts` | 114, 149, 190, 255, 323, 587 | `timeout: 10000-15000` | `learning.api.timeoutMs` |
| `telegramNotificationService.ts` | 64 | `timeout: 5000` | `notifications.telegram.timeoutMs` |
| `discordNotificationService.ts` | 65 | `timeout: 5000` | `notifications.discord.timeoutMs` |
| `facebookService.ts` | 66, 71 | `timeout: 5000` | `integrations.facebook.timeoutMs` |

---

## 🔴 NEW: Query Limits (30+ instances)

### Backend Limits

| File | Lines | Current Value | Recommended Config Key |
|------|-------|---------------|------------------------|
| `newsService.ts` | 1183, 1200, 1254 | `take: 10`, `maxResults: 50` | `news.defaultLimit`, `news.trendLimit` |
| `jobSourceService.ts` | 807 | `maxResults: 20` | `jobs.search.maxResults` |
| `israeliTechCommunityService.ts` | 420 | `limit: 20` | `jobs.community.limit` |
| `israelTechScraperService.ts` | 391, 503 | `limit: 30-50` | `jobs.scraper.limit` |
| `externalCompanyService.ts` | 158, 168 | `take: 50` | `jobs.company.take` |
| `cookingService.ts` | 389, 547 | `take: 10-20` | `cooking.search.limit` |
| `flightSearchService.ts` | 143, 191, 264 | `limit: 10-30` | `travel.flights.limit` |
| `productAggregatorService.ts` | 589 | `limit: 10` | `shopping.search.limit` |
| `learningService.ts` | 184 | `limit: 15` | `learning.search.limit` |
| `ToDoAgent.ts` | 325, 456, 679, 763 | `take: 5-100` | `todo.query.limit` |
| `ShoppingAgent.ts` | 719, 731, 743 | `limit: 15` | `shopping.agent.limit` |

---

## 🔴 NEW: News Service Mappings (8 mappings)

**File:** `backend/src/services/news/newsService.ts`

| Lines | Mapping Name | Description | Migration Target |
|-------|--------------|-------------|------------------|
| 129-138 | `TOPIC_MAPPINGS` | Topic to keyword mappings | `NewsConfig` table |
| 147-156 | `REDDIT_SUBREDDITS` | Reddit subreddit lists per topic | `NewsConfig` table |
| 159-169 | `NEWSAPI_CATEGORIES` | NewsAPI category mappings | `NewsConfig` table |
| 172-182 | `GNEWS_TOPICS` | GNews topic mappings | `NewsConfig` table |
| 185-195 | `MEDIASTACK_CATEGORIES` | MediaStack category mappings | `NewsConfig` table |
| 198-208 | `CURRENTSAPI_CATEGORIES` | CurrentsAPI category mappings | `NewsConfig` table |
| 216-225 | `TOPIC_SOURCE_MAPPING` | Topic to source mappings | `NewsConfig` table |
| 228 | `TECH_ONLY_SOURCES` | Tech-only source list | `NewsConfig` table |

---

## 🔴 NEW: Curated Problems (200+ problems)

**Files:**
- `backend/src/data/curatedProblems.ts`
- `backend/src/services/problemSolving/problemSolvingService.ts`

| Lines | List Name | Item Count | Migration Target |
|-------|-----------|------------|------------------|
| 23-134 | `BLIND_75` | 75 problems | `CuratedProblem` table |
| 137-195 | `NEETCODE_EXTRA` | 75 problems | `CuratedProblem` table |
| 198-203 | `GRIND_75` | 75 problems | `CuratedProblem` table |
| 628-694 | `leetcode75Problems` | Inline array | Use `CuratedProblem` table |

---

## 🟠 NEW: Travel Destinations (100+ items)

**File:** `backend/src/services/travel/israelTravelService.ts`

| Lines | Data Set | Item Count | Migration Target |
|-------|----------|------------|------------------|
| 35+ | `ISRAEL_DESTINATIONS` | 50+ destinations | `TravelDestination` table |
| 301+ | `ISRAEL_HIKING_TRAILS` | 25+ trails | `TravelDestination` table |
| 376+ | `ISRAEL_BEACHES` | 15+ beaches | `TravelDestination` table |

---

## 🟠 NEW: Company Interview Profiles (50+ profiles)

**File:** `backend/src/data/companyMappings.ts`

| Lines | Data | Item Count | Migration Target |
|-------|------|------------|------------------|
| 23-487 | `COMPANY_PROFILES` | 50+ companies | `CompanyProfile` table |

---

## 🟠 NEW: Frontend Hardcoded Arrays (35+ items)

### Dropdown Options

| File | Lines | Data | Migration Target |
|------|-------|------|------------------|
| `CompanySearchPanel.tsx` | 44-58 | `INDUSTRY_OPTIONS` (13 industries) | `/api/jobs/config` |
| `CompanySearchPanel.tsx` | 38-42 | `COMPANY_SIZE_OPTIONS` | `/api/jobs/config` |
| `travelApi.ts` | 172-209 | 8 travel config arrays | `/api/travel/config` |
| `shoppingApi.ts` | 19-29 | `SHOPPING_SOURCES` | `/api/shopping/config` |
| `problemSolvingApi.ts` | 12-27 | Categories, difficulties, languages | `/api/problems/config` |
| `newsApi.ts` | 192-215 | Topics, sources | `/api/news/config` |
| `diyApi.ts` | 22-54 | Categories, skill levels | `/api/diy/config` |
| `cookingApi.ts` | 283-308 | Categories, units | `/api/cooking/config` |

### Hardcoded URLs

| File | Lines | URL Type | Migration Target |
|------|-------|----------|------------------|
| `SkiDealsPanel.tsx` | 69-72 | Booking URLs | Config API |
| `IsraelTravelPanel.tsx` | 489, 791 | Google Maps URLs | Environment variable |
| `JobSearchPanel.tsx` | 229 | Nominatim API | Backend proxy |
| `fileParser.ts` | 54 | PDF.js CDN | Environment variable |

---

## Notes

1. **Fallback Pattern:** Always keep hardcoded fallback for database-first lookups to ensure service availability when DB is empty or unavailable.

2. **Discovery Services:** Consider implementing auto-discovery for:
   - Telegram channels (via Telegram API)
   - YouTube channels (via YouTube API recommendations)
   - New job boards (via Google Search)

3. **Validation:** Add verification methods to check if external resources are still active/valid.

4. **Cursor Rules:** The `data-driven-architecture.mdc` rule has been created to guide future development.

5. **ConfigService Pattern:** For simple values (timeouts, limits), use `configService.get('key', defaultValue)`.

6. **Database Pattern:** For complex/changing data (companies, problems, destinations), use database tables with fallback arrays.

7. **Frontend Config API:** Create unified `/api/config` endpoints to serve configuration to frontend.

---

## Related Documentation

- `HARDCODED_MIGRATION_PLAN.md` - Detailed migration plan with effort estimates
- `.cursor/rules/data-driven-architecture.mdc` - Database patterns for external data
- `.cursor/rules/dynamic-configuration.mdc` - ConfigService, Rule Engine, Feature Flags
- `backend/docs/MIGRATION_GUIDE_DYNAMIC_CONFIG.md` - Dynamic config migration guide
