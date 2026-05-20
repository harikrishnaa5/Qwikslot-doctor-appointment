import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../../lib/errors.js";
import * as mock from "./mock-payment.service.js";
import { mockIntentSchema } from "./payments.schemas.js";

export async function createMockIntent(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const body = mockIntentSchema.parse(request.body);
    const result = mock.createMockIntent({
      userId: request.user.sub,
      doctorId: body.doctorId,
      scheduledAt: body.scheduledAt,
    });
    return reply.status(201).send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}
