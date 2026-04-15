import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getLegacyRecordByCid: vi.fn(),
  getRecordDetail: vi.fn(),
  deleteRecordAndVersions: vi.fn(),
  serializeLegacyFile: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", async () => {
  const actual = await vi.importActual<typeof import("@/lib/records")>("@/lib/records");

  return {
    ...actual,
    getLegacyRecordByCid: mocks.getLegacyRecordByCid,
    getRecordDetail: mocks.getRecordDetail,
    deleteRecordAndVersions: mocks.deleteRecordAndVersions,
    serializeLegacyFile: mocks.serializeLegacyFile,
  };
});

import { DELETE, GET } from "@/app/api/files/[cid]/route";
import { RecordConflictError } from "@/lib/records";

describe("file CID compatibility route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getLegacyRecordByCid.mockReset();
    mocks.getRecordDetail.mockReset();
    mocks.deleteRecordAndVersions.mockReset();
    mocks.serializeLegacyFile.mockReset();

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

  it("returns 404 when the requested file is not owned by the current user", async () => {
    mocks.getLegacyRecordByCid.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/files/cid-1") as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns legacy single-version data for compatibility callers", async () => {
    mocks.getLegacyRecordByCid.mockResolvedValue({
      record: { id: "record-1" },
    });
    mocks.getRecordDetail.mockResolvedValue({
      recordId: "record-1",
      latestVersion: {
        cid: "cid-1",
      },
    });
    mocks.serializeLegacyFile.mockReturnValue({
      id: "record-1",
      recordId: "record-1",
      filename: "report.pdf",
      cid: "cid-1",
      fileSize: 1024,
      mimeType: "application/pdf",
      uploadedAt: "2026-04-15T00:00:00.000Z",
      gatewayUrl: "https://gateway.test/ipfs/cid-1",
    });

    const response = await GET(
      new Request("http://localhost/api/files/cid-1") as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
      cid: "cid-1",
    });
  });

  it("returns 409 when the target record has multiple versions", async () => {
    mocks.getLegacyRecordByCid.mockRejectedValue(
      new RecordConflictError(
        "This record has multiple versions. Use the records API instead.",
        "record-1"
      )
    );

    const response = await GET(
      new Request("http://localhost/api/files/cid-1") as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
    });
  });

  it("deletes the backing record for single-version compatibility deletes", async () => {
    mocks.getLegacyRecordByCid.mockResolvedValue({
      record: { id: "record-1" },
    });
    mocks.deleteRecordAndVersions.mockResolvedValue({
      recordId: "record-1",
      title: "Compliance register",
      unpinnedCids: ["cid-1"],
    });

    const response = await DELETE(
      new Request("http://localhost/api/files/cid-1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteRecordAndVersions).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "record-1",
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      unpinnedFromIpfs: true,
    });
  });
});
