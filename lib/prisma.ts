import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { PoolConfig } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL!,
};

const adapter = new PrismaNeon(poolConfig);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
