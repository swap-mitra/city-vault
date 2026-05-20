import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import { addMember } from "@/lib/admin";
import { getAuditRequestMetadata } from "@/lib/audit";
import { AuthorizationError } from "@/lib/authorization";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as {
      email?: string;
      workspaceId?: string;
      role?: unknown;
    };
    const member = await addMember(
      currentUser,
      {
        email: body.email ?? "",
        workspaceId: body.workspaceId ?? "",
        role: body.role,
      },
      getAuditRequestMetadata(request)
    );

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Member add error:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
