/**
 * Database Seed Script
 * 
 * Populates the database with initial data:
 * - Default user
 * - Default preferences
 * - Sample app config
 * 
 * Run with: npm run db:seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Prisma 7 requires an adapter for direct database connections
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user
  const defaultEmail = process.env.DEFAULT_USER_EMAIL || 'default@pocketknife.local';
  
  const user = await prisma.user.upsert({
    where: { email: defaultEmail },
    update: {},
    create: {
      email: defaultEmail,
      name: 'Default User',
      preferences: {
        create: {
          preferredLanguage: 'javascript',
          preferredJobTypes: ['Remote', 'Hybrid'],
          preferredLocations: [],
          preferredCompanies: [],
          preferredAirlines: [],
          completedLists: []
        }
      },
      emailStats: {
        create: {
          totalProcessed: 0,
          invoicesProcessed: 0,
          jobOffersFound: 0,
          spamDeleted: 0
        }
      }
    }
  });

  console.log(`✅ Created/updated user: ${user.email}`);

  // Create default app configs
  const defaultConfigs = [
    { id: 'api.rateLimit.requests', value: 100, category: 'api' },
    { id: 'api.rateLimit.windowMs', value: 60000, category: 'api' },
    { id: 'job.search.maxResults', value: 50, category: 'job' },
    { id: 'problem.search.maxResults', value: 100, category: 'problem' },
    { id: 'travel.search.maxFlights', value: 20, category: 'travel' },
    { id: 'feature.aiGeneration', value: true, category: 'feature' },
    { id: 'feature.companyEnrichment', value: true, category: 'feature' },
    { id: 'feature.activityLogging', value: true, category: 'feature' }
  ];

  for (const config of defaultConfigs) {
    await prisma.appConfig.upsert({
      where: { id: config.id },
      update: { value: config.value, category: config.category },
      create: { id: config.id, value: config.value, category: config.category }
    });
  }

  console.log(`✅ Created ${defaultConfigs.length} app configs`);

  // Log initial activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      agent: 'system',
      action: 'database_seeded',
      details: 'Database initialized with default data',
      status: 'success'
    }
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

