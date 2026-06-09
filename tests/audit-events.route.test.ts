import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/lib/authorization";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listAuditEvents: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/audit-explorer", () => ({
  listAuditEvents: mocks.listAuditEvents,
}));

import { GET } from "@/app/api/audit/events/route";

describe("audit events route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.listAuditEvents.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "auditor-1",
      email: "auditor@example.com",
      name: "Auditor",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "AUDITOR",
    });
  });

  it("passes audit filters to the service", async () => {
    mocks.listAuditEvents.mockResolvedValue({
      events: [
        {
          id: "audit-1",
          action: "record.create",
          actorEmail: "user@example.com",
          actorName: "User",
          targetType: "Record",
          targetId: "record-1",
          ipAddress: null,
          userAgent: null,
          metadata: { title: "Policy" },
          createdAt: "2026-06-09T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/audit/events?action=record&targetType=Record") as never
    );

    expect(response.status).toBe(200);
    expect(mocks.listAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ id: "auditor-1" }),
      expect.objectContaining({ action: "record", targetType: "Record" })
    );
  });

  it("returns authorization failures cleanly", async () => {
    mocks.listAuditEvents.mockRejectedValue(
      new AuthorizationError(403, "Your role does not allow this action in the active workspace.")
    );

    const response = await GET(new Request("http://localhost/api/audit/events") as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Your role does not allow this action in the active workspace.",
    });
  });
});
