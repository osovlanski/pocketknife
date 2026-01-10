// Prisma configuration for migrations and client generation
// Works in both local (with .env) and Docker (with container env vars)

// Only load dotenv if available and not in production container
try {
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
} catch {
  // dotenv not available, using container environment variables
}

import { defineConfig } from "prisma/config";

// Ensure DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')));
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl || '',
  },
});
