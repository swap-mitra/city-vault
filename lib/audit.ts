import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditActor = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  membershipId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
};

type AuditTarget = {
  targetType: string;
  targetId?: string | null;
};

type AuditMetadata = Prisma.InputJsonValue | undefined;

export type AuditEventInput = AuditActor &
  AuditTarget & {
    action: string;
    metadata?: AuditMetadata;
    ipAddress?: string | null;
    userAgent?: string | null;
  };

export function getAuditRequestMetadata(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return {
    ipAddress: forwardedFor || realIp || null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function writeAuditEvent(input: AuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorName: input.actorName ?? null,
      membershipId: input.membershipId ?? null,
      organizationId: input.organizationId ?? null,
      workspaceId: input.workspaceId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
