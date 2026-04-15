import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import {
  consumeRateLimit,
  createRateLimitResponse,
  getRequestIdentity,
} from "@/rate-limit";
import { getAuditRequestMetadata } from "@/lib/audit";
import { createRecordWithInitialVersion } from "@/lib/records";
import { validateUploadFile } from "@/upload-validation";

const uploadRateLimit = {
  bucket: "upload",
  max: 20,
  windowMs: 10 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "files.upload", {
      allowLegacyUserWithoutMembership: true,
    });

    const rateLimit = consumeRateLimit({
      ...uploadRateLimit,
      key: `${currentUser.id}:${getRequestIdentity(request)}`,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(
        rateLimit,
        "Upload limit reached. Try again in a few minutes."
      );
    }

    const formData = await request.formData();
    const maybeFile = formData.get("file");

    if (!(maybeFile instanceof File) || maybeFile.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = validateUploadFile(maybeFile);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const createdRecord = await createRecordWithInitialVersion({
      currentUser,
      title: maybeFile.name,
      description: null,
      file: maybeFile,
      requestMetadata: getAuditRequestMetadata(request),
    });

    return NextResponse.json({
      success: true,
      recordId: createdRecord.recordId,
      cid: createdRecord.latestVersion.cid,
      filename: createdRecord.latestVersion.originalFilename,
      fileId: createdRecord.recordId,
      gatewayUrl: createdRecord.latestVersion.gatewayUrl,
      message: `${createdRecord.latestVersion.originalFilename} uploaded successfully.`,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
