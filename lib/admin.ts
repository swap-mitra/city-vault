import type { MembershipStatus, Prisma, Role } from "@prisma/client";
import type { CurrentUser } from "@/current-user";
import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/lib/authorization";
import { writeAuditEvent, type AuditEventInput } from "@/lib/audit";

const roles: Role[] = [
  "ORG_ADMIN",
  "RECORDS_MANAGER",
  "REVIEWER",
  "CONTRIBUTOR",
  "READ_ONLY",
  "AUDITOR",
];

type RequestAuditMetadata = Pick<AuditEventInput, "ipAddress" | "userAgent">;

type AdminActor = {
  id: string;
  email: string;
  name: string | null;
  membershipId: string;
  organizationId: string;
  workspaceId: string;
  role: Role;
};

export type TenantAdminOverview = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  activeWorkspace: {
    id: string;
    name: string;
    slug: string;
  };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    memberCount: number;
  }>;
  members: Array<{
    membershipId: string;
    userId: string;
    name: string | null;
    email: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
    isDefault: boolean;
    status: MembershipStatus;
    createdAt: string;
  }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "workspace";
}

function assertOrgAdmin(currentUser: CurrentUser | null): AdminActor {
  if (!currentUser) {
    throw new AuthorizationError(401, "Unauthorized");
  }

  if (
    currentUser.role !== "ORG_ADMIN" ||
    !currentUser.membershipId ||
    !currentUser.organizationId ||
    !currentUser.workspaceId
  ) {
    throw new AuthorizationError(
      403,
      "Only organization admins can manage tenant settings."
    );
  }

  return {
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name,
    membershipId: currentUser.membershipId,
    organizationId: currentUser.organizationId,
    workspaceId: currentUser.workspaceId,
    role: currentUser.role,
  };
}

async function getUniqueWorkspaceSlug(
  tx: Prisma.TransactionClient,
  organizationId: string,
  name: string
) {
  const baseSlug = slugify(name);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await tx.workspace.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: candidate,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

async function ensureWorkspaceBelongsToOrg(
  workspaceId: string,
  organizationId: string
) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      organizationId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!workspace) {
    throw new AuthorizationError(404, "Workspace was not found in this organization.");
  }

  return workspace;
}

async function ensureMembershipBelongsToOrg(
  membershipId: string,
  organizationId: string
) {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    throw new AuthorizationError(404, "Membership was not found in this organization.");
  }

  return membership;
}

async function assertNotLastActiveOrgAdmin(
  organizationId: string,
  membershipId: string
) {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
    select: {
      role: true,
      status: true,
    },
  });

  if (!membership || membership.role !== "ORG_ADMIN" || membership.status !== "ACTIVE") {
    return;
  }

  const activeAdminCount = await prisma.membership.count({
    where: {
      organizationId,
      role: "ORG_ADMIN",
      status: "ACTIVE",
      workspace: {
        isActive: true,
      },
    },
  });

  if (activeAdminCount <= 1) {
    throw new AuthorizationError(
      409,
      "At least one active organization admin must remain."
    );
  }
}

async function setDefaultMembership(userId: string, membershipId: string) {
  await prisma.$transaction([
    prisma.membership.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.membership.update({
      where: { id: membershipId },
      data: { isDefault: true },
    }),
  ]);
}

function auditBase(actor: AdminActor, requestMetadata?: RequestAuditMetadata) {
  return {
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    membershipId: actor.membershipId,
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    ...requestMetadata,
  };
}

function validateRole(role: unknown): Role {
  if (typeof role !== "string" || !roles.includes(role as Role)) {
    throw new AuthorizationError(400, "Choose a valid role.");
  }

  return role as Role;
}

export async function getTenantAdminOverview(currentUser: CurrentUser | null) {
  const actor = assertOrgAdmin(currentUser);

  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!organization) {
    throw new AuthorizationError(404, "Organization was not found.");
  }

  const [activeWorkspace, workspaces, memberships] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.workspace.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        _count: {
          select: {
            memberships: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    prisma.membership.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!activeWorkspace) {
    throw new AuthorizationError(404, "Active workspace was not found.");
  }

  return {
    organization,
    activeWorkspace,
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      isActive: workspace.isActive,
      createdAt: workspace.createdAt.toISOString(),
      memberCount: workspace._count.memberships,
    })),
    members: memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      isDefault: membership.isDefault,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
    })),
  } satisfies TenantAdminOverview;
}

export async function createWorkspace(
  currentUser: CurrentUser | null,
  input: { name: string },
  requestMetadata?: RequestAuditMetadata
) {
  const actor = assertOrgAdmin(currentUser);
  const name = input.name.trim();

  if (name.length < 2) {
    throw new AuthorizationError(400, "Workspace name must be at least 2 characters.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const slug = await getUniqueWorkspaceSlug(tx, actor.organizationId, name);
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug,
        organizationId: actor.organizationId,
      },
    });

    const membership = await tx.membership.create({
      data: {
        userId: actor.id,
        organizationId: actor.organizationId,
        workspaceId: workspace.id,
        role: "ORG_ADMIN",
        status: "ACTIVE",
        addedByUserId: actor.id,
      },
    });

    return { workspace, membership };
  });

  await writeAuditEvent({
    action: "workspace.create",
    ...auditBase(actor, requestMetadata),
    targetType: "Workspace",
    targetId: result.workspace.id,
    metadata: {
      workspaceName: result.workspace.name,
      workspaceSlug: result.workspace.slug,
    },
  });

  return {
    id: result.workspace.id,
    name: result.workspace.name,
    slug: result.workspace.slug,
    isActive: result.workspace.isActive,
    createdAt: result.workspace.createdAt.toISOString(),
    creatorMembershipId: result.membership.id,
  };
}

