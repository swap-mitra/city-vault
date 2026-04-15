import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import { appendRecordVersion } from "@/lib/records";
import { validateUploadFile } from "@/upload-validation";

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

    authorizeTenantAccess(currentUser, "records.version.create", {
      allowLegacyUserWithoutMembership: true,
    });

    const formData = await request.formData();
    const maybeFile = formData.get("file");

    if (!(maybeFile instanceof File) || maybeFile.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = validateUploadFile(maybeFile);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updatedRecord = await appendRecordVersion({
      currentUser,
      recordId: id,
      file: maybeFile,
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

    console.error("Record version create error:", error);
    return NextResponse.json(
      { error: "Failed to add record version" },
      { status: 500 }
    );
  }
}
