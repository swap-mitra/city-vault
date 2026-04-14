import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { GET } from "@/app/api/tenant/context/route";

describe("tenant context route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
  });

  it("returns tenant context for users with an active membership", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "ORG_ADMIN",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      organizationId: "org-1",
      workspaceId: "workspace-1",
      role: "ORG_ADMIN",
      permissions: {
        canManageTenant: true,
        canReadAudit: true,
      },
    });
  });

  it("blocks users without a membership from tenant-scoped context", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      membershipId: null,
      organizationId: null,
      organizationName: null,
      workspaceId: null,
      workspaceName: null,
      role: null,
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "No active organization membership was found for this account.",
    });
  });
});
