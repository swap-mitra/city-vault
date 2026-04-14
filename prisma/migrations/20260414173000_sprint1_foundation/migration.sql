-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM (
    'ORG_ADMIN',
    'RECORDS_MANAGER',
    'REVIEWER',
    'CONTRIBUTOR',
    'READ_ONLY',
    'AUDITOR'
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "membershipId" TEXT,
    "organizationId" TEXT,
    "workspaceId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."File"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "workspaceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_idx" ON "public"."Workspace"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_organizationId_slug_key" ON "public"."Workspace"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "public"."Membership"("organizationId");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_idx" ON "public"."Membership"("workspaceId");

-- CreateIndex
CREATE INDEX "Membership_userId_isDefault_idx" ON "public"."Membership"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "public"."Membership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "public"."AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_membershipId_idx" ON "public"."AuditEvent"("membershipId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_idx" ON "public"."AuditEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_idx" ON "public"."AuditEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "public"."AuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "public"."AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "File_organizationId_idx" ON "public"."File"("organizationId");

-- CreateIndex
CREATE INDEX "File_workspaceId_idx" ON "public"."File"("workspaceId");

-- AddForeignKey
ALTER TABLE "public"."Workspace"
ADD CONSTRAINT "Workspace_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File"
ADD CONSTRAINT "File_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File"
ADD CONSTRAINT "File_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
