import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listRecords: vi.fn(),
  createRecordWithInitialVersion: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  listRecords: mocks.listRecords,
  createRecordWithInitialVersion: mocks.createRecordWithInitialVersion,
}));

import { GET, POST } from "@/app/api/records/route";

describe("records route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.listRecords.mockReset();
    mocks.createRecordWithInitialVersion.mockReset();

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

  it("lists scoped records with version summaries", async () => {
    mocks.listRecords.mockResolvedValue([
      {
        recordId: "record-1",
        title: "Compliance register",
        description: "Monthly summary",
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
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/records?query=compliance") as never
    );

    expect(response.status).toBe(200);
    expect(mocks.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      "compliance"
    );
    await expect(response.json()).resolves.toMatchObject([
      {
        recordId: "record-1",
        versionCount: 2,
      },
    ]);
  });

  it("creates a record with its first version", async () => {
    const formData = new FormData();
    formData.append("title", "Compliance register");
    formData.append("description", "Monthly summary");
    formData.append(
      "file",
      new File(["pdf"], "register.pdf", { type: "application/pdf" })
    );

    mocks.createRecordWithInitialVersion.mockResolvedValue({
      recordId: "record-1",
      title: "Compliance register",
      description: "Monthly summary",
      createdAt: "2026-04-15T00:00:00.000Z",
      updatedAt: "2026-04-15T00:00:00.000Z",
      versionCount: 1,
      latestVersion: {
        id: "version-1",
        versionNumber: 1,
        cid: "cid-1",
        originalFilename: "register.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedAt: "2026-04-15T00:00:00.000Z",
        gatewayUrl: "https://gateway.test/ipfs/cid-1",
      },
      versions: [],
    });

    const response = await POST(
      new Request("http://localhost/api/records", {
        method: "POST",
        body: formData,
      }) as never
    );

    expect(response.status).toBe(201);
    expect(mocks.createRecordWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Compliance register",
        description: "Monthly summary",
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
      title: "Compliance register",
    });
  });
});
