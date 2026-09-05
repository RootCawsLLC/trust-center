-- CreateTable
CREATE TABLE "TaxonomyOption" (
    "id" TEXT NOT NULL,
    "taxonomy" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxonomyOption_taxonomy_idx" ON "TaxonomyOption"("taxonomy");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyOption_taxonomy_value_key" ON "TaxonomyOption"("taxonomy", "value");
