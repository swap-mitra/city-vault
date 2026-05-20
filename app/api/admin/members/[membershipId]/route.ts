import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import { disableMembership, updateMembership } from "@/lib/admin";
import { getAuditRequestMetadata } from "@/lib/audit";
import { AuthorizationError } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{
    membershipId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    const { membershipId } = await context.params;
    const body = (await request.json()) as {
      role?: unknown;
      isDefault?: unknown;
      status?: unknown;
    };
    const member = await updateMembership(
      currentUser,
      membershipId,
      body,
      getAuditRequestMetadata(request)
    );

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Member update error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    const { membershipId } = await context.params;
    const result = await disableMembership(
      currentUser,
      membershipId,
      getAuditRequestMetadata(request)
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Member disable error:", error);
    return NextResponse.json({ error: "Failed to disable member" }, { status: 500 });
  }
}
