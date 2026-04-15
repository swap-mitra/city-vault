import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGatewayUrl, getPinataClient } from "@/lib/pinata";
import type { CurrentUser } from "@/current-user";
import type { AuditEventInput } from "@/lib/audit";
import { writeAuditEvent } from "@/lib/audit";

const recordListInclude = {
  versions: {
    orderBy: { versionNumber: "desc" },
    take: 1,
  },
  _count: {
    select: { versions: true },
  },
} satisfies Prisma.RecordInclude;

const recordDetailInclude = {
  versions: {
    orderBy: { versionNumber: "desc" },
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
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestVersion: RecordVersionPayload;
};

export type RecordDetailPayload = RecordSummaryPayload & {
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

export class RecordConflictError extends Error {
  readonly status: number;
  readonly recordId: string;

  constructor(message: string, recordId: string) {
    super(message);
    this.name = "RecordConflictError";
    this.status = 409;
    this.recordId = recordId;
  }
}

function buildRecordScope(currentUser: CurrentUser): Pick<
  Prisma.RecordWhereInput,
  "userId" | "organizationId" | "workspaceId"
> {
  return {
    userId: currentUser.id,
    organizationId: currentUser.organizationId,
    workspaceId: currentUser.workspaceId,
  };
}

function buildRecordVersionScope(currentUser: CurrentUser): Prisma.RecordVersionWhereInput {
  return {
    record: buildRecordScope(currentUser),
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

function serializeRecordSummary(record: RecordListRow): RecordSummaryPayload {
  const latestVersion = record.versions[0];

  return {
    recordId: record.id,
    title: record.title,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    latestVersion: serializeVersion(latestVersion),
  };
}

function serializeRecordDetail(record: RecordDetailRow): RecordDetailPayload {
  const latestVersion = record.versions[0];

  return {
    recordId: record.id,
    title: record.title,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    versionCount: record._count.versions,
    latestVersion: serializeVersion(latestVersion),
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

export async function listRecords(currentUser: CurrentUser, query?: string) {
  const where: Prisma.RecordWhereInput = {
    ...buildRecordScope(currentUser),
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

export async function getRecordDetail(currentUser: CurrentUser, recordId: string) {
  const record = await prisma.record.findFirst({
    where: {
      id: recordId,
      ...buildRecordScope(currentUser),
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
        ...buildRecordScope(currentUser),
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
      ...buildRecordScope(currentUser),
    },
    include: recordDetailInclude,
  });

  if (!record) {
    return null;
  }

  const uniqueCids = [...new Set(record.versions.map((version) => version.cid))];

  await prisma.$transaction(async (tx) => {
    await tx.recordVersion.deleteMany({
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
      ...buildRecordVersionScope(currentUser),
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
