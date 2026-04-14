import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActiveMembership = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
};

export async function resolveActiveMembership(
  userId: string
): Promise<ActiveMembership | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: {
      organization: true,
      workspace: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (!membership) {
    return null;
  }

  return {
    membershipId: membership.id,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
    role: membership.role,
  };
}
