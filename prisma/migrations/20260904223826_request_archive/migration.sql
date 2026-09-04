-- CreateTable
CREATE TABLE "RequestArchive" (
    "id" TEXT NOT NULL,
    "downloadRequestId" TEXT NOT NULL,
    "archivedById" TEXT,
    "archivedByEmail" TEXT,
    "reason" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestArchive_downloadRequestId_key" ON "RequestArchive"("downloadRequestId");
