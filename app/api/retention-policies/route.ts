import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { listRetentionPolicies } from "@/lib/records";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.retention.manage", {
      allowLegacyUserWithoutMembership: true,
    });

    const policies = await listRetentionPolicies(currentUser);
    return NextResponse.json(policies);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Retention policies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch retention policies" },
      { status: 500 }
    );
  }
}