export async function addMember(
  currentUser: CurrentUser | null,
  input: { email: string; workspaceId: string; role: unknown },
  requestMetadata?: RequestAuditMetadata
) {
  const actor = assertOrgAdmin(currentUser);
  const email = normalizeEmail(input.email);
  const role = validateRole(input.role);

  if (!email) {
    throw new AuthorizationError(400, "Member email is required.");
  }

  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    ensureWorkspaceBelongsToOrg(input.workspaceId, actor.organizationId),
  ]);

  if (!user) {
    throw new AuthorizationError(
      404,
      "That user must register before they can be added to a workspace."
    );
  }

  const existing = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
  });

  if (existing?.status === "ACTIVE") {
    throw new AuthorizationError(409, "This user is already active in that workspace.");
  }

  const membership = existing
    ? await prisma.membership.update({
        where: { id: existing.id },
        data: {
          role,
          status: "ACTIVE",
          addedByUserId: actor.id,
          invitedAt: new Date(),
        },
      })
    : await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: actor.organizationId,
          workspaceId: workspace.id,
          role,
          status: "ACTIVE",
          addedByUserId: actor.id,
          invitedAt: new Date(),
        },
      });

  await writeAuditEvent({
    action: "membership.create",
    ...auditBase(actor, requestMetadata),
    targetType: "Membership",
    targetId: membership.id,
    metadata: {
      affectedUserEmail: user.email,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role,
      reactivated: Boolean(existing),
    },
  });

  return {
    membershipId: membership.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    workspaceId: membership.workspaceId,
    workspaceName: workspace.name,
    isDefault: membership.isDefault,
    status: membership.status,
    createdAt: membership.createdAt.toISOString(),
  };
}

export async function updateMembership(
  currentUser: CurrentUser | null,
  membershipId: string,
  input: {
    role?: unknown;
    isDefault?: unknown;
    status?: unknown;
  },
  requestMetadata?: RequestAuditMetadata
) {
  const actor = assertOrgAdmin(currentUser);
  const membership = await ensureMembershipBelongsToOrg(
    membershipId,
    actor.organizationId
  );

  const nextRole = input.role === undefined ? undefined : validateRole(input.role);
  const nextStatus =
    input.status === undefined
      ? undefined
      : input.status === "ACTIVE" || input.status === "DISABLED"
        ? input.status
        : null;

  if (nextStatus === null) {
    throw new AuthorizationError(400, "Choose a valid membership status.");
  }

  if (
    (nextRole && nextRole !== "ORG_ADMIN") ||
    nextStatus === "DISABLED"
  ) {
    await assertNotLastActiveOrgAdmin(actor.organizationId, membershipId);
  }

  const shouldSetDefault = input.isDefault === true;
  const updateData: Prisma.MembershipUpdateInput = {};

  if (nextRole) {
    updateData.role = nextRole;
  }

  if (nextStatus) {
    updateData.status = nextStatus;
  }

  const updatedMembership = await prisma.membership.update({
    where: { id: membershipId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (shouldSetDefault && updatedMembership.status === "ACTIVE") {
    await setDefaultMembership(updatedMembership.userId, updatedMembership.id);
    updatedMembership.isDefault = true;
  }

  await writeAuditEvent({
    action: "membership.update",
    ...auditBase(actor, requestMetadata),
    targetType: "Membership",
    targetId: updatedMembership.id,
    metadata: {
      affectedUserEmail: updatedMembership.user.email,
      workspaceId: updatedMembership.workspaceId,
      workspaceName: updatedMembership.workspace.name,
      previousRole: membership.role,
      nextRole: updatedMembership.role,
      previousStatus: membership.status,
      nextStatus: updatedMembership.status,
      defaultWorkspaceChanged: shouldSetDefault,
    },
  });

  return {
    membershipId: updatedMembership.id,
    userId: updatedMembership.userId,
    name: updatedMembership.user.name,
    email: updatedMembership.user.email,
    role: updatedMembership.role,
    workspaceId: updatedMembership.workspaceId,
    workspaceName: updatedMembership.workspace.name,
    isDefault: updatedMembership.isDefault,
    status: updatedMembership.status,
    createdAt: updatedMembership.createdAt.toISOString(),
  };
}

export async function disableMembership(
  currentUser: CurrentUser | null,
  membershipId: string,
  requestMetadata?: RequestAuditMetadata
) {
  const actor = assertOrgAdmin(currentUser);
  const membership = await ensureMembershipBelongsToOrg(
    membershipId,
    actor.organizationId
  );

  await assertNotLastActiveOrgAdmin(actor.organizationId, membershipId);

  if (membership.userId === actor.id && membership.id === actor.membershipId) {
    const otherActiveMembership = await prisma.membership.findFirst({
      where: {
        userId: actor.id,
        organizationId: actor.organizationId,
        id: { not: membershipId },
        status: "ACTIVE",
        workspace: { isActive: true },
      },
      select: { id: true },
    });

    if (!otherActiveMembership) {
      throw new AuthorizationError(
        409,
        "You need another active membership before disabling your current one."
      );
    }
  }

  const disabled = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: "DISABLED",
      isDefault: false,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await writeAuditEvent({
    action: "membership.disable",
    ...auditBase(actor, requestMetadata),
    targetType: "Membership",
    targetId: disabled.id,
    metadata: {
      affectedUserEmail: disabled.user.email,
      workspaceId: disabled.workspace.id,
      workspaceName: disabled.workspace.name,
      previousRole: membership.role,
    },
  });

  return { success: true };
}
