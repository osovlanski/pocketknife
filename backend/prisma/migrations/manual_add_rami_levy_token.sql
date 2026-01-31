-- Migration: Add RamiLevyToken table
-- Run this manually if automatic migration fails due to drift

-- CreateTable
CREATE TABLE IF NOT EXISTS "RamiLevyToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "ecomToken" TEXT NOT NULL,
    "cookie" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "preferredStoreId" TEXT NOT NULL DEFAULT '331',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RamiLevyToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RamiLevyToken_userId_key" ON "RamiLevyToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RamiLevyToken_userId_idx" ON "RamiLevyToken"("userId");

-- AddForeignKey (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RamiLevyToken_userId_fkey'
    ) THEN
        ALTER TABLE "RamiLevyToken" ADD CONSTRAINT "RamiLevyToken_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
