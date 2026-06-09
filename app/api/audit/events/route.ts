import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import { listAuditEvents } from "@/lib/audit-explorer";
import { AuthorizationError } from "@/lib/authorization";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const result = await listAuditEvents(currentUser, {
      query: searchParams.get("query")?.trim() || undefined,
      action: searchParams.get("action")?.trim() || undefined,
      targetType: searchParams.get("targetType")?.trim() || undefined,
      actorEmail: searchParams.get("actorEmail")?.trim() || undefined,
      from: searchParams.get("from")?.trim() || undefined,
      to: searchParams.get("to")?.trim() || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Audit events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit events" },
      { status: 500 }
    );
  }
}
