/**
 * Seed Configuration Script
 * 
 * Populates the SystemSetting table with all configurable values.
 * Run with: npx tsx src/scripts/seedConfig.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SettingDefinition {
  id: string;
  category: string;
  name: string;
  value: unknown;
  description: string;
  isPublic: boolean;
  isEditable: boolean;
}

const SETTINGS: SettingDefinition[] = [
  // ==========================================================================
  // SHOPPING AGENT
  // ==========================================================================
  {
    id: 'shopping.dealScore.excellent',
    category: 'shopping',
    name: 'Deal Score - Excellent',
    value: 80,
    description: 'Minimum score for excellent deals (green badge)',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'shopping.dealScore.good',
    category: 'shopping',
    name: 'Deal Score - Good',
    value: 60,
    description: 'Minimum score for good deals (yellow badge)',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'shopping.dealScore.fair',
    category: 'shopping',
    name: 'Deal Score - Fair',
    value: 40,
    description: 'Minimum score for fair deals (orange badge)',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'shopping.dealScore.notifyThreshold',
    category: 'shopping',
    name: 'Deal Score - Notify Threshold',
    value: 70,
    description: 'Default minimum deal score to trigger notifications',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'shopping.search.maxResults',
    category: 'shopping',
    name: 'Max Search Results',
    value: 30,
    description: 'Maximum number of products to return per search',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // JOB AGENT
  // ==========================================================================
  {
    id: 'job.match.excellent',
    category: 'jobs',
    name: 'Match Score - Excellent',
    value: 80,
    description: 'Minimum score for excellent job matches (80%+)',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'job.match.good',
    category: 'jobs',
    name: 'Match Score - Good',
    value: 60,
    description: 'Minimum score for good job matches (60-79%)',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'job.match.streamThreshold',
    category: 'jobs',
    name: 'Stream Threshold',
    value: 75,
    description: 'Minimum match score to stream jobs to frontend in real-time',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'job.search.maxResults',
    category: 'jobs',
    name: 'Max Search Results',
    value: 50,
    description: 'Maximum number of jobs to analyze per search',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'job.enrichment.enabled',
    category: 'jobs',
    name: 'Company Enrichment',
    value: true,
    description: 'Enable fetching additional company information',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // EMAIL AGENT
  // ==========================================================================
  {
    id: 'email.batch.size',
    category: 'email',
    name: 'Batch Size',
    value: 50,
    description: 'Number of emails to process per batch',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'email.classification.confidenceThreshold',
    category: 'email',
    name: 'Classification Confidence',
    value: 0.75,
    description: 'Minimum AI confidence score for email classification (0-1)',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // PROBLEM SOLVING AGENT
  // ==========================================================================
  {
    id: 'problem.search.maxResults',
    category: 'problems',
    name: 'Max Search Results',
    value: 100,
    description: 'Maximum number of problems to return',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'problem.hints.maxCount',
    category: 'problems',
    name: 'Max Hints',
    value: 3,
    description: 'Maximum number of hints available per problem',
    isPublic: true,
    isEditable: true
  },

  // ==========================================================================
  // LEARNING AGENT
  // ==========================================================================
  {
    id: 'learning.search.maxResults',
    category: 'learning',
    name: 'Max Search Results',
    value: 15,
    description: 'Maximum number of learning resources per source',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // TRAVEL AGENT
  // ==========================================================================
  {
    id: 'travel.search.maxFlights',
    category: 'travel',
    name: 'Max Flight Results',
    value: 20,
    description: 'Maximum number of flight options to return',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'travel.search.maxHotels',
    category: 'travel',
    name: 'Max Hotel Results',
    value: 20,
    description: 'Maximum number of hotel options to return',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'travel.trip.defaultDays',
    category: 'travel',
    name: 'Default Trip Duration',
    value: 7,
    description: 'Default trip duration in days if not specified',
    isPublic: true,
    isEditable: true
  },

  // ==========================================================================
  // TODO AGENT
  // ==========================================================================
  {
    id: 'todo.task.defaultDuration',
    category: 'todo',
    name: 'Default Task Duration',
    value: 30,
    description: 'Default task duration in minutes',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'todo.calendar.syncEnabled',
    category: 'todo',
    name: 'Calendar Sync Enabled',
    value: true,
    description: 'Enable Google Calendar synchronization',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // GOOGLE SEARCH API
  // ==========================================================================
  {
    id: 'google.cse.dailyLimit',
    category: 'integrations',
    name: 'Google CSE Daily Limit',
    value: 100,
    description: 'Maximum Google Custom Search API calls per day',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // AI SETTINGS
  // ==========================================================================
  {
    id: 'ai.claude.defaultMaxTokens',
    category: 'ai',
    name: 'Default Max Tokens',
    value: 1500,
    description: 'Default maximum tokens for Claude AI responses',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'ai.claude.maxTokensLimit',
    category: 'ai',
    name: 'Max Tokens Limit',
    value: 4000,
    description: 'Maximum allowed tokens for any AI request',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // API LIMITS
  // ==========================================================================
  {
    id: 'api.rateLimit.requests',
    category: 'api',
    name: 'Rate Limit - Requests',
    value: 100,
    description: 'Maximum API requests per window',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'api.rateLimit.windowMs',
    category: 'api',
    name: 'Rate Limit - Window (ms)',
    value: 60000,
    description: 'Rate limit window duration in milliseconds',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'api.pagination.defaultLimit',
    category: 'api',
    name: 'Default Pagination Limit',
    value: 20,
    description: 'Default number of items per page',
    isPublic: true,
    isEditable: true
  },
  {
    id: 'api.pagination.maxLimit',
    category: 'api',
    name: 'Max Pagination Limit',
    value: 100,
    description: 'Maximum number of items per page',
    isPublic: false,
    isEditable: true
  },

  // ==========================================================================
  // CACHE SETTINGS
  // ==========================================================================
  {
    id: 'cache.memory.ttlSeconds',
    category: 'cache',
    name: 'Memory Cache TTL',
    value: 300,
    description: 'In-memory cache time-to-live in seconds',
    isPublic: false,
    isEditable: true
  },
  {
    id: 'cache.autocomplete.maxHistory',
    category: 'cache',
    name: 'Autocomplete History Size',
    value: 100,
    description: 'Maximum autocomplete history entries per user',
    isPublic: false,
    isEditable: true
  }
];

async function seedConfig() {
  console.log('🌱 Seeding configuration settings...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const setting of SETTINGS) {
    try {
      const existing = await prisma.systemSetting.findUnique({
        where: { id: setting.id }
      });

      if (existing) {
        // Only update if the setting was never manually edited
        // (we don't want to overwrite admin changes)
        skipped++;
        console.log(`⏭️  Skipped: ${setting.id} (already exists)`);
      } else {
        await prisma.systemSetting.create({
          data: {
            id: setting.id,
            category: setting.category,
            name: setting.name,
            value: setting.value,
            description: setting.description,
            isPublic: setting.isPublic,
            isEditable: setting.isEditable
          }
        });
        created++;
        console.log(`✅ Created: ${setting.id}`);
      }
    } catch (error: any) {
      console.error(`❌ Error seeding ${setting.id}:`, error.message);
    }
  }

  console.log('\n📊 Seed Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total:   ${SETTINGS.length}`);
}

seedConfig()
  .then(() => {
    console.log('\n✅ Configuration seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });



