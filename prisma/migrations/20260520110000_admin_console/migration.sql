-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Membership"
ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "invitedAt" TIMESTAMP(3),
ADD COLUMN "addedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");
