import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/tenant";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  membershipId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  role: Role | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.email) {
    return null;
  }

  const email = normalizeEmail(sessionUser.email);

  if (sessionUser.id) {
    const membership =
      sessionUser.membershipId &&
      sessionUser.organizationId &&
      sessionUser.workspaceId &&
      sessionUser.role
        ? null
        : await resolveActiveMembership(sessionUser.id);

    return {
      id: sessionUser.id,
      email,
      name: sessionUser.name ?? null,
      membershipId: sessionUser.membershipId ?? membership?.membershipId ?? null,
      organizationId: sessionUser.organizationId ?? membership?.organizationId ?? null,
      organizationName:
        sessionUser.organizationName ?? membership?.organizationName ?? null,
      workspaceId: sessionUser.workspaceId ?? membership?.workspaceId ?? null,
      workspaceName: sessionUser.workspaceName ?? membership?.workspaceName ?? null,
      role: sessionUser.role ?? membership?.role ?? null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const membership = await resolveActiveMembership(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    membershipId: membership?.membershipId ?? null,
    organizationId: membership?.organizationId ?? null,
    organizationName: membership?.organizationName ?? null,
    workspaceId: membership?.workspaceId ?? null,
    workspaceName: membership?.workspaceName ?? null,
    role: membership?.role ?? null,
  };
}
