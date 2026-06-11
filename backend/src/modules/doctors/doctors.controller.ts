import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../../lib/errors.js";
import * as service from "./doctors.service.js";
import { doctorListQuerySchema, queueQuerySchema, slotsQuerySchema } from "./doctors.schemas.js";

export async function listDepartments(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await service.listDepartments(request.server);
    return reply.send({ departments: rows });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listDoctors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = doctorListQuerySchema.parse(request.query);
    const rows = await service.listDoctors(request.server, q.departmentId);
    return reply.send({ doctors: rows });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getDoctor(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const doctor = await service.getDoctor(request.server, id);
    return reply.send({ doctor });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getSlots(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const q = slotsQuerySchema.parse(request.query);
    const userId = request.user?.role === "USER" ? request.user.sub : undefined;
    const result = await service.getAvailableSlots(request.server, id, q.date, userId);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getQueue(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const q = queueQuerySchema.parse(request.query);
    const result = await service.getQueueSnapshot(
      request.server,
      id,
      q.date,
      q.sessionId,
      q.appointmentId
    );
    return reply.send({ queue: result });
  } catch (err) {
    return sendError(reply, err);
  }
}
