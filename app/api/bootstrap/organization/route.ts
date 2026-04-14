import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/current-user";
import { bootstrapInitialOrganizationForUser } from "@/lib/bootstrap";
import { getAuditRequestMetadata, writeAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.membershipId) {
      return NextResponse.json(
        { error: "This account already has an active organization membership." },
        { status: 409 }
      );
    }

    const bootstrapResult = await prisma.$transaction(async (tx) =>
      bootstrapInitialOrganizationForUser(tx, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      })
    );

    if (!bootstrapResult) {
      return NextResponse.json(
        { error: "An organization has already been created for this deployment." },
        { status: 409 }
      );
    }

    const requestMetadata = getAuditRequestMetadata(request);

    await writeAuditEvent({
      action: "organization.bootstrap",
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorName: currentUser.name,
      membershipId: bootstrapResult.membership.id,
      organizationId: bootstrapResult.organization.id,
      workspaceId: bootstrapResult.workspace.id,
      targetType: "Organization",
      targetId: bootstrapResult.organization.id,
      metadata: {
        organizationName: bootstrapResult.organization.name,
        workspaceName: bootstrapResult.workspace.name,
      },
      ...requestMetadata,
    });

    return NextResponse.json(
      {
        success: true,
        organizationId: bootstrapResult.organization.id,
        organizationName: bootstrapResult.organization.name,
        workspaceId: bootstrapResult.workspace.id,
        workspaceName: bootstrapResult.workspace.name,
        role: bootstrapResult.membership.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Organization bootstrap error:", error);
    return NextResponse.json(
      { error: "Failed to bootstrap organization" },
      { status: 500 }
    );
  }
}
