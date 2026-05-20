import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../../lib/errors.js";
import { toDateOnlyIso } from "../../lib/time.js";
import * as queueService from "./queue.service.js";
import * as sessionService from "./session.service.js";
import {
  createSessionSchema,
  dateQuerySchema,
  patchSessionSchema,
  queueByDoctorQuerySchema,
  skipPatientSchema,
} from "./queue.schemas.js";

export async function getSessionQueue(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { sessionId } = request.params as { sessionId: string };
    const q = request.query as { appointmentId?: string };
    const snapshot = await queueService.getQueueStatus(
      request.server,
      sessionId,
      q.appointmentId
    );
    return reply.send({ queue: snapshot });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getDoctorQueue(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { doctorId } = request.params as { doctorId: string };
    const q = queueByDoctorQuerySchema.parse(request.query);
    const dateStr = q.date ?? toDateOnlyIso(new Date());
    const session = await sessionService.resolveSessionForQueueView(
      request.server,
      doctorId,
      dateStr,
      q.sessionId
    );
    const snapshot = await queueService.getQueueStatus(request.server, session.id);
    return reply.send({ queue: snapshot });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listSessions(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { doctorId } = request.params as { doctorId: string };
    const q = dateQuerySchema.parse(request.query);
    const sessions = await sessionService.listDoctorSessions(
      request.server,
      doctorId,
      q.date
    );
    return reply.send({ sessions });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createSession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = createSessionSchema.parse(request.body);
    const session = await sessionService.createDoctorSession(request.server, body);
    return reply.status(201).send({ session });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchSession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { sessionId } = request.params as { sessionId: string };
    const body = patchSessionSchema.parse(request.body);
    const session = await sessionService.patchDoctorSession(request.server, sessionId, body);
    return reply.send({ session });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function nextPatient(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { sessionId } = request.params as { sessionId: string };
    const result = await queueService.nextPatient(request.server, sessionId);
    const { emitSessionQueue } = await import("./queue.realtime.js");
    await emitSessionQueue(request.server, sessionId);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function skipPatient(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { sessionId } = request.params as { sessionId: string };
    const body = skipPatientSchema.parse(request.body ?? {});
    const result = await queueService.skipPatient(
      request.server,
      sessionId,
      body.appointmentId
    );
    const { emitSessionQueue } = await import("./queue.realtime.js");
    await emitSessionQueue(request.server, sessionId);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function completeAppointment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { appointmentId } = request.params as { appointmentId: string };
    const result = await queueService.completePatient(request.server, appointmentId);
    const { emitSessionQueue } = await import("./queue.realtime.js");
    await emitSessionQueue(request.server, result.appointment.sessionId);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function checkInAppointment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { appointmentId } = request.params as { appointmentId: string };
    const result = await queueService.checkInPatient(request.server, appointmentId);
    const { emitSessionQueue } = await import("./queue.realtime.js");
    await emitSessionQueue(request.server, result.appointment.sessionId);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}
