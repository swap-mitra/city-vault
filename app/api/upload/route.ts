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

    const uploaded = await pinata.upload.file(file);
    const cid = uploaded.IpfsHash;

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
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
