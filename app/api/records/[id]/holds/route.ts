import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  createLegalHold,
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

    authorizeTenantAccess(currentUser, "records.hold.manage", {
      allowLegacyUserWithoutMembership: true,
    });

    const body = (await request.json()) as {
      reason?: string;
    };

    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Legal hold reason is required." },
        { status: 400 }
      );
    }

    const updatedRecord = await createLegalHold({
      currentUser,
      recordId: id,
      reason: body.reason,
      requestMetadata: getAuditRequestMetadata(request),
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRecord, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof RecordConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record hold create error:", error);
    return NextResponse.json(
      { error: "Failed to place legal hold" },
      { status: 500 }
    );
  }
}
