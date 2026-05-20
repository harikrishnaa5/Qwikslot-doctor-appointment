import type { FastifyInstance } from "fastify";
import { broadcastSession } from "../../realtime/queue-hub.js";
import * as queueService from "./queue.service.js";

export async function emitSessionQueue(
  app: FastifyInstance,
  sessionId: string,
  patientAppointmentId?: string
) {
  const snapshot = await queueService.buildQueueSnapshot(app, sessionId, {
    patientAppointmentId,
  });
  broadcastSession(sessionId, { event: "queue_updated", payload: snapshot });
  broadcastSession(sessionId, {
    event: "current_token_changed",
    payload: {
      sessionId,
      doctorId: snapshot.doctorId,
      date: snapshot.date,
      current: snapshot.current,
      currentToken: snapshot.session.currentToken,
    },
  });
}
