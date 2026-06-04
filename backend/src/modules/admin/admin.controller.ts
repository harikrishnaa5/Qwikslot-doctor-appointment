import type { FastifyReply, FastifyRequest } from "fastify";
import { uploadDoctorProfileImage } from "../../lib/s3-upload.js";
import { z } from "zod";
import { AppError, sendError } from "../../lib/errors.js";
import { toDateOnlyIso } from "../../lib/time.js";
import * as adminService from "./admin.service.js";
import * as appointmentService from "../appointments/appointments.service.js";
import { patchAppointmentStatusSchema } from "../appointments/appointments.schemas.js";
import {
  adminAppointmentListSchema,
  adminResourceListQuerySchema,
  adminPatientListQuerySchema,
  adminUserListQuerySchema,
  createDepartmentSchema,
  createDoctorSchema,
  createStaffUserSchema,
  patchSuperUserSchema,
  updateDepartmentSchema,
  updateDoctorSchema,
  patchAvailabilitySchema,
  upsertAvailabilitySchema,
} from "./admin.schemas.js";

const queueDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function listDepartments(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = adminResourceListQuerySchema.parse(request.query);
    const result = await adminService.listDepartmentsAdmin(request.server, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createDepartment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = createDepartmentSchema.parse(request.body);
    const row = await adminService.createDepartment(request.server, body);
    return reply.status(201).send({ department: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function updateDepartment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const body = updateDepartmentSchema.parse(request.body);
    const row = await adminService.updateDepartment(request.server, id, body);
    return reply.send({ department: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteDepartment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    await adminService.deleteDepartment(request.server, id);
    return reply.status(204).send();
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listDoctors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = adminResourceListQuerySchema.parse(request.query);
    const result = await adminService.listDoctorsAdmin(request.server, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function uploadDoctorPhoto(request: FastifyRequest, reply: FastifyReply) {
  try {
    const file = await request.file();
    if (!file) {
      return sendError(reply, new AppError(400, 'Missing file field "file"', "NO_FILE"));
    }
    const mime = (file.mimetype || "").toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime)) {
      return sendError(reply, new AppError(400, "Image must be JPEG, PNG, or WebP", "INVALID_TYPE"));
    }
    const buffer = await file.toBuffer();
    const imageUrl = await uploadDoctorProfileImage(buffer, mime === "image/jpg" ? "image/jpeg" : mime);
    return reply.send({ imageUrl });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createDoctor(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = createDoctorSchema.parse(request.body);
    const row = await adminService.createDoctor(request.server, body);
    return reply.status(201).send({ doctor: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function updateDoctor(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const body = updateDoctorSchema.parse(request.body);
    const row = await adminService.updateDoctor(request.server, id, body);
    return reply.send({ doctor: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteDoctor(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const row = await adminService.deactivateDoctor(request.server, id);
    return reply.send({ doctor: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function setAvailability(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = upsertAvailabilitySchema.parse(request.body);
    const row = await adminService.setAvailability(request.server, body);
    return reply.status(201).send({ availability: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listAvailability(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { doctorId } = request.params as { doctorId: string };
    const q = adminResourceListQuerySchema.parse(request.query);
    const result = await adminService.listAvailabilities(request.server, doctorId, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchAvailability(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const body = patchAvailabilitySchema.parse(request.body);
    const row = await adminService.patchAvailability(request.server, id, body);
    return reply.send({ availability: row });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteAvailability(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    await adminService.deleteAvailability(request.server, id);
    return reply.status(204).send();
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listAppointments(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = adminAppointmentListSchema.parse(request.query);
    const result = await adminService.listAppointmentsAdmin(request.server, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchAppointmentStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const body = patchAppointmentStatusSchema.parse(request.body);
    const result = await appointmentService.updateAppointmentStatus(request.server, id, body.status);
    return reply.send({ appointment: result });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function advanceQueue(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { doctorId } = request.params as { doctorId: string };
    const q = queueDateSchema.parse(request.query);
    const dateStr = q.date ?? toDateOnlyIso(new Date());
    const result = await appointmentService.advanceQueue(request.server, doctorId, dateStr);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listRegisteredUsers(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = adminPatientListQuerySchema.parse(request.query);
    const result = await adminService.listPatientsAdmin(request.server, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listSuperAdmins(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = adminUserListQuerySchema.parse(request.query);
    const result = await adminService.listAdminStaff(request.server, q);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = createStaffUserSchema.parse(request.body);
    const user = await adminService.createUserAsSuper(request.server, body);
    return reply.status(201).send({ user });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchSuperUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const body = patchSuperUserSchema.parse(request.body);
    const user = await adminService.patchUserAsSuper(request.server, id, body);
    return reply.send({ user });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteSuperUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    await adminService.deleteUserAsSuper(request.server, id);
    return reply.status(204).send();
  } catch (err) {
    return sendError(reply, err);
  }
}
