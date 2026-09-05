-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "attributeScopes" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "attributeScopes" JSONB;
