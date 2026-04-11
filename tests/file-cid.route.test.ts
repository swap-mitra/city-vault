import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prismaFileFindFirst: vi.fn(),
  prismaFileDelete: vi.fn(),
  prismaFileCreate: vi.fn(),
  prismaFileCount: vi.fn(),
  unpin: vi.fn(),
  getGatewayUrl: vi.fn((cid: string) => `https://gateway.test/ipfs/${cid}`),
}));

vi.mock("@/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      findFirst: mocks.prismaFileFindFirst,
      delete: mocks.prismaFileDelete,
      create: mocks.prismaFileCreate,
      count: mocks.prismaFileCount,
    },
  },
}));

vi.mock("@/lib/pinata", () => ({
  getGatewayUrl: mocks.getGatewayUrl,
  getPinataClient: () => ({
    unpin: mocks.unpin,
  }),
}));

import { DELETE, GET } from "@/app/api/files/[cid]/route";

describe("file CID route", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.prismaFileFindFirst.mockReset();
    mocks.prismaFileDelete.mockReset();
    mocks.prismaFileCreate.mockReset();
    mocks.prismaFileCount.mockReset();
    mocks.unpin.mockReset();
    mocks.getGatewayUrl.mockClear();
  });

  it("returns 404 when the requested file is not owned by the current user", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.prismaFileFindFirst.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/files/cid-1") as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(404);
  });

  it("does not unpin a CID that is still referenced by another file record", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.prismaFileFindFirst.mockResolvedValue({ id: "file-1", cid: "cid-1" });
    mocks.prismaFileDelete.mockResolvedValue({ id: "file-1", cid: "cid-1" });
    mocks.prismaFileCount.mockResolvedValue(1);

    const response = await DELETE(
      new Request("http://localhost/api/files/cid-1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prismaFileDelete).toHaveBeenCalledWith({ where: { id: "file-1" } });
    expect(mocks.unpin).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      unpinnedFromIpfs: false,
    });
  });

  it("restores the database record if unpinning fails", async () => {
    const deletedFile = {
      id: "file-1",
      cid: "cid-1",
      filename: "report.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      uploadedAt: new Date("2024-01-01T00:00:00.000Z"),
      userId: "user-1",
    };

    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.prismaFileFindFirst.mockResolvedValue(deletedFile);
    mocks.prismaFileDelete.mockResolvedValue(deletedFile);
    mocks.prismaFileCount.mockResolvedValue(0);
    mocks.unpin.mockRejectedValue(new Error("pinata unavailable"));

    const response = await DELETE(
      new Request("http://localhost/api/files/cid-1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ cid: "cid-1" }) }
    );

    expect(response.status).toBe(502);
    expect(mocks.prismaFileCreate).toHaveBeenCalledWith({
      data: deletedFile,
    });
  });
});