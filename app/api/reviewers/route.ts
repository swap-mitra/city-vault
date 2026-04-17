import { NextResponse } from "next/server";
import { getCurrentUser } from "@/current-user";
import {
  AuthorizationError,
  authorizeTenantAccess,
} from "@/lib/authorization";
import { listEligibleReviewers } from "@/lib/records";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authorizeTenantAccess(currentUser, "records.review.submit", {
      allowLegacyUserWithoutMembership: true,
    });

    const reviewers = await listEligibleReviewers(currentUser);
    return NextResponse.json(reviewers);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Eligible reviewers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviewers" },
      { status: 500 }
    );
  }
}
