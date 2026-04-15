import type { Role } from "@prisma/client";

export type Permission =
  | "tenant.read"
  | "tenant.manage"
  | "records.read"
  | "records.create"
  | "records.delete"
  | "records.version.create"
  | "files.read"
  | "files.upload"
  | "files.delete"
  | "audit.read";

export type TenantIdentity = {
  organizationId: string | null;
  workspaceId: string | null;
  membershipId: string | null;
  role: Role | null;
};

export type AuthorizationOptions = {
  allowLegacyUserWithoutMembership?: boolean;
};

export class AuthorizationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

const rolePermissions: Record<Role, Permission[]> = {
  ORG_ADMIN: [
    "tenant.read",
    "tenant.manage",
    "records.read",
    "records.create",
    "records.delete",
    "records.version.create",
    "files.read",
    "files.upload",
    "files.delete",
    "audit.read",
  ],
  RECORDS_MANAGER: [
    "tenant.read",
    "records.read",
    "records.create",
    "records.delete",
    "records.version.create",
    "files.read",
    "files.upload",
    "files.delete",
    "audit.read",
  ],
  REVIEWER: ["tenant.read", "records.read", "files.read", "audit.read"],
  CONTRIBUTOR: [
    "tenant.read",
    "records.read",
    "records.create",
    "records.delete",
    "records.version.create",
    "files.read",
    "files.upload",
    "files.delete",
  ],
  READ_ONLY: ["tenant.read", "records.read", "files.read"],
  AUDITOR: ["tenant.read", "records.read", "files.read", "audit.read"],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function authorizeTenantAccess(
  identity: TenantIdentity | null | undefined,
  permission: Permission,
  options: AuthorizationOptions = {}
) {
  if (!identity) {
    throw new AuthorizationError(401, "Unauthorized");
  }

  if (!identity.organizationId || !identity.workspaceId || !identity.role) {
    if (options.allowLegacyUserWithoutMembership) {
      return null;
    }

    throw new AuthorizationError(
      403,
      "No active organization membership was found for this account."
    );
  }

  if (!hasPermission(identity.role, permission)) {
    throw new AuthorizationError(
      403,
      "Your role does not allow this action in the active workspace."
    );
  }

  return {
    organizationId: identity.organizationId,
    workspaceId: identity.workspaceId,
    membershipId: identity.membershipId,
    role: identity.role,
  };
}
