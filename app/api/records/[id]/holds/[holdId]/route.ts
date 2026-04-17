import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  RecordConflictError,
  releaseLegalHold,
} from "@/lib/records";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; holdId: string }> }
) {
  try {
    const { id, holdId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.hold.manage", {
      allowLegacyUserWithoutMembership: true,
    });

    const updatedRecord = await releaseLegalHold({
      currentUser,
      recordId: id,
      holdId,
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

    console.error("Record hold release error:", error);
    return NextResponse.json(
      { error: "Failed to release legal hold" },
      { status: 500 }
    );
  }
}
