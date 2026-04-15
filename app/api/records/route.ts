import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { getAuditRequestMetadata } from "@/lib/audit";
import {
  createRecordWithInitialVersion,
  listRecords,
} from "@/lib/records";
import { validateUploadFile } from "@/upload-validation";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.read", {
      allowLegacyUserWithoutMembership: true,
    });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || undefined;
    const records = await listRecords(currentUser, query);

    return NextResponse.json(records);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Records fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.create", {
      allowLegacyUserWithoutMembership: true,
    });

    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const maybeFile = formData.get("file");

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Record title is required." },
        { status: 400 }
      );
    }

    if (!(maybeFile instanceof File) || maybeFile.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = validateUploadFile(maybeFile);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const createdRecord = await createRecordWithInitialVersion({
      currentUser,
      title,
      description: typeof description === "string" ? description : null,
      file: maybeFile,
      requestMetadata: getAuditRequestMetadata(request),
    });

    return NextResponse.json(createdRecord, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Record create error:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}
