import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/current-user";
import { getGatewayUrl, getPinataClient } from "@/lib/pinata";
import {
  consumeRateLimit,
  createRateLimitResponse,
  getRequestIdentity,
} from "@/rate-limit";
import { validateUploadFile } from "@/upload-validation";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata, writeAuditEvent } from "@/lib/audit";

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

    const uploaded = await getPinataClient().upload.file(maybeFile);
    const cid = uploaded.IpfsHash;
    const requestMetadata = getAuditRequestMetadata(request);

    const existingFile = await prisma.file.findFirst({
      where: {
        cid,
        userId: currentUser.id,
      },
    });

    if (existingFile) {
      const gatewayUrl = getGatewayUrl(cid);

      await writeAuditEvent({
        action: "file.upload.duplicate",
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorName: currentUser.name,
        membershipId: currentUser.membershipId,
        organizationId: currentUser.organizationId,
        workspaceId: currentUser.workspaceId,
        targetType: "File",
        targetId: existingFile.id,
        metadata: {
          cid,
          filename: existingFile.filename,
        },
        ...requestMetadata,
      });

      return NextResponse.json({
        success: true,
        cid,
        filename: existingFile.filename,
        fileId: existingFile.id,
        gatewayUrl,
        message: "File already exists in your vault.",
      });
    }

    const record = await prisma.file.create({
      data: {
        filename: maybeFile.name,
        cid,
        fileSize: Number(maybeFile.size),
        mimeType: maybeFile.type,
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        workspaceId: currentUser.workspaceId,
      },
    });

    await writeAuditEvent({
      action: "file.upload.created",
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorName: currentUser.name,
      membershipId: currentUser.membershipId,
      organizationId: currentUser.organizationId,
      workspaceId: currentUser.workspaceId,
      targetType: "File",
      targetId: record.id,
      metadata: {
        cid,
        filename: record.filename,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
      },
      ...requestMetadata,
    });

    return NextResponse.json({
      success: true,
      cid,
      filename: record.filename,
      fileId: record.id,
      gatewayUrl: getGatewayUrl(cid),
      message: `${record.filename} uploaded successfully.`,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Upload error:", error);

    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "This file is already in your vault" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
