/**
 * Seed script for JobMatchingConfig table
 * Migrates hardcoded skills, keywords, weights from job services
 */

import { PrismaClient } from '@prisma/client';

// Common tech skills (from jobMatchingService.ts line 156)
const COMMON_TECH = [
  'python', 'java', 'javascript', 'typescript', 'react', 'node', 'aws', 
  'docker', 'kubernetes', 'sql', 'mongodb', 'go', 'rust', 'c++', 'c#',
  'angular', 'vue', 'spring', 'django', 'flask', 'express', 'graphql',
  'redis', 'postgresql', 'mysql', 'elasticsearch', 'kafka', 'rabbitmq'
];

// Tech indicators (from jobMatchingService.ts line 192)
const TECH_INDICATORS = ['startup', 'tech', 'software', 'engineering', 'developer', 'engineer'];

// Seniority keywords (from jobSourceService.ts lines 358-360)
const SENIORITY_LEVELS = {
  senior: ['senior', 'sr.', 'sr', 'lead', 'principal', 'staff', 'architect', 'expert'],
  mid: ['mid', 'mid-level', 'intermediate', 'experienced'],
  junior: ['junior', 'jr.', 'jr', 'entry', 'entry-level', 'graduate', 'associate']
};

// Role words (from jobSourceService.ts line 377)
const ROLE_WORDS = [
  'developer', 'engineer', 'architect', 'programmer', 'software', 'designer',
  'analyst', 'manager', 'lead', 'specialist', 'consultant', 'coordinator'
];

// Stop words (from jobSourceService.ts line 390)
const STOP_WORDS = [
  'and', 'or', 'the', 'for', 'with', 'job', 'position', 'role', 'we', 'are',
  'looking', 'a', 'an', 'to', 'of', 'in', 'at', 'is', 'be', 'will', 'you'
];

// Job title synonyms (from jobSourceService.ts lines 339-355)
const JOB_SYNONYMS: Record<string, string[]> = {
  'software engineer': ['developer', 'programmer', 'software developer', 'swe'],
  'frontend': ['front-end', 'front end', 'ui developer', 'react developer', 'vue developer'],
  'backend': ['back-end', 'back end', 'server-side', 'api developer'],
  'fullstack': ['full-stack', 'full stack', 'frontend and backend'],
  'devops': ['dev ops', 'sre', 'site reliability', 'platform engineer', 'infrastructure'],
  'data engineer': ['data pipeline', 'etl developer', 'data platform'],
  'data scientist': ['ml engineer', 'machine learning', 'ai engineer'],
  'mobile': ['ios developer', 'android developer', 'react native', 'flutter']
};

// Scoring weights (from jobMatchingService.ts various lines)
const SCORING_WEIGHTS = {
  skillMatchWeight: 50,
  roleBonus: 25,
  seniorityBonus: 15,
  techIndicatorBonus: 10,
  maxScore: 100,
  defaultThreshold: 75
};

// Company size ranges (from jobSourceService.ts lines 248-252)
const SIZE_RANGES = {
  startup: { min: 1, max: 50 },
  midsize: { min: 51, max: 500 },
  enterprise: { min: 501, max: 100000 }
};

export async function seedJobMatchingConfig(prisma: PrismaClient): Promise<number> {
  let count = 0;

  // Seed common tech skills
  await prisma.jobMatchingConfig.upsert({
    where: {
      configType_key: {
        configType: 'skill',
        key: 'common_tech'
      }
    },
    update: { value: COMMON_TECH },
    create: {
      configType: 'skill',
      key: 'common_tech',
      value: COMMON_TECH,
      description: 'Common technology skills for matching',
      isActive: true,
      priority: 100
    }
  });
  count++;

  // Seed tech indicators
  await prisma.jobMatchingConfig.upsert({
    where: {
      configType_key: {
        configType: 'skill',
        key: 'tech_indicators'
      }
    },
    update: { value: TECH_INDICATORS },
    create: {
      configType: 'skill',
      key: 'tech_indicators',
      value: TECH_INDICATORS,
      description: 'Keywords indicating a tech company',
      isActive: true,
      priority: 100
    }
  });
  count++;

  // Seed seniority levels
  for (const [level, keywords] of Object.entries(SENIORITY_LEVELS)) {
    await prisma.jobMatchingConfig.upsert({
      where: {
        configType_key: {
          configType: 'seniority',
          key: level
        }
      },
      update: { value: keywords },
      create: {
        configType: 'seniority',
        key: level,
        value: keywords,
        description: `Keywords for ${level} level positions`,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed role words
  await prisma.jobMatchingConfig.upsert({
    where: {
      configType_key: {
        configType: 'role_word',
        key: 'common'
      }
    },
    update: { value: ROLE_WORDS },
    create: {
      configType: 'role_word',
      key: 'common',
      value: ROLE_WORDS,
      description: 'Common role/title words',
      isActive: true,
      priority: 100
    }
  });
  count++;

  // Seed stop words
  await prisma.jobMatchingConfig.upsert({
    where: {
      configType_key: {
        configType: 'stop_word',
        key: 'common'
      }
    },
    update: { value: STOP_WORDS },
    create: {
      configType: 'stop_word',
      key: 'common',
      value: STOP_WORDS,
      description: 'Stop words to ignore in job matching',
      isActive: true,
      priority: 100
    }
  });
  count++;

  // Seed job synonyms
  for (const [term, synonyms] of Object.entries(JOB_SYNONYMS)) {
    const key = term.replace(/\s+/g, '_');
    await prisma.jobMatchingConfig.upsert({
      where: {
        configType_key: {
          configType: 'synonym',
          key
        }
      },
      update: { value: { term, synonyms } },
      create: {
        configType: 'synonym',
        key,
        value: { term, synonyms },
        description: `Synonyms for "${term}"`,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed scoring weights
  for (const [weight, value] of Object.entries(SCORING_WEIGHTS)) {
    await prisma.jobMatchingConfig.upsert({
      where: {
        configType_key: {
          configType: 'weight',
          key: weight
        }
      },
      update: { value },
      create: {
        configType: 'weight',
        key: weight,
        value,
        description: `Scoring weight: ${weight}`,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  // Seed company size ranges
  for (const [size, range] of Object.entries(SIZE_RANGES)) {
    await prisma.jobMatchingConfig.upsert({
      where: {
        configType_key: {
          configType: 'threshold',
          key: `company_size_${size}`
        }
      },
      update: { value: range },
      create: {
        configType: 'threshold',
        key: `company_size_${size}`,
        value: range,
        description: `Employee count range for ${size} companies`,
        isActive: true,
        priority: 100
      }
    });
    count++;
  }

  return count;
}
