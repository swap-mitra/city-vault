import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pinata } from "@/lib/pinata";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to IPFS via Pinata
    const uploaded = await pinata.upload.file(file);
    const cid = uploaded.IpfsHash;

    // Check if this CID already exists for this user
    const existingFile = await prisma.file.findFirst({
      where: {
        cid,
        userId: user.id,
      },
    });

    if (existingFile) {
      // File already exists for this user, return existing record
      const gatewayUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`;

      return NextResponse.json({
        success: true,
        cid,
        filename: existingFile.filename,
        fileId: existingFile.id,
        gatewayUrl,
        message: "File already exists in your vault",
      });
    }

    // Check if CID exists for another user
    const existingCid = await prisma.file.findUnique({
      where: { cid },
    });

    if (existingCid) {
      // CID exists for another user, create new record for current user
      // Note: Pinata will deduplicate the file automatically
      const record = await prisma.file.create({
        data: {
          filename: file.name,
          cid,
          fileSize: Number(file.size),
          mimeType: file.type,
          userId: user.id,
        },
      });

      const gatewayUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`;

      return NextResponse.json({
        success: true,
        cid,
        filename: record.filename,
        fileId: record.id,
        gatewayUrl,
      });
    }

    // New file, create record
    const record = await prisma.file.create({
      data: {
        filename: file.name,
        cid,
        fileSize: Number(file.size),
        mimeType: file.type,
        userId: user.id,
      },
    });

    const gatewayUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`;

    return NextResponse.json({
      success: true,
      cid,
      filename: record.filename,
      fileId: record.id,
      gatewayUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Check if it's a Prisma unique constraint error
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "This file has already been uploaded" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
