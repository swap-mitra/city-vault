import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import { createWorkspace } from "@/lib/admin";
import { getAuditRequestMetadata } from "@/lib/audit";
import { AuthorizationError } from "@/lib/authorization";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as { name?: string };
    const workspace = await createWorkspace(
      currentUser,
      { name: body.name ?? "" },
      getAuditRequestMetadata(request)
    );

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Workspace create error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
