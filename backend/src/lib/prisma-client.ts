import { PrismaClient, type Prisma } from "@prisma/client";

/** Prisma client typed from the current `schema.prisma` (run `npm run db:generate` after schema changes). */
export type AppPrismaClient = PrismaClient;

export function createPrismaClient(options?: Prisma.PrismaClientOptions): AppPrismaClient {
  return new PrismaClient(options);
}
