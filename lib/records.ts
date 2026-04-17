import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGatewayUrl, getPinataClient } from "@/lib/pinata";
import type { CurrentUser } from "@/current-user";
import type { AuditEventInput } from "@/lib/audit";
import { writeAuditEvent } from "@/lib/audit";
import { AuthorizationError } from "@/lib/authorization";

const reviewerSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

const retentionPolicySelect = {
  id: true,
  name: true,
  description: true,
  retentionDays: true,
};

const legalHoldSelect = {
  id: true,
  reason: true,
  appliedByUserId: true,
  appliedByUserEmail: true,
  releasedByUserId: true,
  releasedByUserEmail: true,
  createdAt: true,
  releasedAt: true,
};

const approvalRequestInclude = {
  reviewer: {
    select: reviewerSelect,
  },
  requestedBy: {
    select: reviewerSelect,
  },
} satisfies Prisma.ApprovalRequestInclude;

const recordListInclude = {
  reviewer: {
    select: reviewerSelect,
  },
  retentionPolicy: {
    select: retentionPolicySelect,
  },
  legalHolds: {
    where: {
      releasedAt: null,
    },
    select: legalHoldSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
  versions: {
    orderBy: { versionNumber: "desc" },
    take: 1,
  },
  _count: {
    select: { versions: true },
  },
} satisfies Prisma.RecordInclude;

const recordDetailInclude = {
  reviewer: {
    select: reviewerSelect,
  },
  retentionPolicy: {
    select: retentionPolicySelect,
  },
  legalHolds: {
    select: legalHoldSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
  versions: {
    orderBy: { versionNumber: "desc" },
  },
  approvalRequests: {
    include: approvalRequestInclude,
    orderBy: { submittedAt: "desc" },
  },
  _count: {
    select: { versions: true },
  },
} satisfies Prisma.RecordInclude;

type RecordListRow = Prisma.RecordGetPayload<{
  include: typeof recordListInclude;
}>;

type RecordDetailRow = Prisma.RecordGetPayload<{
  include: typeof recordDetailInclude;
}>;

type CompatibilityRow = Prisma.RecordVersionGetPayload<{
  include: {
    record: {
      include: typeof recordDetailInclude;
    };
  };
}>;

type RequestMetadata = Pick<AuditEventInput, "ipAddress" | "userAgent">;

export type ReviewerSummaryPayload = {
  id: string;
  name: string | null;
  email: string;
};

export type RetentionPolicyPayload = {
  id: string;
  name: string;
  description: string | null;
  retentionDays: number;
};

export type LegalHoldPayload = {
  id: string;
  reason: string;
  appliedByUserId: string;
  appliedByUserEmail: string | null;
  releasedByUserId: string | null;
  releasedByUserEmail: string | null;
  createdAt: string;
  releasedAt: string | null;
  isActive: boolean;
};

export type ApprovalRequestPayload = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestNotes: string | null;
  decisionNotes: string | null;
  submittedAt: string;
  decidedAt: string | null;
  reviewer: ReviewerSummaryPayload;
  requestedBy: ReviewerSummaryPayload;
};

export type RecordVersionPayload = {
  id: string;
  versionNumber: number;
  cid: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

export type RecordSummaryPayload = {
  recordId: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ARCHIVED";
  reviewNotes: string | null;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  retentionAssignedAt: string | null;
  retentionExpiresAt: string | null;
  activeHoldCount: number;
  isEligibleForDisposition: boolean;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  reviewer: ReviewerSummaryPayload | null;
  retentionPolicy: RetentionPolicyPayload | null;
  latestVersion: RecordVersionPayload;
};

export type RecordDetailPayload = RecordSummaryPayload & {
  approvalRequests: ApprovalRequestPayload[];
  legalHolds: LegalHoldPayload[];
  versions: RecordVersionPayload[];
};

export type LegacyFilePayload = {
  id: string;
  recordId: string;
  filename: string;
  cid: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

export type ReviewQueuePayload = {
  records: RecordSummaryPayload[];
};

export type GovernanceQueuePayload = {
  dueForDisposition: RecordSummaryPayload[];
  heldRecords: RecordSummaryPayload[];
  archivedRecords: RecordSummaryPayload[];
};

export class RecordConflictError extends Error {
  readonly status: number;
  readonly recordId: string;

  constructor(message: string, recordId: string, status = 409) {
    super(message);
    this.name = "RecordConflictError";
    this.status = status;
    this.recordId = recordId;
  }
}

const defaultRetentionPolicies = [
  {
    name: "Operational 30 days",
    description: "Short-lived working records retained for thirty days after approval.",
    retentionDays: 30,
  },
  {
    name: "Standard 1 year",
    description: "General business records retained for one year after approval.",
    retentionDays: 365,
  },
  {
    name: "Archive 7 years",
    description: "Long-term evidence records retained for seven years after approval.",
    retentionDays: 2555,
  },
] as const;

function hasWorkspaceContext(currentUser: CurrentUser) {
  return Boolean(currentUser.organizationId && currentUser.workspaceId);
}

function canManageAnyRecord(currentUser: CurrentUser) {
  return currentUser.role === "ORG_ADMIN" || currentUser.role === "RECORDS_MANAGER";
}

function canApproveReview(currentUser: CurrentUser, reviewerId: string | null) {
  return canManageAnyRecord(currentUser) || reviewerId === currentUser.id;
}

function ensureWorkspaceContext(currentUser: CurrentUser, recordId?: string) {
  if (!hasWorkspaceContext(currentUser)) {
    throw new RecordConflictError(
      "A workspace context is required for this governance action.",
      recordId ?? "workspace",
      400
    );
  }

  return {
    organizationId: currentUser.organizationId!,
    workspaceId: currentUser.workspaceId!,
  };
}

function buildReadableRecordScope(currentUser: CurrentUser): Prisma.RecordWhereInput {
  if (hasWorkspaceContext(currentUser)) {
    return {
      organizationId: currentUser.organizationId,
      workspaceId: currentUser.workspaceId,
    };
  }

  return {
    userId: currentUser.id,
  };
}

function buildLegacyRecordVersionScope(currentUser: CurrentUser): Prisma.RecordVersionWhereInput {
  return {
    record: buildReadableRecordScope(currentUser),
  };
}

function serializeReviewer(
  reviewer:
    | Pick<Prisma.UserGetPayload<object>, "id" | "name" | "email">
    | null
    | undefined
): ReviewerSummaryPayload | null {
  if (!reviewer) {
    return null;
  }

  return {
    id: reviewer.id,
    name: reviewer.name,
    email: reviewer.email,
  };
}

function serializeRetentionPolicy(
  retentionPolicy:
    | { id: string; name: string; description: string | null; retentionDays: number }
    | null
    | undefined
): RetentionPolicyPayload | null {
  if (!retentionPolicy) {
    return null;
  }

  return {
    id: retentionPolicy.id,
    name: retentionPolicy.name,
    description: retentionPolicy.description,
    retentionDays: retentionPolicy.retentionDays,
  };
}

function serializeLegalHold(
  legalHold: {
    id: string;
    reason: string;
    appliedByUserId: string;
    appliedByUserEmail: string | null;
    releasedByUserId: string | null;
    releasedByUserEmail: string | null;
    createdAt: Date;
    releasedAt: Date | null;
  }
): LegalHoldPayload {
  return {
    id: legalHold.id,
    reason: legalHold.reason,
    appliedByUserId: legalHold.appliedByUserId,
    appliedByUserEmail: legalHold.appliedByUserEmail,
    releasedByUserId: legalHold.releasedByUserId,
    releasedByUserEmail: legalHold.releasedByUserEmail,
    createdAt: legalHold.createdAt.toISOString(),
    releasedAt: legalHold.releasedAt?.toISOString() ?? null,
    isActive: legalHold.releasedAt === null,
  };
}

function serializeVersion(
  version: Pick<
    Prisma.RecordVersionGetPayload<object>,
    "id" | "versionNumber" | "cid" | "originalFilename" | "fileSize" | "mimeType" | "uploadedAt"
  >
): RecordVersionPayload {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    cid: version.cid,
    originalFilename: version.originalFilename,
    fileSize: version.fileSize,
    mimeType: version.mimeType,
    uploadedAt: version.uploadedAt.toISOString(),
    gatewayUrl: getGatewayUrl(version.cid),
  };
}

function serializeApprovalRequest(
  approvalRequest: Prisma.ApprovalRequestGetPayload<{
    include: typeof approvalRequestInclude;
  }>
): ApprovalRequestPayload {
  return {
    id: approvalRequest.id,
    status: approvalRequest.status,
    requestNotes: approvalRequest.requestNotes,
    decisionNotes: approvalRequest.decisionNotes,
    submittedAt: approvalRequest.submittedAt.toISOString(),
    decidedAt: approvalRequest.decidedAt?.toISOString() ?? null,
    reviewer: serializeReviewer(approvalRequest.reviewer)!,
    requestedBy: serializeReviewer(approvalRequest.requestedBy)!,
  };
}

function isEligibleForDisposition(record: {
  status: string;
  retentionExpiresAt: Date | null;
  legalHolds: Array<{ releasedAt: Date | null }>;
}) {
  if (record.status !== "ARCHIVED" || !record.retentionExpiresAt) {
    return false;
  }

  const hasActiveHold = record.legalHolds.some((hold) => hold.releasedAt === null);
  return !hasActiveHold && record.retentionExpiresAt.getTime() <= Date.now();
}

function serializeRecordSummary(record: RecordListRow): RecordSummaryPayload {
  const latestVersion = record.versions[0];

  return {
    recordId: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    reviewNotes: record.reviewNotes,
    submittedForReviewAt: record.submittedForReviewAt?.toISOString() ?? null,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    retentionAssignedAt: record.retentionAssignedAt?.toISOString() ?? null,
    retentionExpiresAt: record.retentionExpiresAt?.toISOString() ?? null,
    activeHoldCount: record.legalHolds.length,
    isEligibleForDisposition: isEligibleForDisposition(record),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    reviewer: serializeReviewer(record.reviewer),
    retentionPolicy: serializeRetentionPolicy(record.retentionPolicy),
    latestVersion: serializeVersion(latestVersion),
  };
}

function serializeRecordDetail(record: RecordDetailRow): RecordDetailPayload {
  const latestVersion = record.versions[0];
  const activeHoldCount = record.legalHolds.filter((hold) => hold.releasedAt === null).length;

  return {
    recordId: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    reviewNotes: record.reviewNotes,
    submittedForReviewAt: record.submittedForReviewAt?.toISOString() ?? null,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    retentionAssignedAt: record.retentionAssignedAt?.toISOString() ?? null,
    retentionExpiresAt: record.retentionExpiresAt?.toISOString() ?? null,
    activeHoldCount,
    isEligibleForDisposition: isEligibleForDisposition(record),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    reviewer: serializeReviewer(record.reviewer),
    retentionPolicy: serializeRetentionPolicy(record.retentionPolicy),
    latestVersion: serializeVersion(latestVersion),
    approvalRequests: record.approvalRequests.map((approvalRequest) =>
      serializeApprovalRequest(approvalRequest)
    ),
    legalHolds: record.legalHolds.map((legalHold) => serializeLegalHold(legalHold)),
    versions: record.versions.map((version) => serializeVersion(version)),
  };
}

function buildAuditActor(currentUser: CurrentUser) {
  return {
    actorId: currentUser.id,
    actorEmail: currentUser.email,
    actorName: currentUser.name,
    membershipId: currentUser.membershipId,
    organizationId: currentUser.organizationId,
    workspaceId: currentUser.workspaceId,
  };
}

function calculateRetentionExpiry(referenceDate: Date, retentionDays: number) {
  return new Date(referenceDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

function getRetentionReferenceDate(record: {
  approvedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}) {
  return record.approvedAt ?? record.archivedAt ?? record.createdAt;
}

function assertEditableRecordOwner(record: { userId: string; id: string }, currentUser: CurrentUser) {
  if (!canManageAnyRecord(currentUser) && record.userId !== currentUser.id) {
    throw new AuthorizationError(
      403,
      "Only the record owner or a records manager can change this record."
    );
  }
}

function assertDraftRecord(record: { status: string; id: string }) {
  if (record.status !== "DRAFT") {
    throw new RecordConflictError("Only draft records can be changed.", record.id);
  }
}

function assertApprovedRecord(record: { status: string; id: string }) {
  if (record.status !== "APPROVED") {
    throw new RecordConflictError("Only approved records can be archived.", record.id);
  }
}

function assertArchivedRecord(record: { status: string; id: string }) {
  if (record.status !== "ARCHIVED") {
    throw new RecordConflictError("Only archived records can be disposed.", record.id);
  }
}

function assertUnderReviewRecord(record: { status: string; id: string }) {
  if (record.status !== "UNDER_REVIEW") {
    throw new RecordConflictError("This record is not currently under review.", record.id);
  }
}

function assertNoActiveHolds(record: { id: string; legalHolds: Array<{ releasedAt: Date | null }> }, message: string) {
  if (record.legalHolds.some((hold) => hold.releasedAt === null)) {
    throw new RecordConflictError(message, record.id);
  }
}

async function ensureDefaultRetentionPolicies(currentUser: CurrentUser) {
  if (!hasWorkspaceContext(currentUser)) {
    return;
  }

  const { organizationId, workspaceId } = ensureWorkspaceContext(currentUser);
  const existingCount = await prisma.retentionPolicy.count({
    where: {
      organizationId,
      workspaceId,
    },
  });

  if (existingCount > 0) {
    return;
  }

  await prisma.retentionPolicy.createMany({
    data: defaultRetentionPolicies.map((policy) => ({
      organizationId,
      workspaceId,
      name: policy.name,
      description: policy.description,
      retentionDays: policy.retentionDays,
    })),
    skipDuplicates: true,
  });
}

async function purgeRecordAndVersions({
  record,
  currentUser,
  requestMetadata,
  auditAction,
}: {
  record: RecordDetailRow;
  currentUser: CurrentUser;
  requestMetadata: RequestMetadata;
  auditAction: "record.delete" | "record.dispose";
}) {
  const uniqueCids = [...new Set(record.versions.map((version) => version.cid))];

  await prisma.$transaction(async (tx) => {
    await tx.recordVersion.deleteMany({
      where: { recordId: record.id },
    });

    await tx.approvalRequest.deleteMany({
      where: { recordId: record.id },
    });

    await tx.legalHold.deleteMany({
      where: { recordId: record.id },
    });

    await tx.record.delete({
      where: { id: record.id },
    });
  });

  const unpinnedCids: string[] = [];

  try {
    for (const cid of uniqueCids) {
      const remainingReferences = await prisma.recordVersion.count({
        where: { cid },
      });

      if (remainingReferences === 0) {
        await getPinataClient().unpin([cid]);
        unpinnedCids.push(cid);
      }
    }
  } catch (error) {
    await prisma.record.create({
      data: {
        id: record.id,
        title: record.title,
        description: record.description,
        status: record.status,
        reviewerId: record.reviewerId,
        reviewNotes: record.reviewNotes,
        submittedForReviewAt: record.submittedForReviewAt,
        approvedAt: record.approvedAt,
        archivedAt: record.archivedAt,
        retentionPolicyId: record.retentionPolicyId,
        retentionAssignedAt: record.retentionAssignedAt,
        retentionExpiresAt: record.retentionExpiresAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        userId: record.userId,
        organizationId: record.organizationId,
        workspaceId: record.workspaceId,
        versions: {
          create: record.versions.map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            cid: version.cid,
            originalFilename: version.originalFilename,
            fileSize: version.fileSize,
            mimeType: version.mimeType,
            uploadedByUserId: version.uploadedByUserId,
            uploadedAt: version.uploadedAt,
          })),
        },
        approvalRequests: {
          create: record.approvalRequests.map((approvalRequest) => ({
            id: approvalRequest.id,
            requestedByUserId: approvalRequest.requestedByUserId,
            reviewerId: approvalRequest.reviewerId,
            status: approvalRequest.status,
            requestNotes: approvalRequest.requestNotes,
            decisionNotes: approvalRequest.decisionNotes,
            submittedAt: approvalRequest.submittedAt,
            decidedAt: approvalRequest.decidedAt,
          })),
        },
        legalHolds: {
          create: record.legalHolds.map((legalHold) => ({
            id: legalHold.id,
            reason: legalHold.reason,
            appliedByUserId: legalHold.appliedByUserId,
            appliedByUserEmail: legalHold.appliedByUserEmail,
            releasedByUserId: legalHold.releasedByUserId,
            releasedByUserEmail: legalHold.releasedByUserEmail,
            createdAt: legalHold.createdAt,
            releasedAt: legalHold.releasedAt,
          })),
        },
      },
    });

    throw error;
  }

  await writeAuditEvent({
    action: auditAction,
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: record.id,
    metadata: {
      title: record.title,
      status: record.status,
      versionCount: record._count.versions,
      unpinnedCids,
    },
    ...requestMetadata,
  });

  return {
    recordId: record.id,
    title: record.title,
    versionCount: record._count.versions,
    unpinnedCids,
  };
}

export async function listRecords(currentUser: CurrentUser, query?: string) {
  const where: Prisma.RecordWhereInput = {
    ...buildReadableRecordScope(currentUser),
  };

  if (query) {
    where.OR = [
      {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  const records = await prisma.record.findMany({
    where,
    include: recordListInclude,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return records.map((record) => serializeRecordSummary(record));
}

export async function listReviewQueue(currentUser: CurrentUser): Promise<ReviewQueuePayload> {
  const where: Prisma.RecordWhereInput = {
    ...buildReadableRecordScope(currentUser),
    status: "UNDER_REVIEW",
  };

  if (currentUser.role === "REVIEWER") {
    where.reviewerId = currentUser.id;
  } else if (!canManageAnyRecord(currentUser) && currentUser.role !== "AUDITOR") {
    where.userId = currentUser.id;
  }

  const records = await prisma.record.findMany({
    where,
    include: recordListInclude,
    orderBy: {
      submittedForReviewAt: "asc",
    },
  });

  return {
    records: records.map((record) => serializeRecordSummary(record)),
  };
}

export async function listGovernanceQueue(currentUser: CurrentUser): Promise<GovernanceQueuePayload> {
  const where: Prisma.RecordWhereInput = {
    ...buildReadableRecordScope(currentUser),
    OR: [
      { archivedAt: { not: null } },
      {
        legalHolds: {
          some: {
            releasedAt: null,
          },
        },
      },
      { retentionExpiresAt: { not: null } },
    ],
  };

  const records = await prisma.record.findMany({
    where,
    include: recordListInclude,
    orderBy: [
      { retentionExpiresAt: "asc" },
      { archivedAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const serialized = records.map((record) => serializeRecordSummary(record));

  return {
    dueForDisposition: serialized.filter((record) => record.isEligibleForDisposition),
    heldRecords: serialized.filter((record) => record.activeHoldCount > 0),
    archivedRecords: serialized.filter((record) => record.status === "ARCHIVED"),
  };
}

export async function listEligibleReviewers(currentUser: CurrentUser) {
  if (!hasWorkspaceContext(currentUser)) {
    return [];
  }

  const { organizationId, workspaceId } = ensureWorkspaceContext(currentUser);

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      workspaceId,
      role: {
        in: ["ORG_ADMIN", "RECORDS_MANAGER", "REVIEWER"],
      },
    },
    include: {
      user: {
        select: reviewerSelect,
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  return memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
  }));
}

export async function listRetentionPolicies(currentUser: CurrentUser) {
  if (!hasWorkspaceContext(currentUser)) {
    return [];
  }

  await ensureDefaultRetentionPolicies(currentUser);
  const { organizationId, workspaceId } = ensureWorkspaceContext(currentUser);

  const retentionPolicies = await prisma.retentionPolicy.findMany({
    where: {
      organizationId,
      workspaceId,
    },
    orderBy: [
      { retentionDays: "asc" },
      { name: "asc" },
    ],
  });

  return retentionPolicies.map((policy) => serializeRetentionPolicy(policy)!);
}

export async function getRecordDetail(currentUser: CurrentUser, recordId: string) {
  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  return serializeRecordDetail(record);
}

type CreateRecordInput = {
  currentUser: CurrentUser;
  title: string;
  description?: string | null;
  file: File;
  requestMetadata: RequestMetadata;
};

export async function createRecordWithInitialVersion({
  currentUser,
  title,
  description,
  file,
  requestMetadata,
}: CreateRecordInput) {
  const uploaded = await getPinataClient().upload.file(file);
  const cid = uploaded.IpfsHash;

  const createdRecord = await prisma.$transaction(async (tx) => {
    const record = await tx.record.create({
      data: {
        title,
        description: description?.trim() || null,
        status: "DRAFT",
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        workspaceId: currentUser.workspaceId,
      },
    });

    await tx.recordVersion.create({
      data: {
        recordId: record.id,
        versionNumber: 1,
        cid,
        originalFilename: file.name,
        fileSize: Number(file.size),
        mimeType: file.type || null,
        uploadedByUserId: currentUser.id,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  await writeAuditEvent({
    action: "record.create",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: createdRecord.id,
    metadata: {
      title: createdRecord.title,
      versionCount: 1,
      status: createdRecord.status,
    },
    ...requestMetadata,
  });

  const firstVersion = createdRecord.versions[0];

  await writeAuditEvent({
    action: "record.version.create",
    ...buildAuditActor(currentUser),
    targetType: "RecordVersion",
    targetId: firstVersion.id,
    metadata: {
      recordId: createdRecord.id,
      versionNumber: firstVersion.versionNumber,
      cid: firstVersion.cid,
      originalFilename: firstVersion.originalFilename,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(createdRecord);
}

type AppendVersionInput = {
  currentUser: CurrentUser;
  recordId: string;
  file: File;
  requestMetadata: RequestMetadata;
};

export async function appendRecordVersion({
  currentUser,
  recordId,
  file,
  requestMetadata,
}: AppendVersionInput) {
  const uploaded = await getPinataClient().upload.file(file);
  const cid = uploaded.IpfsHash;

  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.record.findFirst({
      where: {
        id: recordId,
        ...buildReadableRecordScope(currentUser),
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        legalHolds: {
          where: {
            releasedAt: null,
          },
          select: {
            id: true,
            releasedAt: true,
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    assertEditableRecordOwner(record, currentUser);
    assertDraftRecord(record);
    assertNoActiveHolds(record, "Records on active hold cannot be changed.");

    const nextVersionNumber = (record.versions[0]?.versionNumber ?? 0) + 1;

    await tx.recordVersion.create({
      data: {
        recordId: record.id,
        versionNumber: nextVersionNumber,
        cid,
        originalFilename: file.name,
        fileSize: Number(file.size),
        mimeType: file.type || null,
        uploadedByUserId: currentUser.id,
      },
    });

    await tx.record.update({
      where: { id: record.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  if (!result) {
    return null;
  }

  const latestVersion = result.versions[0];

  await writeAuditEvent({
    action: "record.version.create",
    ...buildAuditActor(currentUser),
    targetType: "RecordVersion",
    targetId: latestVersion.id,
    metadata: {
      recordId: result.id,
      versionNumber: latestVersion.versionNumber,
      cid: latestVersion.cid,
      originalFilename: latestVersion.originalFilename,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(result);
}

type SubmitReviewInput = {
  currentUser: CurrentUser;
  recordId: string;
  reviewerId: string;
  requestNotes?: string | null;
  requestMetadata: RequestMetadata;
};

export async function submitRecordForReview({
  currentUser,
  recordId,
  reviewerId,
  requestNotes,
  requestMetadata,
}: SubmitReviewInput) {
  const { organizationId, workspaceId } = ensureWorkspaceContext(currentUser, recordId);

  const reviewerMembership = await prisma.membership.findFirst({
    where: {
      organizationId,
      workspaceId,
      userId: reviewerId,
      role: {
        in: ["ORG_ADMIN", "RECORDS_MANAGER", "REVIEWER"],
      },
    },
    include: {
      user: {
        select: reviewerSelect,
      },
    },
  });

  if (!reviewerMembership) {
    throw new RecordConflictError(
      "Choose a reviewer who belongs to the active workspace.",
      recordId,
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.record.findFirst({
      where: {
        id: recordId,
        ...buildReadableRecordScope(currentUser),
      },
      include: recordDetailInclude,
    });

    if (!record) {
      return null;
    }

    assertEditableRecordOwner(record, currentUser);
    assertDraftRecord(record);
    assertNoActiveHolds(record, "Records on active hold cannot enter review.");

    await tx.approvalRequest.create({
      data: {
        recordId: record.id,
        requestedByUserId: currentUser.id,
        reviewerId,
        requestNotes: requestNotes?.trim() || null,
      },
    });

    await tx.record.update({
      where: { id: record.id },
      data: {
        status: "UNDER_REVIEW",
        reviewerId,
        reviewNotes: requestNotes?.trim() || null,
        submittedForReviewAt: new Date(),
        approvedAt: null,
        archivedAt: null,
        retentionExpiresAt: null,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  if (!result) {
    return null;
  }

  await writeAuditEvent({
    action: "record.review.submit",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: result.id,
    metadata: {
      reviewerId,
      reviewerEmail: reviewerMembership.user.email,
      status: result.status,
      requestNotes: requestNotes?.trim() || null,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(result);
}

type DecideReviewInput = {
  currentUser: CurrentUser;
  recordId: string;
  decisionNotes?: string | null;
  requestMetadata: RequestMetadata;
};

export async function approveRecordReview({
  currentUser,
  recordId,
  decisionNotes,
  requestMetadata,
}: DecideReviewInput) {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.record.findFirst({
      where: {
        id: recordId,
        ...buildReadableRecordScope(currentUser),
      },
      include: recordDetailInclude,
    });

    if (!record) {
      return null;
    }

    assertUnderReviewRecord(record);

    if (!canApproveReview(currentUser, record.reviewerId)) {
      throw new AuthorizationError(
        403,
        "Only the assigned reviewer or a records manager can approve this record."
      );
    }

    const pendingApproval = record.approvalRequests.find(
      (approvalRequest) => approvalRequest.status === "PENDING"
    );

    if (!pendingApproval) {
      throw new RecordConflictError(
        "No pending review request was found for this record.",
        record.id
      );
    }

    const approvedAt = new Date();
    const retentionExpiresAt = record.retentionPolicy
      ? calculateRetentionExpiry(
          getRetentionReferenceDate({
            approvedAt,
            archivedAt: record.archivedAt,
            createdAt: record.createdAt,
          }),
          record.retentionPolicy.retentionDays
        )
      : null;

    await tx.approvalRequest.update({
      where: { id: pendingApproval.id },
      data: {
        status: "APPROVED",
        decisionNotes: decisionNotes?.trim() || null,
        decidedAt: approvedAt,
      },
    });

    await tx.record.update({
      where: { id: record.id },
      data: {
        status: "APPROVED",
        reviewNotes: decisionNotes?.trim() || record.reviewNotes,
        approvedAt,
        archivedAt: null,
        retentionExpiresAt,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  if (!result) {
    return null;
  }

  await writeAuditEvent({
    action: "record.review.approve",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: result.id,
    metadata: {
      status: result.status,
      decisionNotes: decisionNotes?.trim() || null,
      retentionExpiresAt: result.retentionExpiresAt?.toISOString() ?? null,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(result);
}

export async function rejectRecordReview({
  currentUser,
  recordId,
  decisionNotes,
  requestMetadata,
}: DecideReviewInput) {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.record.findFirst({
      where: {
        id: recordId,
        ...buildReadableRecordScope(currentUser),
      },
      include: recordDetailInclude,
    });

    if (!record) {
      return null;
    }

    assertUnderReviewRecord(record);

    if (!canApproveReview(currentUser, record.reviewerId)) {
      throw new AuthorizationError(
        403,
        "Only the assigned reviewer or a records manager can reject this record."
      );
    }

    const pendingApproval = record.approvalRequests.find(
      (approvalRequest) => approvalRequest.status === "PENDING"
    );

    if (!pendingApproval) {
      throw new RecordConflictError(
        "No pending review request was found for this record.",
        record.id
      );
    }

    await tx.approvalRequest.update({
      where: { id: pendingApproval.id },
      data: {
        status: "REJECTED",
        decisionNotes: decisionNotes?.trim() || null,
        decidedAt: new Date(),
      },
    });

    await tx.record.update({
      where: { id: record.id },
      data: {
        status: "DRAFT",
        reviewNotes: decisionNotes?.trim() || record.reviewNotes,
        submittedForReviewAt: null,
        approvedAt: null,
        archivedAt: null,
        retentionExpiresAt: null,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  if (!result) {
    return null;
  }

  await writeAuditEvent({
    action: "record.review.reject",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: result.id,
    metadata: {
      status: result.status,
      decisionNotes: decisionNotes?.trim() || null,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(result);
}

type ArchiveRecordInput = {
  currentUser: CurrentUser;
  recordId: string;
  requestMetadata: RequestMetadata;
};

export async function archiveRecord({
  currentUser,
  recordId,
  requestMetadata,
}: ArchiveRecordInput) {
  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  if (!canManageAnyRecord(currentUser)) {
    throw new AuthorizationError(403, "Only a records manager can archive this record.");
  }

  assertApprovedRecord(record);

  const archivedAt = new Date();
  const retentionExpiresAt = record.retentionPolicy
    ? calculateRetentionExpiry(
        getRetentionReferenceDate({
          approvedAt: record.approvedAt,
          archivedAt,
          createdAt: record.createdAt,
        }),
        record.retentionPolicy.retentionDays
      )
    : record.retentionExpiresAt;

  const updatedRecord = await prisma.record.update({
    where: { id: record.id },
    data: {
      status: "ARCHIVED",
      archivedAt,
      retentionExpiresAt,
    },
    include: recordDetailInclude,
  });

  await writeAuditEvent({
    action: "record.archive",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: updatedRecord.id,
    metadata: {
      status: updatedRecord.status,
      retentionExpiresAt: updatedRecord.retentionExpiresAt?.toISOString() ?? null,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(updatedRecord);
}

type AssignRetentionPolicyInput = {
  currentUser: CurrentUser;
  recordId: string;
  retentionPolicyId: string;
  requestMetadata: RequestMetadata;
};

export async function assignRetentionPolicy({
  currentUser,
  recordId,
  retentionPolicyId,
  requestMetadata,
}: AssignRetentionPolicyInput) {
  if (!canManageAnyRecord(currentUser)) {
    throw new AuthorizationError(403, "Only a records manager can assign retention.");
  }

  const { organizationId, workspaceId } = ensureWorkspaceContext(currentUser, recordId);
  await ensureDefaultRetentionPolicies(currentUser);

  const retentionPolicy = await prisma.retentionPolicy.findFirst({
    where: {
      id: retentionPolicyId,
      organizationId,
      workspaceId,
    },
  });

  if (!retentionPolicy) {
    throw new RecordConflictError("Retention policy not found in this workspace.", recordId, 404);
  }

  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  const retentionAssignedAt = new Date();
  const retentionExpiresAt =
    record.status === "APPROVED" || record.status === "ARCHIVED"
      ? calculateRetentionExpiry(
          getRetentionReferenceDate({
            approvedAt: record.approvedAt,
            archivedAt: record.archivedAt,
            createdAt: record.createdAt,
          }),
          retentionPolicy.retentionDays
        )
      : null;

  const updatedRecord = await prisma.record.update({
    where: { id: record.id },
    data: {
      retentionPolicyId: retentionPolicy.id,
      retentionAssignedAt,
      retentionExpiresAt,
    },
    include: recordDetailInclude,
  });

  await writeAuditEvent({
    action: "record.retention.assign",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: updatedRecord.id,
    metadata: {
      retentionPolicyId: retentionPolicy.id,
      retentionPolicyName: retentionPolicy.name,
      retentionDays: retentionPolicy.retentionDays,
      retentionExpiresAt: updatedRecord.retentionExpiresAt?.toISOString() ?? null,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(updatedRecord);
}

type CreateLegalHoldInput = {
  currentUser: CurrentUser;
  recordId: string;
  reason: string;
  requestMetadata: RequestMetadata;
};

export async function createLegalHold({
  currentUser,
  recordId,
  reason,
  requestMetadata,
}: CreateLegalHoldInput) {
  if (!canManageAnyRecord(currentUser)) {
    throw new AuthorizationError(403, "Only a records manager can place legal holds.");
  }

  const trimmedReason = reason.trim();

  if (trimmedReason.length === 0) {
    throw new RecordConflictError("A legal hold reason is required.", recordId, 400);
  }

  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  const updatedRecord = await prisma.$transaction(async (tx) => {
    await tx.legalHold.create({
      data: {
        recordId: record.id,
        reason: trimmedReason,
        appliedByUserId: currentUser.id,
        appliedByUserEmail: currentUser.email,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  await writeAuditEvent({
    action: "record.hold.create",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: updatedRecord.id,
    metadata: {
      reason: trimmedReason,
      activeHoldCount: updatedRecord.legalHolds.filter((hold) => hold.releasedAt === null).length,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(updatedRecord);
}

type ReleaseLegalHoldInput = {
  currentUser: CurrentUser;
  recordId: string;
  holdId: string;
  requestMetadata: RequestMetadata;
};

export async function releaseLegalHold({
  currentUser,
  recordId,
  holdId,
  requestMetadata,
}: ReleaseLegalHoldInput) {
  if (!canManageAnyRecord(currentUser)) {
    throw new AuthorizationError(403, "Only a records manager can release legal holds.");
  }

  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  const hold = record.legalHolds.find((legalHold) => legalHold.id === holdId);

  if (!hold) {
    throw new RecordConflictError("Legal hold not found for this record.", recordId, 404);
  }

  if (hold.releasedAt) {
    throw new RecordConflictError("This legal hold has already been released.", recordId);
  }

  const updatedRecord = await prisma.$transaction(async (tx) => {
    await tx.legalHold.update({
      where: { id: hold.id },
      data: {
        releasedAt: new Date(),
        releasedByUserId: currentUser.id,
        releasedByUserEmail: currentUser.email,
      },
    });

    return tx.record.findUniqueOrThrow({
      where: { id: record.id },
      include: recordDetailInclude,
    });
  });

  await writeAuditEvent({
    action: "record.hold.release",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: updatedRecord.id,
    metadata: {
      holdId: hold.id,
      reason: hold.reason,
      activeHoldCount: updatedRecord.legalHolds.filter((legalHold) => legalHold.releasedAt === null).length,
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(updatedRecord);
}

type DisposeRecordInput = {
  currentUser: CurrentUser;
  recordId: string;
  requestMetadata: RequestMetadata;
};

export async function disposeRecord({
  currentUser,
  recordId,
  requestMetadata,
}: DisposeRecordInput) {
  if (!canManageAnyRecord(currentUser)) {
    throw new AuthorizationError(403, "Only a records manager can dispose records.");
  }

  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  assertArchivedRecord(record);
  assertNoActiveHolds(record, "Records on active hold cannot be disposed.");

  if (!record.retentionExpiresAt) {
    throw new RecordConflictError(
      "Assign a retention policy before disposing this record.",
      record.id
    );
  }

  if (record.retentionExpiresAt.getTime() > Date.now()) {
    throw new RecordConflictError(
      "This record is not yet due for disposition.",
      record.id
    );
  }

  return purgeRecordAndVersions({
    record,
    currentUser,
    requestMetadata,
    auditAction: "record.dispose",
  });
}

type DeleteRecordInput = {
  currentUser: CurrentUser;
  recordId: string;
  requestMetadata: RequestMetadata;
};

export async function deleteRecordAndVersions({
  currentUser,
  recordId,
  requestMetadata,
}: DeleteRecordInput) {
  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildReadableRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  assertEditableRecordOwner(record, currentUser);
  assertDraftRecord(record);
  assertNoActiveHolds(record, "Records on active hold cannot be deleted.");

  return purgeRecordAndVersions({
    record,
    currentUser,
    requestMetadata,
    auditAction: "record.delete",
  });
}

export async function getLegacyRecordByCid(currentUser: CurrentUser, cid: string) {
  const version = await prisma.recordVersion.findFirst({
    where: {
      cid,
      ...buildLegacyRecordVersionScope(currentUser),
    },
    include: {
      record: {
        include: recordDetailInclude,
      },
    },
  });

  if (!version) {
    return null;
  }

  const record = version.record as CompatibilityRow["record"];

  if (record._count.versions > 1) {
    throw new RecordConflictError(
      "This record has multiple versions. Use the records API instead.",
      record.id
    );
  }

  return {
    record,
    version,
  };
}

export function serializeLegacyFile(record: RecordDetailPayload): LegacyFilePayload {
  return {
    id: record.recordId,
    recordId: record.recordId,
    filename: record.latestVersion.originalFilename,
    cid: record.latestVersion.cid,
    fileSize: record.latestVersion.fileSize,
    mimeType: record.latestVersion.mimeType,
    uploadedAt: record.latestVersion.uploadedAt,
    gatewayUrl: record.latestVersion.gatewayUrl,
  };
}

export function mapRecordSummaryToLegacyFile(record: RecordSummaryPayload): LegacyFilePayload {
  return {
    id: record.recordId,
    recordId: record.recordId,
    filename: record.latestVersion.originalFilename,
    cid: record.latestVersion.cid,
    fileSize: record.latestVersion.fileSize,
    mimeType: record.latestVersion.mimeType,
    uploadedAt: record.latestVersion.uploadedAt,
    gatewayUrl: record.latestVersion.gatewayUrl,
  };
}

