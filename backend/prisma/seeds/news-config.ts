/**
 * Seed script for NewsConfig table
 * Migrates hardcoded topic/source mappings from newsService.ts
 */

import { PrismaClient } from '@prisma/client';

// Reddit subreddits by topic (from newsService.ts lines 147-156)
const REDDIT_SUBREDDITS: Record<string, string[]> = {
  tech: ['technology', 'programming', 'gadgets', 'webdev'],
  business: ['business', 'entrepreneur', 'smallbusiness', 'economics'],
  politics: ['politics', 'worldnews', 'news', 'geopolitics'],
  sports: ['sports', 'nfl', 'nba', 'soccer', 'baseball', 'hockey'],
  science: ['science', 'space', 'physics', 'biology', 'chemistry'],
  health: ['health', 'fitness', 'nutrition', 'medicine'],
  entertainment: ['entertainment', 'movies', 'music', 'television', 'gaming'],
  money: ['personalfinance', 'investing', 'stocks', 'cryptocurrency', 'wallstreetbets']
};

// NewsAPI category mappings (from newsService.ts lines 159-169)
const NEWSAPI_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'general',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

// GNews topic mappings (from newsService.ts lines 172-182)
const GNEWS_TOPICS: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'world',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

// MediaStack category mappings (from newsService.ts lines 185-195)
const MEDIASTACK_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'general',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'business'
};

// CurrentsAPI category mappings (from newsService.ts lines 198-208)
const CURRENTSAPI_CATEGORIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  business: 'business',
  politics: 'politics',
  sports: 'sports',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  money: 'finance'
};

// Topic-source mapping (from newsService.ts lines 216-225)
const TOPIC_SOURCE_MAPPING: Record<string, string[]> = {
  tech: ['hackernews', 'reddit', 'lobsters', 'devto', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  business: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  politics: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  sports: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  science: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  health: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  entertainment: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi'],
  money: ['reddit', 'newsapi', 'gnews', 'mediastack', 'currentsapi']
};

// Topic keyword mappings (from newsService.ts lines 129-138)
const TOPIC_MAPPINGS: Record<string, string[]> = {
  tech: ['technology', 'programming', 'startups', 'ai', 'software'],
  business: ['business', 'finance', 'economy', 'markets', 'investing'],
  politics: ['politics', 'government', 'elections', 'policy'],
  sports: ['sports', 'football', 'basketball', 'soccer', 'tennis'],
  science: ['science', 'research', 'space', 'physics', 'biology'],
  health: ['health', 'medicine', 'fitness', 'wellness'],
  entertainment: ['entertainment', 'movies', 'music', 'gaming', 'celebrities'],
  money: ['finance', 'crypto', 'stocks', 'investing', 'economy']
};

export async function seedNewsConfig(prisma: PrismaClient): Promise<number> {
  let count = 0;

  // Seed Reddit subreddits
  for (const [topic, subreddits] of Object.entries(REDDIT_SUBREDDITS)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'subreddit',
          sourceKey: topic,
          targetSource: 'reddit'
        }
      },
      update: {
        metadata: { subreddits },
        targetValue: subreddits[0]
      },
      create: {
        configType: 'subreddit',
        sourceKey: topic,
        targetSource: 'reddit',
        targetValue: subreddits[0],
        metadata: { subreddits },
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed NewsAPI category mappings
  for (const [topic, category] of Object.entries(NEWSAPI_CATEGORIES)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'api_category',
          sourceKey: topic,
          targetSource: 'newsapi'
        }
      },
      update: { targetValue: category },
      create: {
        configType: 'api_category',
        sourceKey: topic,
        targetSource: 'newsapi',
        targetValue: category,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed GNews topic mappings
  for (const [topic, gnewsTopic] of Object.entries(GNEWS_TOPICS)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'api_category',
          sourceKey: topic,
          targetSource: 'gnews'
        }
      },
      update: { targetValue: gnewsTopic },
      create: {
        configType: 'api_category',
        sourceKey: topic,
        targetSource: 'gnews',
        targetValue: gnewsTopic,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed MediaStack category mappings
  for (const [topic, category] of Object.entries(MEDIASTACK_CATEGORIES)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'api_category',
          sourceKey: topic,
          targetSource: 'mediastack'
        }
      },
      update: { targetValue: category },
      create: {
        configType: 'api_category',
        sourceKey: topic,
        targetSource: 'mediastack',
        targetValue: category,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed CurrentsAPI category mappings
  for (const [topic, category] of Object.entries(CURRENTSAPI_CATEGORIES)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'api_category',
          sourceKey: topic,
          targetSource: 'currentsapi'
        }
      },
      update: { targetValue: category },
      create: {
        configType: 'api_category',
        sourceKey: topic,
        targetSource: 'currentsapi',
        targetValue: category,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed topic-source mappings
  for (const [topic, sources] of Object.entries(TOPIC_SOURCE_MAPPING)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'source_mapping',
          sourceKey: topic,
          targetSource: 'all'
        }
      },
      update: {
        metadata: { sources },
        targetValue: sources.join(',')
      },
      create: {
        configType: 'source_mapping',
        sourceKey: topic,
        targetSource: 'all',
        targetValue: sources.join(','),
        metadata: { sources },
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed topic keyword mappings
  for (const [topic, keywords] of Object.entries(TOPIC_MAPPINGS)) {
    await prisma.newsConfig.upsert({
      where: {
        configType_sourceKey_targetSource: {
          configType: 'topic_mapping',
          sourceKey: topic,
          targetSource: 'keywords'
        }
      },
      update: {
        metadata: { keywords },
        targetValue: keywords.join(',')
      },
      create: {
        configType: 'topic_mapping',
        sourceKey: topic,
        targetSource: 'keywords',
        targetValue: keywords.join(','),
        metadata: { keywords },
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed tech-only sources config
  await prisma.newsConfig.upsert({
    where: {
      configType_sourceKey_targetSource: {
        configType: 'source_mapping',
        sourceKey: 'tech_only',
        targetSource: 'all'
      }
    },
    update: {
      metadata: { sources: ['hackernews', 'lobsters', 'devto'] },
      targetValue: 'hackernews,lobsters,devto'
    },
    create: {
      configType: 'source_mapping',
      sourceKey: 'tech_only',
      targetSource: 'all',
      targetValue: 'hackernews,lobsters,devto',
      metadata: { sources: ['hackernews', 'lobsters', 'devto'] },
      isActive: true,
      priority: 100
    }
  });
  count++;

  return count;
}
