import type { FastifyInstance } from "fastify";
import { broadcastDoctor } from "../../realtime/queue-hub.js";
import * as doctorsService from "../doctors/doctors.service.js";

export async function emitDoctorQueue(app: FastifyInstance, doctorId: string, dateStr: string) {
  const snapshot = await doctorsService.getQueueSnapshot(app, doctorId, dateStr);
  broadcastDoctor(doctorId, { event: "token_updated", payload: snapshot });
  broadcastDoctor(doctorId, {
    event: "current_token_changed",
    payload: { current: snapshot.current, date: snapshot.date, doctorId },
  });
}
