import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pinata } from "@/lib/pinata";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;

    const file = await prisma.file.findUnique({
      where: { cid },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...file,
      gatewayUrl: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${file.cid}`,
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

    const file = await prisma.file.findFirst({
      where: {
        cid,
        userId: user.id,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or not owned by user" },
        { status: 404 }
      );
    }

    await prisma.file.delete({
      where: { id: file.id },
    });

    try {
      await pinata.unpin([cid]);
    } catch (e) {
      console.warn("Failed to unpin from Pinata, ignoring", e);
    }

    return NextResponse.json({ success: true, message: "File deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
