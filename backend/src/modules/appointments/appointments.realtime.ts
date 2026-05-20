import type { FastifyInstance } from "fastify";
import { emitSessionQueue as broadcastSessionQueue } from "../queue/queue.realtime.js";

export async function emitSessionQueue(
  app: FastifyInstance,
  sessionId: string,
  patientAppointmentId?: string
) {
  return broadcastSessionQueue(app, sessionId, patientAppointmentId);
}
