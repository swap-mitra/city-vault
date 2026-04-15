import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  deleteRecordAndVersions,
  getLegacyRecordByCid,
  getRecordDetail,
  RecordConflictError,
  serializeLegacyFile,
} from "@/lib/records";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "files.read", {
      allowLegacyUserWithoutMembership: true,
    });

    const legacyRecord = await getLegacyRecordByCid(currentUser, cid);

    if (!legacyRecord) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const detail = await getRecordDetail(currentUser, legacyRecord.record.id);

    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serializeLegacyFile(detail));
  } catch (error) {
    if (error instanceof RecordConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          recordId: error.recordId,
        },
        { status: error.status }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("File fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "files.delete", {
      allowLegacyUserWithoutMembership: true,
    });

    const legacyRecord = await getLegacyRecordByCid(currentUser, cid);

    if (!legacyRecord) {
      return NextResponse.json(
        { error: "File not found or not owned by user" },
        { status: 404 }
      );
    }

    const deletedRecord = await deleteRecordAndVersions({
      currentUser,
      recordId: legacyRecord.record.id,
      requestMetadata: getAuditRequestMetadata(request),
    });

    if (!deletedRecord) {
      return NextResponse.json(
        { error: "File not found or not owned by user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      unpinnedFromIpfs: deletedRecord.unpinnedCids.includes(cid),
      message: `${deletedRecord.title} deleted successfully.`,
    });
  } catch (error) {
    if (error instanceof RecordConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          recordId: error.recordId,
        },
        { status: error.status }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to unpin one or more version files from IPFS. The record was restored.",
      },
      { status: 502 }
    );
  }
}
