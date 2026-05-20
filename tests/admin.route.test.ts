import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/lib/authorization";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getTenantAdminOverview: vi.fn(),
  createWorkspace: vi.fn(),
  addMember: vi.fn(),
  updateMembership: vi.fn(),
  disableMembership: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/admin", () => ({
  getTenantAdminOverview: mocks.getTenantAdminOverview,
  createWorkspace: mocks.createWorkspace,
  addMember: mocks.addMember,
  updateMembership: mocks.updateMembership,
  disableMembership: mocks.disableMembership,
}));

import { GET as getTenantAdmin } from "@/app/api/admin/tenant/route";
import { POST as createWorkspaceRoute } from "@/app/api/admin/workspaces/route";
import { POST as addMemberRoute } from "@/app/api/admin/members/route";
import {
  DELETE as disableMemberRoute,
  PATCH as updateMemberRoute,
} from "@/app/api/admin/members/[membershipId]/route";

describe("admin routes", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getTenantAdminOverview.mockReset();
    mocks.createWorkspace.mockReset();
    mocks.addMember.mockReset();
    mocks.updateMembership.mockReset();
    mocks.disableMembership.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "ORG_ADMIN",
    });
  });

  it("returns the tenant admin overview", async () => {
    mocks.getTenantAdminOverview.mockResolvedValue({
      organization: { id: "org-1", name: "Org", slug: "org" },
      activeWorkspace: { id: "workspace-1", name: "General", slug: "general" },
      workspaces: [],
      members: [],
    });

    const response = await getTenantAdmin();

    expect(response.status).toBe(200);
    expect(mocks.getTenantAdminOverview).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1" })
    );
    await expect(response.json()).resolves.toMatchObject({
      organization: { id: "org-1" },
    });
  });

  it("creates a workspace", async () => {
    mocks.createWorkspace.mockResolvedValue({
      id: "workspace-2",
      name: "Compliance",
      slug: "compliance",
    });

    const response = await createWorkspaceRoute(
      new Request("http://localhost/api/admin/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Compliance" }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1" }),
      { name: "Compliance" },
      expect.any(Object)
    );
  });

  it("adds an existing user as a member", async () => {
    mocks.addMember.mockResolvedValue({
      membershipId: "membership-2",
      email: "member@example.com",
      role: "REVIEWER",
    });

    const response = await addMemberRoute(
      new Request("http://localhost/api/admin/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          workspaceId: "workspace-1",
          role: "REVIEWER",
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.addMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1" }),
      {
        email: "member@example.com",
        workspaceId: "workspace-1",
        role: "REVIEWER",
      },
      expect.any(Object)
    );
  });

  it("updates a membership role", async () => {
    mocks.updateMembership.mockResolvedValue({
      membershipId: "membership-2",
      role: "RECORDS_MANAGER",
    });

    const response = await updateMemberRoute(
      new Request("http://localhost/api/admin/members/membership-2", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "RECORDS_MANAGER" }),
      }),
      { params: Promise.resolve({ membershipId: "membership-2" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateMembership).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1" }),
      "membership-2",
      { role: "RECORDS_MANAGER" },
      expect.any(Object)
    );
  });

  it("disables a membership", async () => {
    mocks.disableMembership.mockResolvedValue({ success: true });

    const response = await disableMemberRoute(
      new Request("http://localhost/api/admin/members/membership-2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ membershipId: "membership-2" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.disableMembership).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1" }),
      "membership-2",
      expect.any(Object)
    );
  });

  it("returns authorization errors cleanly", async () => {
    mocks.getTenantAdminOverview.mockRejectedValue(
      new AuthorizationError(403, "Only organization admins can manage tenant settings.")
    );

    const response = await getTenantAdmin();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Only organization admins can manage tenant settings.",
    });
  });
});
