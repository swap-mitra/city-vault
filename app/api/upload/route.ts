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

    const existingFile = await prisma.file.findFirst({
      where: {
        cid,
        userId: currentUser.id,
      },
    });

    if (existingFile) {
      const gatewayUrl = getGatewayUrl(cid);

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
      },
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