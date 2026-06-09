-- CreateEnum
CREATE TYPE "ProblemProcessingStatus" AS ENUM ('DRAFT', 'EXTRACTING', 'MATCHING', 'ANALYZING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchEngine" AS ENUM ('MATCHMAKING', 'SUTRA');

-- CreateEnum
CREATE TYPE "MatchResultStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "AIAgentType" AS ENUM ('REQUIREMENT_EXTRACTOR', 'TECHNOLOGY_DISCOVERY', 'INDUSTRY_FIT', 'COMPLIANCE_ADVISOR', 'COMMERCIALIZATION_ADVISOR', 'CITATION_VERIFIER', 'MATCHMAKING', 'COPILOT');

-- CreateEnum
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "FitLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- AlterTable
ALTER TABLE "ProblemStatement" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastPipelineError" TEXT,
ADD COLUMN     "processingStatus" "ProblemProcessingStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "IndustryRequirement" (
    "id" TEXT NOT NULL,
    "problemStatementId" TEXT NOT NULL,
    "companyId" TEXT,
    "domain" TEXT,
    "subDomain" TEXT,
    "problemStatement" TEXT,
    "technologyNeeded" TEXT,
    "keywords" TEXT[],
    "requiredTrl" INTEGER,
    "deploymentScale" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IndustryRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPaper" (
    "id" TEXT NOT NULL,
    "seedRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subDomain" TEXT,
    "abstract" TEXT,
    "authors" TEXT,
    "doi" TEXT,
    "year" INTEGER,
    "venue" TEXT,
    "citationCount" INTEGER,
    "externalSource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "problemStatementId" TEXT NOT NULL,
    "engine" "MatchEngine" NOT NULL DEFAULT 'MATCHMAKING',
    "status" "MatchResultStatus" NOT NULL DEFAULT 'COMPLETE',
    "topN" INTEGER NOT NULL DEFAULT 10,
    "model" TEXT,
    "problemText" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchMatch" (
    "id" TEXT NOT NULL,
    "matchResultId" TEXT NOT NULL,
    "researchPaperId" TEXT NOT NULL,
    "cosine" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "whyItFits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnologyRecommendation" (
    "id" TEXT NOT NULL,
    "problemStatementId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "matchScore" DOUBLE PRECISION,
    "matchReasons" TEXT[],
    "trl" INTEGER,
    "patentStatus" TEXT,
    "manufacturingReadiness" TEXT,
    "licenseAvailability" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TechnologyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnologyFitEvaluation" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "fitLevel" "FitLevel" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT[],
    "risks" TEXT[],
    "confidence" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TechnologyFitEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceReport" (
    "id" TEXT NOT NULL,
    "problemStatementId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "technologyName" TEXT,
    "requiredCerts" TEXT[],
    "missingCerts" TEXT[],
    "approvalStatus" TEXT,
    "recommendations" TEXT[],
    "regulators" TEXT[],
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercializationReport" (
    "id" TEXT NOT NULL,
    "problemStatementId" TEXT NOT NULL,
    "technologyName" TEXT,
    "licenseType" TEXT,
    "techTransferTimeline" TEXT,
    "marketReadiness" TEXT,
    "readinessScore" INTEGER,
    "roadmap" JSONB,
    "quickLicense" BOOLEAN NOT NULL DEFAULT false,
    "patentBuyout" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommercializationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitationVerification" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "verifiedAnswer" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "domain" TEXT,
    "subDomain" TEXT,
    "sources" JSONB,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CitationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgentExecution" (
    "id" TEXT NOT NULL,
    "agent" "AIAgentType" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "actorId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "latencyMs" INTEGER,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "title" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CopilotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndustryRequirement_problemStatementId_key" ON "IndustryRequirement"("problemStatementId");

-- CreateIndex
CREATE INDEX "IndustryRequirement_companyId_idx" ON "IndustryRequirement"("companyId");

-- CreateIndex
CREATE INDEX "IndustryRequirement_deletedAt_idx" ON "IndustryRequirement"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchPaper_seedRef_key" ON "ResearchPaper"("seedRef");

-- CreateIndex
CREATE INDEX "ResearchPaper_subDomain_idx" ON "ResearchPaper"("subDomain");

-- CreateIndex
CREATE INDEX "MatchResult_problemStatementId_createdAt_idx" ON "MatchResult"("problemStatementId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchResult_deletedAt_idx" ON "MatchResult"("deletedAt");

-- CreateIndex
CREATE INDEX "ResearchMatch_matchResultId_rank_idx" ON "ResearchMatch"("matchResultId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchMatch_matchResultId_researchPaperId_key" ON "ResearchMatch"("matchResultId", "researchPaperId");

-- CreateIndex
CREATE INDEX "TechnologyRecommendation_problemStatementId_idx" ON "TechnologyRecommendation"("problemStatementId");

-- CreateIndex
CREATE INDEX "TechnologyRecommendation_deletedAt_idx" ON "TechnologyRecommendation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyFitEvaluation_recommendationId_key" ON "TechnologyFitEvaluation"("recommendationId");

-- CreateIndex
CREATE INDEX "ComplianceReport_problemStatementId_idx" ON "ComplianceReport"("problemStatementId");

-- CreateIndex
CREATE INDEX "ComplianceReport_deletedAt_idx" ON "ComplianceReport"("deletedAt");

-- CreateIndex
CREATE INDEX "CommercializationReport_problemStatementId_idx" ON "CommercializationReport"("problemStatementId");

-- CreateIndex
CREATE INDEX "CommercializationReport_deletedAt_idx" ON "CommercializationReport"("deletedAt");

-- CreateIndex
CREATE INDEX "CitationVerification_relatedType_relatedId_idx" ON "CitationVerification"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "CitationVerification_deletedAt_idx" ON "CitationVerification"("deletedAt");

-- CreateIndex
CREATE INDEX "AIAgentExecution_agent_createdAt_idx" ON "AIAgentExecution"("agent", "createdAt");

-- CreateIndex
CREATE INDEX "AIAgentExecution_actorId_createdAt_idx" ON "AIAgentExecution"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAgentExecution_relatedType_relatedId_idx" ON "AIAgentExecution"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "CopilotSession_userId_lastMessageAt_idx" ON "CopilotSession"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CopilotSession_deletedAt_idx" ON "CopilotSession"("deletedAt");

-- CreateIndex
CREATE INDEX "Conversation_sessionId_createdAt_idx" ON "Conversation"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemStatement_processingStatus_idx" ON "ProblemStatement"("processingStatus");

-- CreateIndex
CREATE INDEX "ProblemStatement_deletedAt_idx" ON "ProblemStatement"("deletedAt");

-- AddForeignKey
ALTER TABLE "IndustryRequirement" ADD CONSTRAINT "IndustryRequirement_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryRequirement" ADD CONSTRAINT "IndustryRequirement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMatch" ADD CONSTRAINT "ResearchMatch_matchResultId_fkey" FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMatch" ADD CONSTRAINT "ResearchMatch_researchPaperId_fkey" FOREIGN KEY ("researchPaperId") REFERENCES "ResearchPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyRecommendation" ADD CONSTRAINT "TechnologyRecommendation_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyFitEvaluation" ADD CONSTRAINT "TechnologyFitEvaluation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "TechnologyRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReport" ADD CONSTRAINT "ComplianceReport_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReport" ADD CONSTRAINT "ComplianceReport_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "TechnologyRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercializationReport" ADD CONSTRAINT "CommercializationReport_problemStatementId_fkey" FOREIGN KEY ("problemStatementId") REFERENCES "ProblemStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgentExecution" ADD CONSTRAINT "AIAgentExecution_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotSession" ADD CONSTRAINT "CopilotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CopilotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

