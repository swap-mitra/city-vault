-- CreateTable
CREATE TABLE "public"."Record" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "workspaceId" TEXT,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordVersion" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "cid" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_userId_idx" ON "public"."Record"("userId");

-- CreateIndex
CREATE INDEX "Record_organizationId_idx" ON "public"."Record"("organizationId");

-- CreateIndex
CREATE INDEX "Record_workspaceId_idx" ON "public"."Record"("workspaceId");

-- CreateIndex
CREATE INDEX "Record_createdAt_idx" ON "public"."Record"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecordVersion_recordId_versionNumber_key" ON "public"."RecordVersion"("recordId", "versionNumber");

-- CreateIndex
CREATE INDEX "RecordVersion_cid_idx" ON "public"."RecordVersion"("cid");

-- CreateIndex
CREATE INDEX "RecordVersion_recordId_idx" ON "public"."RecordVersion"("recordId");

-- CreateIndex
CREATE INDEX "RecordVersion_uploadedByUserId_idx" ON "public"."RecordVersion"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "RecordVersion_uploadedAt_idx" ON "public"."RecordVersion"("uploadedAt");

-- AddForeignKey
ALTER TABLE "public"."Record" ADD CONSTRAINT "Record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Record" ADD CONSTRAINT "Record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Record" ADD CONSTRAINT "Record_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordVersion" ADD CONSTRAINT "RecordVersion_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordVersion" ADD CONSTRAINT "RecordVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill records from the legacy File table
INSERT INTO "public"."Record" (
    "id",
    "title",
    "description",
    "createdAt",
    "updatedAt",
    "userId",
    "organizationId",
    "workspaceId"
)
SELECT
    "id",
    "filename",
    NULL,
    "uploadedAt",
    CURRENT_TIMESTAMP,
    "userId",
    "organizationId",
    "workspaceId"
FROM "public"."File"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."RecordVersion" (
    "id",
    "recordId",
    "versionNumber",
    "cid",
    "originalFilename",
    "fileSize",
    "mimeType",
    "uploadedByUserId",
    "uploadedAt"
)
SELECT
    CONCAT("id", '_v1'),
    "id",
    1,
    "cid",
    "filename",
    "fileSize",
    "mimeType",
    "userId",
    "uploadedAt"
FROM "public"."File"
ON CONFLICT ("id") DO NOTHING;
