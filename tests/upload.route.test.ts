import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/rate-limit";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createRecordWithInitialVersion: vi.fn(),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/records", () => ({
  createRecordWithInitialVersion: mocks.createRecordWithInitialVersion,
}));

import { POST } from "@/app/api/upload/route";

describe("upload route", () => {
  beforeEach(() => {
    resetRateLimitStore();
    mocks.getCurrentUser.mockReset();
    mocks.createRecordWithInitialVersion.mockReset();
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
  });

  it("rejects unsupported file types before creating a record", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["binary"], "malware.exe", {
        type: "application/x-msdownload",
      })
    );

    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error:
        "Unsupported file type. Upload an image, PDF, text, JSON, CSV, or ZIP file.",
    });
    expect(mocks.createRecordWithInitialVersion).not.toHaveBeenCalled();
  });

  it("creates a legacy record using the filename as the title", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["hello"], "report.pdf", {
        type: "application/pdf",
      })
    );

    mocks.createRecordWithInitialVersion.mockResolvedValue({
      recordId: "record-1",
      latestVersion: {
        cid: "cid-1",
        originalFilename: "report.pdf",
        gatewayUrl: "https://gateway.test/ipfs/cid-1",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      }) as never
    );

    expect(response.status).toBe(200);
    expect(mocks.createRecordWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "report.pdf",
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      recordId: "record-1",
      cid: "cid-1",
      filename: "report.pdf",
    });
  });
});
