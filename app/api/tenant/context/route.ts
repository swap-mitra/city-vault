import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
  hasPermission,
} from "@/lib/authorization";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const tenant = authorizeTenantAccess(currentUser, "tenant.read");

    return NextResponse.json({
      userId: currentUser?.id ?? null,
      membershipId: tenant?.membershipId ?? null,
      organizationId: tenant?.organizationId ?? null,
      organizationName: currentUser?.organizationName ?? null,
      workspaceId: tenant?.workspaceId ?? null,
      workspaceName: currentUser?.workspaceName ?? null,
      role: tenant?.role ?? null,
      permissions: tenant?.role
        ? {
            canManageTenant: hasPermission(tenant.role, "tenant.manage"),
            canReadAudit: hasPermission(tenant.role, "audit.read"),
            canUploadFiles: hasPermission(tenant.role, "files.upload"),
            canDeleteFiles: hasPermission(tenant.role, "files.delete"),
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Tenant context error:", error);
    return NextResponse.json(
      { error: "Failed to resolve tenant context" },
      { status: 500 },
    );
  }
}
