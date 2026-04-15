import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRecordDetail: vi.fn(),
  deleteRecordAndVersions: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  getRecordDetail: mocks.getRecordDetail,
  deleteRecordAndVersions: mocks.deleteRecordAndVersions,
}));

import { DELETE, GET } from "@/app/api/records/[id]/route";

describe("record id route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getRecordDetail.mockReset();
    mocks.deleteRecordAndVersions.mockReset();

    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      membershipId: "membership-1",
      organizationId: "org-1",
      organizationName: "Org",
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
      role: "CONTRIBUTOR",
    });
  });

  it("returns record detail with ordered versions", async () => {
    mocks.getRecordDetail.mockResolvedValue({
      recordId: "record-1",
      title: "Compliance register",
      description: null,
      createdAt: "2026-04-15T00:00:00.000Z",
      updatedAt: "2026-04-15T00:00:00.000Z",
      versionCount: 2,
      latestVersion: {
        id: "version-2",
        versionNumber: 2,
        cid: "cid-2",
        originalFilename: "register-v2.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedAt: "2026-04-15T00:00:00.000Z",
        gatewayUrl: "https://gateway.test/ipfs/cid-2",
      },
      versions: [
        {
          id: "version-2",
          versionNumber: 2,
          cid: "cid-2",
          originalFilename: "register-v2.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedAt: "2026-04-15T00:00:00.000Z",
          gatewayUrl: "https://gateway.test/ipfs/cid-2",
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/records/record-1") as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
      versionCount: 2,
    });
  });

  it("deletes a record and returns the unpinned cid list", async () => {
    mocks.deleteRecordAndVersions.mockResolvedValue({
      recordId: "record-1",
      title: "Compliance register",
      versionCount: 2,
      unpinnedCids: ["cid-1", "cid-2"],
    });

    const response = await DELETE(
      new Request("http://localhost/api/records/record-1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
      unpinnedCids: ["cid-1", "cid-2"],
    });
  });
});
