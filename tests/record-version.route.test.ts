import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockRecordConflictError extends Error {
    status: number;
    recordId: string;

    constructor(message: string, recordId: string, status = 409) {
      super(message);
      this.name = "RecordConflictError";
      this.status = status;
      this.recordId = recordId;
    }
  }

  return {
    getCurrentUser: vi.fn(),
    appendRecordVersion: vi.fn(),
    RecordConflictError: MockRecordConflictError,
  };
});

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  appendRecordVersion: mocks.appendRecordVersion,
  RecordConflictError: mocks.RecordConflictError,
}));

import { POST } from "@/app/api/records/[id]/versions/route";

describe("record versions route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.appendRecordVersion.mockReset();
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

  it("adds a new version to an existing record", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["pdf"], "register-v2.pdf", { type: "application/pdf" })
    );

    mocks.appendRecordVersion.mockResolvedValue({
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
      versions: [],
    });

    const response = await POST(
      new Request("http://localhost/api/records/record-1/versions", {
        method: "POST",
        body: formData,
      }) as never,
      { params: Promise.resolve({ id: "record-1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.appendRecordVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "record-1",
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      latestVersion: {
        versionNumber: 2,
      },
    });
  });
});
