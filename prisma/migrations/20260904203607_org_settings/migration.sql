-- CreateTable
CREATE TABLE "OrgSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT,
    "tagline" TEXT,
    "overview" TEXT,
    "supportEmail" TEXT,
    "primaryColor" TEXT,
    "showSubprocessors" BOOLEAN NOT NULL DEFAULT true,
    "showKnowledge" BOOLEAN NOT NULL DEFAULT true,
    "showUpdates" BOOLEAN NOT NULL DEFAULT true,
    "grantTtlMinutes" INTEGER NOT NULL DEFAULT 15,
    "retentionNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);
