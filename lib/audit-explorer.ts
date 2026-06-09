import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/current-user";
import { prisma } from "@/lib/prisma";
import { authorizeTenantAccess } from "@/lib/authorization";

export type AuditExplorerFilters = {
  query?: string;
  action?: string;
  targetType?: string;
  actorEmail?: string;
  from?: string;
  to?: string;
};

export type AuditExplorerEvent = {
  id: string;
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  targetType: string;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
};

function parseDate(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listAuditEvents(
  currentUser: CurrentUser,
  filters: AuditExplorerFilters = {}
) {
  const tenant = authorizeTenantAccess(currentUser, "audit.read");

  if (!tenant) {
    throw new Error("Audit access requires an active tenant.");
  }

  const where: Prisma.AuditEventWhereInput = {
    organizationId: tenant.organizationId,
    workspaceId: tenant.workspaceId,
  };

  if (filters.query) {
    where.OR = [
      { action: { contains: filters.query, mode: "insensitive" } },
      { actorEmail: { contains: filters.query, mode: "insensitive" } },
      { actorName: { contains: filters.query, mode: "insensitive" } },
      { targetType: { contains: filters.query, mode: "insensitive" } },
      { targetId: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  if (filters.action) {
    where.action = { contains: filters.action, mode: "insensitive" };
  }

  if (filters.targetType) {
    where.targetType = { contains: filters.targetType, mode: "insensitive" };
  }

  if (filters.actorEmail) {
    where.actorEmail = { contains: filters.actorEmail, mode: "insensitive" };
  }

  const from = parseDate(filters.from);
  const to = parseDate(filters.to);

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    events: events.map((event): AuditExplorerEvent => ({
      id: event.id,
      action: event.action,
      actorEmail: event.actorEmail,
      actorName: event.actorName,
      targetType: event.targetType,
      targetId: event.targetId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
