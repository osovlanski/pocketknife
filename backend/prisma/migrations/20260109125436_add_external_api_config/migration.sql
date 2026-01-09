-- CreateTable
CREATE TABLE "ExternalApiConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKeyEnvVar" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" TIMESTAMP(3),
    "lastError" TEXT,
    "rateLimit" INTEGER,
    "rateLimitPeriod" TEXT,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "usageResetAt" TIMESTAMP(3),
    "description" TEXT,
    "docsUrl" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "authType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalApiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApiConfig_name_key" ON "ExternalApiConfig"("name");

-- CreateIndex
CREATE INDEX "ExternalApiConfig_category_isEnabled_idx" ON "ExternalApiConfig"("category", "isEnabled");

-- CreateIndex
CREATE INDEX "ExternalApiConfig_name_idx" ON "ExternalApiConfig"("name");
