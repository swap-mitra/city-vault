import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  RecordConflictError,
  submitRecordForReview,
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

    authorizeTenantAccess(currentUser, "records.review.submit", {
      allowLegacyUserWithoutMembership: true,
    });

    const body = (await request.json()) as {
      reviewerId?: string;
      requestNotes?: string | null;
    };

    if (!body.reviewerId || body.reviewerId.trim().length === 0) {
      return NextResponse.json(
        { error: "Reviewer is required." },
        { status: 400 }
      );
    }

    const updatedRecord = await submitRecordForReview({
      currentUser,
      recordId: id,
      reviewerId: body.reviewerId,
      requestNotes: body.requestNotes,
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

    console.error("Record review submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit record for review" },
      { status: 500 }
    );
  }
}
