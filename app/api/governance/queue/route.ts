import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { listGovernanceQueue } from "@/lib/records";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.governance.read", {
      allowLegacyUserWithoutMembership: true,
    });

    const queue = await listGovernanceQueue(currentUser);
    return NextResponse.json(queue);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Governance queue fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch governance queue" },
      { status: 500 }
    );
  }
}
