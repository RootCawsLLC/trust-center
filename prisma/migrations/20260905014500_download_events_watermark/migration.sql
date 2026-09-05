-- AlterTable
ALTER TABLE "OrgSettings" ADD COLUMN     "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DownloadEvent" (
    "id" TEXT NOT NULL,
    "downloadRequestId" TEXT,
    "documentId" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "emailDomain" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'single',
    "watermarked" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownloadEvent_documentId_idx" ON "DownloadEvent"("documentId");

-- CreateIndex
CREATE INDEX "DownloadEvent_createdAt_idx" ON "DownloadEvent"("createdAt");
