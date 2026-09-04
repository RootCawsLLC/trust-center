-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('POLICY', 'PROCEDURE', 'AUDIT', 'CERTIFICATION', 'REPORT', 'WHITEPAPER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RequesterClass" AS ENUM ('CUSTOMER', 'LEAD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "ndaTemplateId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NdaTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NdaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockSalesforceCustomer" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "primaryDomain" TEXT NOT NULL,
    "additionalDomains" TEXT[],
    "tier" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "accountOwner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockSalesforceCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "sampleOrgName" TEXT,
    "sampleCountry" TEXT,

    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "documentCategory" "DocumentCategory" NOT NULL,
    "documentVisibility" "DocumentVisibility" NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "ndaRequired" BOOLEAN NOT NULL,
    "classification" "RequesterClass" NOT NULL,
    "matchedCustomerId" TEXT,
    "matchedCustomerName" TEXT,

    CONSTRAINT "DownloadRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NdaAcceptance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadRequestId" TEXT NOT NULL,
    "ndaTemplateId" TEXT NOT NULL,
    "ndaTemplateName" TEXT NOT NULL,
    "ndaBodyHash" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "NdaAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadGrant" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "downloadRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DownloadGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Document_visibility_idx" ON "Document"("visibility");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_isPublished_idx" ON "Document"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "MockSalesforceCustomer_primaryDomain_key" ON "MockSalesforceCustomer"("primaryDomain");

-- CreateIndex
CREATE INDEX "MockSalesforceCustomer_primaryDomain_idx" ON "MockSalesforceCustomer"("primaryDomain");

-- CreateIndex
CREATE UNIQUE INDEX "SalesLead_emailDomain_key" ON "SalesLead"("emailDomain");

-- CreateIndex
CREATE INDEX "DownloadRequest_emailDomain_idx" ON "DownloadRequest"("emailDomain");

-- CreateIndex
CREATE INDEX "DownloadRequest_createdAt_idx" ON "DownloadRequest"("createdAt");

-- CreateIndex
CREATE INDEX "DownloadRequest_classification_idx" ON "DownloadRequest"("classification");

-- CreateIndex
CREATE INDEX "DownloadRequest_documentId_idx" ON "DownloadRequest"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "NdaAcceptance_downloadRequestId_key" ON "NdaAcceptance"("downloadRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadGrant_token_key" ON "DownloadGrant"("token");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadGrant_downloadRequestId_key" ON "DownloadGrant"("downloadRequestId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ndaTemplateId_fkey" FOREIGN KEY ("ndaTemplateId") REFERENCES "NdaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadRequest" ADD CONSTRAINT "DownloadRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadRequest" ADD CONSTRAINT "DownloadRequest_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "MockSalesforceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_downloadRequestId_fkey" FOREIGN KEY ("downloadRequestId") REFERENCES "DownloadRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_ndaTemplateId_fkey" FOREIGN KEY ("ndaTemplateId") REFERENCES "NdaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadGrant" ADD CONSTRAINT "DownloadGrant_downloadRequestId_fkey" FOREIGN KEY ("downloadRequestId") REFERENCES "DownloadRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
