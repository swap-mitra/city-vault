import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/rate-limit";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prismaFileFindFirst: vi.fn(),
  prismaFileCreate: vi.fn(),
  uploadFile: vi.fn(),
  getGatewayUrl: vi.fn((cid: string) => `https://gateway.test/ipfs/${cid}`),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      findFirst: mocks.prismaFileFindFirst,
      create: mocks.prismaFileCreate,
    },
  },
}));

vi.mock("@/lib/pinata", () => ({
  getGatewayUrl: mocks.getGatewayUrl,
  getPinataClient: () => ({
    upload: {
      file: mocks.uploadFile,
    },
  }),
}));

import { POST } from "@/app/api/upload/route";

describe("upload route", () => {
  beforeEach(() => {
    resetRateLimitStore();
    mocks.getCurrentUser.mockReset();
    mocks.prismaFileFindFirst.mockReset();
    mocks.prismaFileCreate.mockReset();
    mocks.uploadFile.mockReset();
    mocks.getGatewayUrl.mockClear();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
    });
  });

  it("rejects unsupported file types before uploading to Pinata", async () => {
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
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });
});