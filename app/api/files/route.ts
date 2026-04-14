import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/current-user";
import { getGatewayUrl } from "@/lib/pinata";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";

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
    const filename = searchParams.get("filename");

    if (cid) {
      const file = await prisma.file.findFirst({
        where: {
          cid,
          userId: currentUser.id,
        },
      });

      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return NextResponse.json({
        ...file,
        gatewayUrl: getGatewayUrl(file.cid),
      });
    }

    const where: Prisma.FileWhereInput = { userId: currentUser.id };

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

    return NextResponse.json(
      files.map((file) => ({
        ...file,
        gatewayUrl: getGatewayUrl(file.cid),
      }))
    );
  } catch (error) {
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
