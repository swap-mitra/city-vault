import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  authorizeTenantAccess,
  hasPermission,
} from "@/lib/authorization";

describe("authorization helper", () => {
  it("allows org admins to manage tenant settings", () => {
    expect(hasPermission("ORG_ADMIN", "tenant.manage")).toBe(true);
  });

  it("allows contributors to create records, append versions, and submit for review", () => {
    expect(hasPermission("CONTRIBUTOR", "records.create")).toBe(true);
    expect(hasPermission("CONTRIBUTOR", "records.version.create")).toBe(true);
    expect(hasPermission("CONTRIBUTOR", "records.review.submit")).toBe(true);
  });

  it("allows reviewers to approve review decisions but not create records", () => {
    expect(hasPermission("REVIEWER", "records.read")).toBe(true);
    expect(hasPermission("REVIEWER", "records.review.approve")).toBe(true);
    expect(hasPermission("REVIEWER", "records.create")).toBe(false);
  });

  it("allows records managers to archive records", () => {
    expect(hasPermission("RECORDS_MANAGER", "records.archive")).toBe(true);
  });

  it("blocks contributors from reading audit trails", () => {
    expect(hasPermission("CONTRIBUTOR", "audit.read")).toBe(false);
  });

  it("rejects tenant-scoped actions when there is no active membership", () => {
    expect(() =>
      authorizeTenantAccess(
        {
          membershipId: null,
          organizationId: null,
          workspaceId: null,
          role: null,
        },
        "tenant.read"
      )
    ).toThrowError(AuthorizationError);
  });
});
