import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../../lib/errors.js";
import * as authService from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = registerSchema.parse(request.body);
    const result = await authService.registerUser(request.server, body);
    return reply.status(201).send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = loginSchema.parse(request.body);
    const result = await authService.loginUser(request.server, body);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const user = await authService.getMe(request.server, request.user.sub);
    return reply.send({ user });
  } catch (err) {
    return sendError(reply, err);
  }
}
