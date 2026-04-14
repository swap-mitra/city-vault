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
