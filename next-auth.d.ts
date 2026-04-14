import type { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      membershipId?: string | null;
      organizationId?: string | null;
      organizationName?: string | null;
      workspaceId?: string | null;
      workspaceName?: string | null;
      role?: Role | null;
    };
  }

  interface User {
    id: string;
    membershipId?: string | null;
    organizationId?: string | null;
    organizationName?: string | null;
    workspaceId?: string | null;
    workspaceName?: string | null;
    role?: Role | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    membershipId?: string | null;
    organizationId?: string | null;
    organizationName?: string | null;
    workspaceId?: string | null;
    workspaceName?: string | null;
    role?: Role | null;
  }
}
