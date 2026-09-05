-- AlterTable
ALTER TABLE "OrgSettings" ADD COLUMN     "approvalMode" TEXT NOT NULL DEFAULT 'auto';

-- CreateTable
CREATE TABLE "AccessApproval" (
    "id" TEXT NOT NULL,
    "downloadRequestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedByEmail" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRule" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessApproval_downloadRequestId_key" ON "AccessApproval"("downloadRequestId");

-- CreateIndex
CREATE INDEX "AccessApproval_status_idx" ON "AccessApproval"("status");

-- CreateIndex
CREATE INDEX "AccessApproval_createdAt_idx" ON "AccessApproval"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRule_domain_key" ON "AccessRule"("domain");

-- AddForeignKey
ALTER TABLE "AccessApproval" ADD CONSTRAINT "AccessApproval_downloadRequestId_fkey" FOREIGN KEY ("downloadRequestId") REFERENCES "DownloadRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
