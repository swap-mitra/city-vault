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
  type RecordListFilters,
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
    const status = searchParams.get("status")?.trim() || undefined;
    const validStatuses = ["DRAFT", "UNDER_REVIEW", "APPROVED", "ARCHIVED"];
    const filters: RecordListFilters = {
      query: searchParams.get("query")?.trim() || undefined,
      status: status && validStatuses.includes(status) ? (status as RecordListFilters["status"]) : undefined,
      recordType: searchParams.get("recordType")?.trim() || undefined,
      classification: searchParams.get("classification")?.trim() || undefined,
      department: searchParams.get("department")?.trim() || undefined,
      tag: searchParams.get("tag")?.trim() || undefined,
      documentNumber: searchParams.get("documentNumber")?.trim() || undefined,
      cid: searchParams.get("cid")?.trim() || undefined,
      checksumSha256: searchParams.get("checksumSha256")?.trim() || undefined,
      holdState: searchParams.get("holdState") === "held" || searchParams.get("holdState") === "clear"
        ? (searchParams.get("holdState") as RecordListFilters["holdState"])
        : undefined,
      retentionState:
        searchParams.get("retentionState") === "assigned" ||
        searchParams.get("retentionState") === "unassigned" ||
        searchParams.get("retentionState") === "due"
          ? (searchParams.get("retentionState") as RecordListFilters["retentionState"])
          : undefined,
      effectiveFrom: searchParams.get("effectiveFrom")?.trim() || undefined,
      effectiveTo: searchParams.get("effectiveTo")?.trim() || undefined,
      expiryFrom: searchParams.get("expiryFrom")?.trim() || undefined,
      expiryTo: searchParams.get("expiryTo")?.trim() || undefined,
    };
    const records = await listRecords(currentUser, filters);

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
    const recordType = formData.get("recordType");
    const classification = formData.get("classification");
    const department = formData.get("department");
    const documentNumber = formData.get("documentNumber");
    const tags = formData.get("tags");
    const effectiveDate = formData.get("effectiveDate");
    const expiryDate = formData.get("expiryDate");
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
      recordType: typeof recordType === "string" ? recordType : null,
      classification: typeof classification === "string" ? classification : null,
      department: typeof department === "string" ? department : null,
      documentNumber: typeof documentNumber === "string" ? documentNumber : null,
      tags: typeof tags === "string" ? tags : null,
      effectiveDate: typeof effectiveDate === "string" ? effectiveDate : null,
      expiryDate: typeof expiryDate === "string" ? expiryDate : null,
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
