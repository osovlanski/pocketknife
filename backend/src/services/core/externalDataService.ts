/**
 * External Data Service
 * 
 * Unified service for managing external data sources:
 * - Communities (Telegram, Discord, Facebook, Newsletters)
 * - Learning Resources (YouTube channels, Courses)
 * - Search Site Configs (Google CSE sites per agent)
 * - External Stores (E-commerce sites)
 * 
 * This service provides CRUD operations and migration utilities
 * for data-driven architecture.
 */

import { getPrisma } from './databaseService';

/**
 * Get Prisma client or throw if not available
 */
const getPrismaOrThrow = () => {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not initialized');
  }
  return prisma;
};

// Type aliases for cleaner code
type CommunityType = 'TELEGRAM' | 'DISCORD' | 'FACEBOOK' | 'NEWSLETTER' | 'JOBBOARD' | 'RSS' | 'SLACK';
type CommunityStatus = 'ACTIVE' | 'INACTIVE' | 'INVALID' | 'PENDING';
type LearningResourceType = 'YOUTUBE_CHANNEL' | 'YOUTUBE_PLAYLIST' | 'COURSE_PLATFORM' | 'TUTORIAL_SITE' | 'DOCUMENTATION' | 'BLOG' | 'PODCAST';
type LearningResourceStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'PENDING';
type AgentType = 'SHOPPING' | 'TRAVEL' | 'LEARNING' | 'PROBLEMS' | 'JOBS' | 'NEWS' | 'COOKING' | 'DIY' | 'GENERAL';
type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'SCRAPER_BROKEN' | 'PENDING';

// =============================================================================
// EXTERNAL COMMUNITY OPERATIONS
// =============================================================================

interface CreateCommunityInput {
  name: string;
  type: CommunityType;
  identifier: string;
  url?: string;
  description?: string;
  focus?: string[];
  language?: string;
  country?: string;
  discoverySource?: string;
}

interface CommunitySearchOptions {
  type?: CommunityType;
  status?: CommunityStatus;
  focus?: string;
  country?: string;
  limit?: number;
}

export const communityService = {
  /**
   * Create a new community
   */
  async create(input: CreateCommunityInput) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);
    
    return (getPrismaOrThrow() as any).externalCommunity.create({
      data: {
        name: input.name,
        slug,
        type: input.type,
        identifier: input.identifier,
        url: input.url,
        description: input.description,
        focus: input.focus || [],
        language: input.language || 'en',
        country: input.country,
        discoverySource: input.discoverySource || 'manual',
        status: 'PENDING'
      }
    });
  },

  /**
   * Get active communities by type
   */
  async getActive(type?: CommunityType) {
    const where: any = { status: 'ACTIVE' };
    if (type) where.type = type;
    
    return (getPrismaOrThrow() as any).externalCommunity.findMany({ where });
  },

  /**
   * Search communities
   */
  async search(options: CommunitySearchOptions = {}) {
    const where: any = {};
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;
    if (options.country) where.country = options.country;
    if (options.focus) where.focus = { has: options.focus };
    
    return (getPrismaOrThrow() as any).externalCommunity.findMany({
      where,
      take: options.limit || 100
    });
  },

  /**
   * Update community
   */
  async update(id: string, data: Partial<CreateCommunityInput & { status: CommunityStatus }>) {
    return (getPrismaOrThrow() as any).externalCommunity.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  },

  /**
   * Delete community
   */
  async delete(id: string) {
    return (getPrismaOrThrow() as any).externalCommunity.delete({ where: { id } });
  },

  /**
   * Get by ID
   */
  async getById(id: string) {
    return (getPrismaOrThrow() as any).externalCommunity.findUnique({ where: { id } });
  },

  /**
   * Migrate hardcoded communities to database
   */
  async migrate(communities: Array<{
    name: string;
    type: CommunityType;
    identifier: string;
    url?: string;
    description?: string;
    focus?: string[];
  }>) {
    let count = 0;
    for (const community of communities) {
      try {
        await this.create({
          ...community,
          discoverySource: 'migration'
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') { // Ignore duplicates
          console.error(`Error migrating community ${community.name}:`, error.message);
        }
      }
    }
    console.log(`✅ Migrated ${count}/${communities.length} communities`);
    return count;
  }
};

// =============================================================================
// LEARNING RESOURCE OPERATIONS
// =============================================================================

interface CreateLearningResourceInput {
  name: string;
  type: LearningResourceType;
  externalId?: string;
  url: string;
  description?: string;
  focus?: string[];
  difficulty?: string;
  language?: string;
  creatorName?: string;
  creatorUrl?: string;
  discoverySource?: string;
}

