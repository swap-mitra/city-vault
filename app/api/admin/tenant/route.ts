import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import { getTenantAdminOverview } from "@/lib/admin";
import { AuthorizationError } from "@/lib/authorization";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const overview = await getTenantAdminOverview(currentUser);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Tenant admin overview error:", error);
    return NextResponse.json(
      { error: "Failed to load tenant administration overview" },
      { status: 500 }
    );
  }
}
