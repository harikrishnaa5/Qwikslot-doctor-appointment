import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof ZodError) {
    return reply.status(400).send({
      error: "Validation error",
      details: err.flatten(),
    });
  }
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
    });
  }
  reply.log.error(err);
  return reply.status(500).send({ error: "Internal server error" });
}
