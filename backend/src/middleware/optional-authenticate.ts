import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../modules/auth/auth.types.js";

/** Sets request.user when a valid Bearer token is present; otherwise leaves it unset. */
export async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return;

  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch {
    // Ignore invalid tokens on optional routes.
  }
}
