import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { resolveActiveMembership } from "@/lib/tenant";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const email = normalizeEmail(credentials.email);
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) return null;

        const membership = await resolveActiveMembership(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          membershipId: membership?.membershipId ?? null,
          organizationId: membership?.organizationId ?? null,
          organizationName: membership?.organizationName ?? null,
          workspaceId: membership?.workspaceId ?? null,
          workspaceName: membership?.workspaceName ?? null,
          role: membership?.role ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        const membership = await resolveActiveMembership(token.id);
        token.membershipId = membership?.membershipId ?? null;
        token.organizationId = membership?.organizationId ?? null;
        token.organizationName = membership?.organizationName ?? null;
        token.workspaceId = membership?.workspaceId ?? null;
        token.workspaceName = membership?.workspaceName ?? null;
        token.role = membership?.role ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id;
        session.user.membershipId = token.membershipId ?? null;
        session.user.organizationId = token.organizationId ?? null;
        session.user.organizationName = token.organizationName ?? null;
        session.user.workspaceId = token.workspaceId ?? null;
        session.user.workspaceName = token.workspaceName ?? null;
        session.user.role = token.role ?? null;
      }

      return session;
    },
  },
};
