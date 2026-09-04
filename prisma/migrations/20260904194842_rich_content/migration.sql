-- AlterTable
ALTER TABLE "KnowledgeArticle" ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileStorageKey" TEXT,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "bodyMarkdown" SET DEFAULT '';

-- AlterTable
ALTER TABLE "NdaTemplate" ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileStorageKey" TEXT;

-- AlterTable
ALTER TABLE "TrustUpdate" ADD COLUMN     "contentHtml" TEXT,
ALTER COLUMN "bodyMarkdown" SET DEFAULT '';
