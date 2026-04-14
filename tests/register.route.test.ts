import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/rate-limit";

const mocks = vi.hoisted(() => ({
  prismaUserFindUnique: vi.fn(),
  prismaUserCreate: vi.fn(),
  prismaOrganizationCount: vi.fn(),
  prismaOrganizationFindUnique: vi.fn(),
  prismaOrganizationCreate: vi.fn(),
  prismaWorkspaceCreate: vi.fn(),
  prismaMembershipCreate: vi.fn(),
  prismaAuditCreate: vi.fn(),
  prismaTransaction: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.prismaUserFindUnique,
      create: mocks.prismaUserCreate,
    },
    organization: {
      count: mocks.prismaOrganizationCount,
      findUnique: mocks.prismaOrganizationFindUnique,
      create: mocks.prismaOrganizationCreate,
    },
    workspace: {
      create: mocks.prismaWorkspaceCreate,
    },
    membership: {
      create: mocks.prismaMembershipCreate,
    },
    auditEvent: {
      create: mocks.prismaAuditCreate,
    },
    $transaction: mocks.prismaTransaction,
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
    mocks.prismaOrganizationCount.mockReset();
    mocks.prismaOrganizationFindUnique.mockReset();
    mocks.prismaOrganizationCreate.mockReset();
    mocks.prismaWorkspaceCreate.mockReset();
    mocks.prismaMembershipCreate.mockReset();
    mocks.prismaAuditCreate.mockReset();
    mocks.prismaTransaction.mockReset();
    mocks.bcryptHash.mockReset();

    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.prismaOrganizationFindUnique.mockResolvedValue(null);
    mocks.prismaAuditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.prismaTransaction.mockImplementation(async (callback) =>
      callback({
        user: {
          create: mocks.prismaUserCreate,
        },
        organization: {
          count: mocks.prismaOrganizationCount,
          findUnique: mocks.prismaOrganizationFindUnique,
          create: mocks.prismaOrganizationCreate,
        },
        workspace: {
          create: mocks.prismaWorkspaceCreate,
        },
        membership: {
          create: mocks.prismaMembershipCreate,
        },
      })
    );
  });

  it("normalizes email and trims the name before creating a user", async () => {
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaOrganizationCount.mockResolvedValue(1);
    mocks.prismaUserCreate.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
    });

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

  it("bootstraps the first organization and admin membership on first registration", async () => {
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaOrganizationCount.mockResolvedValue(0);
    mocks.prismaUserCreate.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
    });
    mocks.prismaOrganizationCreate.mockResolvedValue({
      id: "org-1",
      name: "Test User Records",
      slug: "test-user-records",
    });
    mocks.prismaWorkspaceCreate.mockResolvedValue({
      id: "workspace-1",
      name: "General Records",
      slug: "general-records",
    });
    mocks.prismaMembershipCreate.mockResolvedValue({
      id: "membership-1",
      role: "ORG_ADMIN",
    });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          email: "user@example.com",
          password: "password123",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(mocks.prismaOrganizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Test User Records",
        slug: "test-user-records",
      },
    });
    expect(mocks.prismaWorkspaceCreate).toHaveBeenCalledWith({
      data: {
        name: "General Records",
        slug: "general-records",
        organizationId: "org-1",
      },
    });
    expect(mocks.prismaMembershipCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        organizationId: "org-1",
        workspaceId: "workspace-1",
        role: "ORG_ADMIN",
        isDefault: true,
      },
    });
  });

  it("rate limits repeated registration attempts from the same identity", async () => {
    mocks.prismaUserFindUnique.mockResolvedValue(null);
    mocks.prismaOrganizationCount.mockResolvedValue(1);
    mocks.prismaUserCreate.mockResolvedValue({
      id: "user-1",
      name: null,
      email: "repeat@example.com",
    });

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
