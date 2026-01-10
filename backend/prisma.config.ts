// Prisma configuration for migrations and client generation
// Works in both local (with .env) and Docker (with container env vars)

// Load dotenv for local development
try {
  require('dotenv').config();
} catch {
  // dotenv not available in production, using container environment variables
}

import { defineConfig } from "prisma/config";

// Get DATABASE_URL from environment
// During Docker build, this won't be set - use a placeholder for prisma generate
// At runtime, the real URL will be available for migrations
const databaseUrl = process.env.DATABASE_URL;

// Only warn if we're running migrations (not during build/generate)
const isGenerating = process.argv.some(arg => arg.includes('generate'));
if (!databaseUrl && !isGenerating) {
  console.warn('⚠️ DATABASE_URL not set - migrations will fail');
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use placeholder during build, real URL at runtime
    url: databaseUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
