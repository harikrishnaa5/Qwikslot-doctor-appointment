import type { FastifyInstance } from "fastify";
import type { PublicUser } from "../modules/auth/auth.types.js";

/** CRUD surface used by auth refresh-token flows (matches Prisma `refreshToken` delegate). */
export type RefreshTokenDb = {
  findUnique(args: {
    where: { tokenHash: string };
    include: { user: { select: Record<string, boolean> } };
  }): Promise<{
    id: string;
    revokedAt: Date | null;
    expiresAt: Date;
    user: PublicUser;
  } | null>;
  update(args: { where: { id: string }; data: { revokedAt: Date } }): Promise<unknown>;
  updateMany(args: {
    where: { tokenHash: string; revokedAt: null };
    data: { revokedAt: Date };
  }): Promise<{ count: number }>;
  create(args: {
    data: { userId: string; tokenHash: string; expiresAt: Date };
  }): Promise<unknown>;
};

/** Access `prisma.refreshToken` after `npm run db:generate`. */
export function prismaRefreshToken(app: FastifyInstance): RefreshTokenDb {
  return (app.prisma as unknown as { refreshToken: RefreshTokenDb }).refreshToken;
}
