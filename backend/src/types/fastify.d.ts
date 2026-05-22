import type { AppPrismaClient } from "../lib/prisma-client.js";
import type { JwtPayload } from "../modules/auth/auth.types";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: AppPrismaClient;
  }
}