interface LearningResourceSearchOptions {
  type?: LearningResourceType;
  status?: LearningResourceStatus;
  focus?: string;
  difficulty?: string;
  limit?: number;
}

export const learningResourceService = {
  /**
   * Create a new learning resource
   */
  async create(input: CreateLearningResourceInput) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);
    
    return (getPrismaOrThrow() as any).learningResource.create({
      data: {
        name: input.name,
        slug,
        type: input.type,
        externalId: input.externalId,
        url: input.url,
        description: input.description,
        focus: input.focus || [],
        difficulty: input.difficulty,
        language: input.language || 'en',
        creatorName: input.creatorName,
        creatorUrl: input.creatorUrl,
        discoverySource: input.discoverySource || 'manual',
        status: 'PENDING'
      }
    });
  },

  /**
   * Get active resources by type
   */
  async getActive(type?: LearningResourceType) {
    const where: any = { status: 'ACTIVE' };
    if (type) where.type = type;
    
    return (getPrismaOrThrow() as any).learningResource.findMany({
      where,
      orderBy: { qualityScore: 'desc' }
    });
  },

  /**
   * Search resources
   */
  async search(options: LearningResourceSearchOptions = {}) {
    const where: any = {};
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;
    if (options.difficulty) where.difficulty = options.difficulty;
    if (options.focus) where.focus = { has: options.focus };
    
    return (getPrismaOrThrow() as any).learningResource.findMany({
      where,
      take: options.limit || 100,
      orderBy: { qualityScore: 'desc' }
    });
  },

  /**
   * Update resource
   */
  async update(id: string, data: Partial<CreateLearningResourceInput & { status: LearningResourceStatus }>) {
    return (getPrismaOrThrow() as any).learningResource.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  },

  /**
   * Delete resource
   */
  async delete(id: string) {
    return (getPrismaOrThrow() as any).learningResource.delete({ where: { id } });
  },

  /**
   * Get by ID
   */
  async getById(id: string) {
    return (getPrismaOrThrow() as any).learningResource.findUnique({ where: { id } });
  },

  /**
   * Migrate hardcoded resources to database
   */
  async migrate(resources: Array<{
    name: string;
    type: LearningResourceType;
    externalId?: string;
    url: string;
    focus?: string[];
    creatorName?: string;
  }>) {
    let count = 0;
    for (const resource of resources) {
      try {
        await this.create({
          ...resource,
          discoverySource: 'migration'
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating resource ${resource.name}:`, error.message);
        }
      }
    }
    console.log(`✅ Migrated ${count}/${resources.length} learning resources`);
    return count;
  }
};

// =============================================================================
// SEARCH SITE CONFIG OPERATIONS
// =============================================================================

interface CreateSearchSiteInput {
  agentType: AgentType;
  domain: string;
  displayName?: string;
  searchUrlPattern?: string;
  priority?: number;
  parsePrompt?: string;
  country?: string;
}

interface SearchSiteSearchOptions {
  agentType?: AgentType;
  isActive?: boolean;
  country?: string;
  limit?: number;
}

export const searchSiteConfigService = {
  /**
   * Create a new search site config
   */
  async create(input: CreateSearchSiteInput) {
    return (getPrismaOrThrow() as any).searchSiteConfig.create({
      data: {
        agentType: input.agentType,
        domain: input.domain,
        displayName: input.displayName || input.domain,
        searchUrlPattern: input.searchUrlPattern,
        priority: input.priority || 100,
        parsePrompt: input.parsePrompt,
        country: input.country,
        isActive: true
      }
    });
  },

  /**
   * Get active sites for an agent
   */
  async getForAgent(agentType: AgentType) {
    return (getPrismaOrThrow() as any).searchSiteConfig.findMany({
      where: {
        agentType,
        isActive: true
      },
      orderBy: { priority: 'asc' }
    });
  },

  /**
   * Get all active sites
   */
  async getActive(agentType?: AgentType) {
    const where: any = { isActive: true };
    if (agentType) where.agentType = agentType;
    
    return (getPrismaOrThrow() as any).searchSiteConfig.findMany({
      where,
      orderBy: { priority: 'asc' }
    });
  },

  /**
   * Search configs
   */
  async search(options: SearchSiteSearchOptions = {}) {
    const where: any = {};
    if (options.agentType) where.agentType = options.agentType;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.country) where.country = options.country;
    
    return (getPrismaOrThrow() as any).searchSiteConfig.findMany({
      where,
      take: options.limit || 100,
      orderBy: { priority: 'asc' }
    });
  },

  /**
   * Update config
   */
  async update(id: string, data: Partial<CreateSearchSiteInput & { isActive: boolean }>) {
    return (getPrismaOrThrow() as any).searchSiteConfig.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  },

  /**
   * Delete config
   */
  async delete(id: string) {
    return (getPrismaOrThrow() as any).searchSiteConfig.delete({ where: { id } });
  },

  /**
   * Migrate hardcoded configs to database
   */
  async migrate(configs: Array<{
    agentType: AgentType;
    sites: string[];
    parsePrompt?: string;
  }>) {
    let count = 0;
    for (const config of configs) {
      for (const domain of config.sites) {
        try {
          await this.create({
            agentType: config.agentType,
            domain,
            parsePrompt: config.parsePrompt
          });
          count++;
        } catch (error: any) {
          if (error.code !== 'P2002') {
            console.error(`Error migrating site ${domain}:`, error.message);
          }
        }
      }
    }
    console.log(`✅ Migrated ${count} search site configs`);
    return count;
  }
};

// =============================================================================
// EXTERNAL STORE OPERATIONS
// =============================================================================

interface CreateStoreInput {
  name: string;
  domain: string;
  websiteUrl: string;
  searchUrlPattern?: string;
  description?: string;
  logo?: string;
  country?: string;
  currency?: string;
  categories?: string[];
  scraperType?: string;
  scraperConfig?: any;
}

interface StoreSearchOptions {
  status?: StoreStatus;
  country?: string;
  category?: string;
  limit?: number;
}

export const externalStoreService = {
  /**
   * Create a new store
   */
  async create(input: CreateStoreInput) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);
    
    return (getPrismaOrThrow() as any).externalStore.create({
      data: {
        name: input.name,
        slug,
        domain: input.domain,
        websiteUrl: input.websiteUrl,
        searchUrlPattern: input.searchUrlPattern,
        description: input.description,
        logo: input.logo,
        country: input.country,
        currency: input.currency || 'USD',
        categories: input.categories || [],
        scraperType: input.scraperType,
        scraperConfig: input.scraperConfig,
        status: 'PENDING'
      }
    });
  },

  /**
   * Get active stores
   */
  async getActive(country?: string) {
    const where: any = { status: 'ACTIVE' };
    if (country) where.country = country;
    
    return (getPrismaOrThrow() as any).externalStore.findMany({ where });
  },

  /**
   * Get by domain
   */
  async getByDomain(domain: string) {
    return (getPrismaOrThrow() as any).externalStore.findUnique({ where: { domain } });
  },

  /**
   * Search stores
   */
  async search(options: StoreSearchOptions = {}) {
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.country) where.country = options.country;
    if (options.category) where.categories = { has: options.category };
    
    return (getPrismaOrThrow() as any).externalStore.findMany({
      where,
      take: options.limit || 100
    });
  },

  /**
   * Update store
   */
  async update(id: string, data: Partial<CreateStoreInput & { status: StoreStatus }>) {
    return (getPrismaOrThrow() as any).externalStore.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  },

  /**
   * Delete store
   */
  async delete(id: string) {
    return (getPrismaOrThrow() as any).externalStore.delete({ where: { id } });
  },

  /**
   * Get by ID
   */
  async getById(id: string) {
    return (getPrismaOrThrow() as any).externalStore.findUnique({ where: { id } });
  },

  /**
   * Migrate hardcoded stores to database
   */
  async migrate(stores: Array<{
    name: string;
    domain: string;
    searchUrlPattern?: string;
    country?: string;
    currency?: string;
    categories?: string[];
  }>) {
    let count = 0;
    for (const store of stores) {
      try {
        await this.create({
          ...store,
          websiteUrl: `https://${store.domain}`
        });
        count++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error migrating store ${store.name}:`, error.message);
        }
      }
    }
    console.log(`✅ Migrated ${count}/${stores.length} stores`);
    return count;
  }
};

// =============================================================================
// STATISTICS
// =============================================================================

export const externalDataStats = {
  async getAll() {
    const [communities, resources, searchSites, stores] = await Promise.all([
      (getPrismaOrThrow() as any).externalCommunity.count(),
      (getPrismaOrThrow() as any).learningResource.count(),
      (getPrismaOrThrow() as any).searchSiteConfig.count(),
      (getPrismaOrThrow() as any).externalStore.count()
    ]);

    return {
      communities,
      learningResources: resources,
      searchSiteConfigs: searchSites,
      externalStores: stores,
      total: communities + resources + searchSites + stores
    };
  }
};

export default {
  communities: communityService,
  learningResources: learningResourceService,
  searchSites: searchSiteConfigService,
  stores: externalStoreService,
  stats: externalDataStats
};
