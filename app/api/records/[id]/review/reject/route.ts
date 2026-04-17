import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  RecordConflictError,
  rejectRecordReview,
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

    authorizeTenantAccess(currentUser, "records.review.approve", {
      allowLegacyUserWithoutMembership: true,
    });

    const body = (await request.json()) as {
      decisionNotes?: string | null;
    };

    const updatedRecord = await rejectRecordReview({
      currentUser,
      recordId: id,
      decisionNotes: body.decisionNotes,
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

    console.error("Record review rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject record" },
      { status: 500 }
    );
  }
}
