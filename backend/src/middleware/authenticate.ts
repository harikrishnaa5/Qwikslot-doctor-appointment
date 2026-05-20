import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../modules/auth/auth.types.js";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
