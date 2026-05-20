import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../../lib/errors.js";
import * as service from "./appointments.service.js";
import {
  appointmentListQuerySchema,
  bookAppointmentSchema,
  patchAppointmentStatusSchema,
  patchMyAppointmentSchema,
} from "./appointments.schemas.js";

export async function book(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const body = bookAppointmentSchema.parse(request.body);
    const result = await service.bookAppointment(request.server, request.user.sub, body);
    return reply.status(201).send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listMine(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const q = appointmentListQuerySchema.parse(request.query);
    const result = await service.listMyAppointments(request.server, request.user.sub, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getMine(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const { id } = request.params as { id: string };
    const result = await service.getMyAppointment(request.server, request.user.sub, id);
    return reply.send({ appointment: result });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchMine(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const { id } = request.params as { id: string };
    patchMyAppointmentSchema.parse(request.body);
    await service.dismissScheduleNotice(request.server, request.user.sub, id);
    return reply.send({ ok: true });
  } catch (err) {
    return sendError(reply, err);
  }
}
