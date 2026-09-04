-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY[]::TEXT[];
