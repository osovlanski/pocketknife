# Hardcoded Data Audit Report

> **Migration Status: COMPLETED** (January 22, 2026)
> - 141 total items migrated to database
> - 58 companies, 14 communities, 10 YouTube channels, 49 search sites, 10 stores

**Generated:** 2026-01-22
**Purpose:** Identify hardcoded values that should be moved to database or API configuration

---

## Summary

| Priority | Category | Location | Estimated Items | Effort |
|----------|----------|----------|-----------------|--------|
| 🔴 HIGH | Companies (Comeet) | `comeetCareersService.ts` | ~55 companies | ✅ DONE |
| 🔴 HIGH | Companies (Israeli) | `israeliJobsService.ts` | ~50 companies | ✅ DONE |
| 🔴 HIGH | Companies (Enrichment) | `companyEnrichmentService.ts` | ~30 companies | ✅ DONE |
| 🟠 MEDIUM | Telegram Channels | `israeliTechCommunityService.ts` | 5 channels | Pending |
| 🟠 MEDIUM | Community Sources | `israeliTechCommunityService.ts` | 15+ sources | Pending |
| 🟠 MEDIUM | YouTube Tech Channels | `youtubeService.ts` | 9 channels | Pending |
| 🟠 MEDIUM | Search Site Configs | `googleSearchService.ts` | 6 categories, 50+ sites | Pending |
| 🟠 MEDIUM | Israeli Shops | `israeliShopsService.ts` | 10+ stores | Pending |
| 🟡 LOW | Skills/Tech Keywords | `jobMatchingService.ts` | 20+ skills | Pending |
| 🟡 LOW | Curated Problem Lists | `problemSolvingService.ts` | 3 lists | Pending |
| 🟡 LOW | Cooking Categories | `cookingService.ts` | 8 categories | Pending |
| 🟡 LOW | Diagram Templates | `diagramGenerationService.ts` | 20+ templates | Pending |

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

## Notes

1. **Fallback Pattern:** Always keep hardcoded fallback for database-first lookups to ensure service availability when DB is empty or unavailable.

2. **Discovery Services:** Consider implementing auto-discovery for:
   - Telegram channels (via Telegram API)
   - YouTube channels (via YouTube API recommendations)
   - New job boards (via Google Search)

3. **Validation:** Add verification methods to check if external resources are still active/valid.

4. **Cursor Rules:** The `data-driven-architecture.mdc` rule has been created to guide future development.
