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
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  reviewer: ReviewerSummaryPayload | null;
  latestVersion: RecordVersionPayload;
};

export type RecordDetailPayload = RecordSummaryPayload & {
  approvalRequests: ApprovalRequestPayload[];
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

function hasWorkspaceContext(currentUser: CurrentUser) {
  return Boolean(currentUser.organizationId && currentUser.workspaceId);
}

function canManageAnyRecord(currentUser: CurrentUser) {
  return currentUser.role === "ORG_ADMIN" || currentUser.role === "RECORDS_MANAGER";
}

function canApproveReview(currentUser: CurrentUser, reviewerId: string | null) {
  return canManageAnyRecord(currentUser) || reviewerId === currentUser.id;
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    reviewer: serializeReviewer(record.reviewer),
    latestVersion: serializeVersion(latestVersion),
  };
}

function serializeRecordDetail(record: RecordDetailRow): RecordDetailPayload {
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    reviewer: serializeReviewer(record.reviewer),
    latestVersion: serializeVersion(latestVersion),
    approvalRequests: record.approvalRequests.map((approvalRequest) =>
      serializeApprovalRequest(approvalRequest)
    ),
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
    throw new RecordConflictError(
      "Only draft records can be changed.",
      record.id
    );
  }
}

function assertApprovedRecord(record: { status: string; id: string }) {
  if (record.status !== "APPROVED") {
    throw new RecordConflictError(
      "Only approved records can be archived.",
      record.id
    );
  }
}

function assertUnderReviewRecord(record: { status: string; id: string }) {
  if (record.status !== "UNDER_REVIEW") {
    throw new RecordConflictError(
      "This record is not currently under review.",
      record.id
    );
  }
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

export async function listEligibleReviewers(currentUser: CurrentUser) {
  if (!hasWorkspaceContext(currentUser)) {
    return [];
  }

  const organizationId = currentUser.organizationId!;
  const workspaceId = currentUser.workspaceId!;

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
      },
    });

    if (!record) {
      return null;
    }

    assertEditableRecordOwner(record, currentUser);
    assertDraftRecord(record);

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
  if (!hasWorkspaceContext(currentUser)) {
    throw new RecordConflictError(
      "A workspace context is required to submit records for review.",
      recordId,
      400
    );
  }

  const organizationId = currentUser.organizationId!;
  const workspaceId = currentUser.workspaceId!;

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

    await tx.approvalRequest.update({
      where: { id: pendingApproval.id },
      data: {
        status: "APPROVED",
        decisionNotes: decisionNotes?.trim() || null,
        decidedAt: new Date(),
      },
    });

    await tx.record.update({
      where: { id: record.id },
      data: {
        status: "APPROVED",
        reviewNotes: decisionNotes?.trim() || record.reviewNotes,
        approvedAt: new Date(),
        archivedAt: null,
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
    throw new AuthorizationError(
      403,
      "Only a records manager can archive this record."
    );
  }

  assertApprovedRecord(record);

  const updatedRecord = await prisma.record.update({
    where: { id: record.id },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
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
    },
    ...requestMetadata,
  });

  return serializeRecordDetail(updatedRecord);
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

  const uniqueCids = [...new Set(record.versions.map((version) => version.cid))];

  await prisma.$transaction(async (tx) => {
    await tx.recordVersion.deleteMany({
      where: { recordId: record.id },
    });

    await tx.approvalRequest.deleteMany({
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
      },
    });

    throw error;
  }

  await writeAuditEvent({
    action: "record.delete",
    ...buildAuditActor(currentUser),
    targetType: "Record",
    targetId: record.id,
    metadata: {
      title: record.title,
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

export function mapRecordSummaryToLegacyFile(
  record: RecordSummaryPayload
): LegacyFilePayload {
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

