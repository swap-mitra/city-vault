import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  deleteRecordAndVersions,
  getRecordDetail,
} from "@/lib/records";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.read", {
      allowLegacyUserWithoutMembership: true,
    });

    const record = await getRecordDetail(currentUser, id);

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.delete", {
      allowLegacyUserWithoutMembership: true,
    });

    const deletedRecord = await deleteRecordAndVersions({
      currentUser,
      recordId: id,
      requestMetadata: getAuditRequestMetadata(request),
    });

    if (!deletedRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      recordId: deletedRecord.recordId,
      message: `${deletedRecord.title} deleted successfully.`,
      unpinnedCids: deletedRecord.unpinnedCids,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record delete error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to unpin one or more version files from IPFS. The record was restored.",
      },
      { status: 502 }
    );
  }
}
