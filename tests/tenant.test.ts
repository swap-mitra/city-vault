import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  membershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: mocks.membershipFindFirst,
    },
  },
}));

import { resolveActiveMembership } from "@/lib/tenant";

describe("tenant membership resolution", () => {
  beforeEach(() => {
    mocks.membershipFindFirst.mockReset();
  });

  it("only resolves active memberships in active workspaces", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      organizationId: "org-1",
      workspaceId: "workspace-1",
      role: "ORG_ADMIN",
      organization: { name: "Org" },
      workspace: { name: "General" },
    });

    const membership = await resolveActiveMembership("user-1");

    expect(mocks.membershipFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          status: "ACTIVE",
          workspace: {
            isActive: true,
          },
        },
      })
    );
    expect(membership).toMatchObject({
      membershipId: "membership-1",
      organizationId: "org-1",
      workspaceId: "workspace-1",
      role: "ORG_ADMIN",
    });
  });
});
