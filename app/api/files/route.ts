import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");
    const filename = searchParams.get("filename");

    if (cid) {
      const file = await prisma.file.findUnique({
        where: { cid },
        include: {
          user: { select: { email: true, name: true } },
        },
      });

      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return NextResponse.json({
        ...file,
        gatewayUrl: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${file.cid}`,
      });
    }

    const where: any = { userId: user.id };

    if (filename) {
      where.filename = {
        contains: filename,
        mode: "insensitive",
      };
    }

    const files = await prisma.file.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
    });

    const mapped = files.map((f) => ({
      ...f,
      gatewayUrl: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${f.cid}`,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Files fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
