import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/rate-limit";

const mocks = vi.hoisted(() => ({
  prismaUserFindUnique: vi.fn(),
  prismaUserCreate: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.prismaUserFindUnique,
      create: mocks.prismaUserCreate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}));

import { POST } from "@/app/api/register/route";

describe("register route", () => {
  beforeEach(() => {
    resetRateLimitStore();
    mocks.prismaUserFindUnique.mockReset();
    mocks.prismaUserCreate.mockReset();
    mocks.bcryptHash.mockReset();
    mocks.bcryptHash.mockResolvedValue("hashed-password");
  });

  it("normalizes email and trims the name before creating a user", async () => {
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaUserCreate.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          name: "  Test User  ",
          email: "  USER@Example.com  ",
          password: "password123",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(mocks.prismaUserFindUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mocks.prismaUserCreate).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "user@example.com",
        passwordHash: "hashed-password",
      },
    });
  });

  it("rate limits repeated registration attempts from the same identity", async () => {
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaUserCreate.mockResolvedValue({ id: "user-1" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(
        new Request("http://localhost/api/register", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.10",
          },
          body: JSON.stringify({
            email: "repeat@example.com",
            password: "password123",
          }),
        }) as never
      );

      expect(response.status).toBe(200);
    }

    const rateLimitedResponse = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          email: "repeat@example.com",
          password: "password123",
        }),
      }) as never
    );

    expect(rateLimitedResponse.status).toBe(429);
    await expect(rateLimitedResponse.json()).resolves.toMatchObject({
      error: "Too many registration attempts. Try again in a few minutes.",
    });
  });
});