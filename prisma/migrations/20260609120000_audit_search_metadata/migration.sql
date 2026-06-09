-- AlterTable
ALTER TABLE "Record"
ADD COLUMN "recordType" TEXT,
ADD COLUMN "classification" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "documentNumber" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "effectiveDate" TIMESTAMP(3),
ADD COLUMN "expiryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RecordVersion"
ADD COLUMN "checksumSha256" TEXT;

-- CreateIndex
CREATE INDEX "Record_recordType_idx" ON "Record"("recordType");
CREATE INDEX "Record_classification_idx" ON "Record"("classification");
CREATE INDEX "Record_department_idx" ON "Record"("department");
CREATE INDEX "Record_documentNumber_idx" ON "Record"("documentNumber");
CREATE INDEX "Record_effectiveDate_idx" ON "Record"("effectiveDate");
CREATE INDEX "Record_expiryDate_idx" ON "Record"("expiryDate");
CREATE INDEX "RecordVersion_checksumSha256_idx" ON "RecordVersion"("checksumSha256");
