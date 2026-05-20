import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

export function requireRoles(...roles: Role[]) {
  return async function requireRolesHandler(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }
  };
}
