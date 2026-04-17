-- CreateEnum
CREATE TYPE "public"."RecordStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."ApprovalRequest" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "public"."ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "decisionNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."Record"
ADD COLUMN "status" "public"."RecordStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "reviewerId" TEXT,
ADD COLUMN "reviewNotes" TEXT,
ADD COLUMN "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Record_reviewerId_idx" ON "public"."Record"("reviewerId");
CREATE INDEX "Record_status_idx" ON "public"."Record"("status");
CREATE INDEX "ApprovalRequest_recordId_idx" ON "public"."ApprovalRequest"("recordId");
CREATE INDEX "ApprovalRequest_reviewerId_status_idx" ON "public"."ApprovalRequest"("reviewerId", "status");
CREATE INDEX "ApprovalRequest_requestedByUserId_idx" ON "public"."ApprovalRequest"("requestedByUserId");
CREATE INDEX "ApprovalRequest_submittedAt_idx" ON "public"."ApprovalRequest"("submittedAt");

-- AddForeignKey
ALTER TABLE "public"."Record"
ADD CONSTRAINT "Record_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ApprovalRequest"
ADD CONSTRAINT "ApprovalRequest_recordId_fkey"
FOREIGN KEY ("recordId") REFERENCES "public"."Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ApprovalRequest"
ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ApprovalRequest"
ADD CONSTRAINT "ApprovalRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
