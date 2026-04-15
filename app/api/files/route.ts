import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import {
  getLegacyRecordByCid,
  getRecordDetail,
  listRecords,
  mapRecordSummaryToLegacyFile,
  RecordConflictError,
  serializeLegacyFile,
} from "@/lib/records";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "files.read", {
      allowLegacyUserWithoutMembership: true,
    });

    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");
    const filename = searchParams.get("filename")?.trim() || undefined;

    if (cid) {
      const legacyRecord = await getLegacyRecordByCid(currentUser, cid);

      if (!legacyRecord) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const detail = await getRecordDetail(currentUser, legacyRecord.record.id);

      if (!detail) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return NextResponse.json(serializeLegacyFile(detail));
    }

    const records = await listRecords(currentUser);
    const filteredRecords = filename
      ? records.filter((record) =>
          record.latestVersion.originalFilename
            .toLowerCase()
            .includes(filename.toLowerCase())
        )
      : records;

    return NextResponse.json(
      filteredRecords.map((record) => mapRecordSummaryToLegacyFile(record))
    );
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

    console.error("Files fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
