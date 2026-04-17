import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  archiveRecord,
  RecordConflictError,
} from "@/lib/records";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.archive", {
      allowLegacyUserWithoutMembership: true,
    });

    const updatedRecord = await archiveRecord({
      currentUser,
      recordId: id,
      requestMetadata: getAuditRequestMetadata(request),
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof RecordConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record archive error:", error);
    return NextResponse.json(
      { error: "Failed to archive record" },
      { status: 500 }
    );
  }
}
