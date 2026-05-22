import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../../lib/errors.js";
import { uploadDoctorProfileImage } from "../../lib/s3-upload.js";
import {
  doctorAppointmentsQuerySchema,
  doctorAppointmentStatusSchema,
  updateDoctorProfileSchema,
} from "./doctor.schemas.js";
import * as doctorService from "./doctor.service.js";

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const profile = await doctorService.getDoctorProfile(request.server, request.user.sub);
  return reply.send({ doctor: profile });
}

export async function listAppointments(request: FastifyRequest, reply: FastifyReply) {
  const q = doctorAppointmentsQuerySchema.parse(request.query);
  const result = await doctorService.listDoctorAppointments(
    request.server,
    request.user.sub,
    q.date
  );
  return reply.send(result);
}

export async function patchAppointmentStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = doctorAppointmentStatusSchema.parse(request.body);
  const updated = await doctorService.updateDoctorAppointmentStatus(
    request.server,
    request.user.sub,
    id,
    body.status
  );
  return reply.send({ appointment: updated });
}

export async function patchProfile(request: FastifyRequest, reply: FastifyReply) {
  const body = updateDoctorProfileSchema.parse(request.body);
  const doctor = await doctorService.updateDoctorProfile(request.server, request.user.sub, body);
  return reply.send({ doctor });
}

export async function uploadPhoto(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();
  if (!file) {
    throw new AppError(400, 'Missing file field "file"', "NO_FILE");
  }
  const mime = (file.mimetype || "").toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime)) {
    throw new AppError(400, "Image must be JPEG, PNG, or WebP", "INVALID_TYPE");
  }
  const buffer = await file.toBuffer();
  const imageUrl = await uploadDoctorProfileImage(buffer, mime === "image/jpg" ? "image/jpeg" : mime);
  return reply.send({ imageUrl });
}
