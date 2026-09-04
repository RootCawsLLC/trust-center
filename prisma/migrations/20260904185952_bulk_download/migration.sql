-- AlterTable
ALTER TABLE "DownloadRequest" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "BulkDownload" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "documentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BulkDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BulkDownload_token_key" ON "BulkDownload"("token");
