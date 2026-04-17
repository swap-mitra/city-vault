-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "retentionDays" INTEGER NOT NULL,
    "organizationId" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedByUserId" TEXT NOT NULL,
    "appliedByUserEmail" TEXT,
    "releasedByUserId" TEXT,
    "releasedByUserEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Record"
    ADD COLUMN     "retentionAssignedAt" TIMESTAMP(3),
    ADD COLUMN     "retentionExpiresAt" TIMESTAMP(3),
    ADD COLUMN     "retentionPolicyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_organizationId_workspaceId_name_key" ON "RetentionPolicy"("organizationId", "workspaceId", "name");
CREATE INDEX "RetentionPolicy_organizationId_idx" ON "RetentionPolicy"("organizationId");
CREATE INDEX "RetentionPolicy_workspaceId_idx" ON "RetentionPolicy"("workspaceId");
CREATE INDEX "LegalHold_recordId_releasedAt_idx" ON "LegalHold"("recordId", "releasedAt");
CREATE INDEX "LegalHold_createdAt_idx" ON "LegalHold"("createdAt");
CREATE INDEX "Record_retentionPolicyId_idx" ON "Record"("retentionPolicyId");
CREATE INDEX "Record_retentionExpiresAt_idx" ON "Record"("retentionExpiresAt");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "RetentionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
