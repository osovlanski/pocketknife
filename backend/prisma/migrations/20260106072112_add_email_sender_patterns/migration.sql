-- CreateTable
CREATE TABLE "EmailSenderPattern" (
    "id" TEXT NOT NULL,
    "senderEmail" TEXT,
    "senderDomain" TEXT,
    "senderName" TEXT,
    "subjectPattern" TEXT,
    "category" TEXT NOT NULL,
    "customTag" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUserApproved" BOOLEAN NOT NULL DEFAULT false,
    "isAutoLearned" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSenderPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSenderPattern_senderEmail_idx" ON "EmailSenderPattern"("senderEmail");

-- CreateIndex
CREATE INDEX "EmailSenderPattern_senderDomain_idx" ON "EmailSenderPattern"("senderDomain");

-- CreateIndex
CREATE INDEX "EmailSenderPattern_category_idx" ON "EmailSenderPattern"("category");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSenderPattern_senderDomain_subjectPattern_key" ON "EmailSenderPattern"("senderDomain", "subjectPattern");
