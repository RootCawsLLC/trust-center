-- CreateTable
CREATE TABLE "SavedChart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "chartType" TEXT NOT NULL DEFAULT 'bar',
    "filters" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedChart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedChart_sortOrder_idx" ON "SavedChart"("sortOrder");
