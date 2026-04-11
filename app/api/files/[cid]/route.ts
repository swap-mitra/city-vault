import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/current-user";
import { getGatewayUrl, getPinataClient } from "@/lib/pinata";

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

    const file = await prisma.file.findFirst({
      where: {
        cid,
        userId: currentUser.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...file,
      gatewayUrl: getGatewayUrl(file.cid),
    });
  } catch (error) {
    console.error("File fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = await prisma.file.findFirst({
      where: {
        cid,
        userId: currentUser.id,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or not owned by user" },
        { status: 404 }
      );
    }

    const deletedFile = await prisma.file.delete({
      where: { id: file.id },
    });

    const remainingReferences = await prisma.file.count({
      where: { cid },
    });

    if (remainingReferences > 0) {
      return NextResponse.json({
        success: true,
        unpinnedFromIpfs: false,
        message:
          "File deleted from your vault. The IPFS pin remains because another vault entry still references it.",
      });
    }

    try {
      await getPinataClient().unpin([cid]);
    } catch (error) {
      await prisma.file.create({
        data: {
          id: deletedFile.id,
          filename: deletedFile.filename,
          cid: deletedFile.cid,
          fileSize: deletedFile.fileSize,
          mimeType: deletedFile.mimeType,
          uploadedAt: deletedFile.uploadedAt,
          userId: deletedFile.userId,
        },
      });

      console.error("Unpin error:", error);
      return NextResponse.json(
        {
          error:
            "Failed to unpin the file from IPFS. Your vault entry was restored.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      unpinnedFromIpfs: true,
      message: "File deleted from your vault and unpinned from IPFS.",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}