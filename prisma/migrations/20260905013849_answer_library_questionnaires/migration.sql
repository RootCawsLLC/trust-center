-- CreateTable
CREATE TABLE "AnswerLibraryEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerEmail" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'high',
    "lastReviewedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerLibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireItem" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "draftAnswer" TEXT,
    "finalAnswer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "matchedEntryId" TEXT,
    "confidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerLibraryEntry_category_idx" ON "AnswerLibraryEntry"("category");

-- CreateIndex
CREATE INDEX "Questionnaire_createdAt_idx" ON "Questionnaire"("createdAt");

-- CreateIndex
CREATE INDEX "QuestionnaireItem_questionnaireId_idx" ON "QuestionnaireItem"("questionnaireId");

-- AddForeignKey
ALTER TABLE "QuestionnaireItem" ADD CONSTRAINT "QuestionnaireItem_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
