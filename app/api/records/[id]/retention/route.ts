import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  assignRetentionPolicy,
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

    authorizeTenantAccess(currentUser, "records.retention.manage", {
      allowLegacyUserWithoutMembership: true,
    });

    const body = (await request.json()) as {
      retentionPolicyId?: string;
    };

    if (!body.retentionPolicyId || body.retentionPolicyId.trim().length === 0) {
      return NextResponse.json(
        { error: "Retention policy is required." },
        { status: 400 }
      );
    }

    const updatedRecord = await assignRetentionPolicy({
      currentUser,
      recordId: id,
      retentionPolicyId: body.retentionPolicyId,
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

    console.error("Record retention assign error:", error);
    return NextResponse.json(
      { error: "Failed to assign retention policy" },
      { status: 500 }
    );
  }
}
