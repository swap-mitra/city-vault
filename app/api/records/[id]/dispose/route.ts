import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  disposeRecord,
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

    authorizeTenantAccess(currentUser, "records.dispose", {
      allowLegacyUserWithoutMembership: true,
    });

    const disposedRecord = await disposeRecord({
      currentUser,
      recordId: id,
      requestMetadata: getAuditRequestMetadata(request),
    });

    if (!disposedRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      recordId: disposedRecord.recordId,
      message: `${disposedRecord.title} disposed successfully.`,
      unpinnedCids: disposedRecord.unpinnedCids,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof RecordConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record dispose error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to unpin one or more version files from IPFS. The record was restored.",
      },
      { status: 502 }
    );
  }
}
