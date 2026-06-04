import type { FastifyInstance } from "fastify";
import type { AppointmentStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../lib/errors.js";
import { assertEmailAvailable } from "../../lib/account.js";
import {
  appointmentPatientSelect,
  asDoctorProfileRow,
  asDoctorUncheckedUpdate,
  asUserSelect,
} from "../../lib/prisma-bridge.js";
import { dateOnlyUtc } from "../../lib/time.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import { updateAppointmentStatus } from "../appointments/appointments.service.js";
import type { updateDoctorProfileSchema } from "./doctor.schemas.js";
import type { z } from "zod";

function toDoctorProfileDto(doctor: ReturnType<typeof asDoctorProfileRow>) {
  return {
    id: doctor.id,
    name: doctor.name,
    email: doctor.email,
    specialization: doctor.specialization,
    experience: doctor.experience,
    qualification: doctor.qualification,
    imageUrl: doctor.imageUrl,
    department: doctor.department,
  };
}

export async function getDoctorIdForAccount(app: FastifyInstance, doctorId: string): Promise<string> {
  const doctor = await app.prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, active: true },
  });
  if (!doctor) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  if (!doctor.active) throw new AppError(403, "Doctor account is inactive", "DOCTOR_INACTIVE");
  return doctor.id;
}

export async function getDoctorProfile(app: FastifyInstance, doctorId: string) {
  const doctor = await app.prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      department: { select: { id: true, name: true } },
    },
  });
  if (!doctor) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  return toDoctorProfileDto(asDoctorProfileRow(doctor));
}

export async function updateDoctorProfile(
  app: FastifyInstance,
  doctorId: string,
  body: z.infer<typeof updateDoctorProfileSchema>
) {
  const existing = await app.prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      department: { select: { id: true, name: true } },
    },
  });
  if (!existing) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  await getDoctorIdForAccount(app, doctorId);

  if (body.email) {
    await assertEmailAvailable(app, body.email, { doctorId });
  }

  const patch: Record<string, unknown> = {};
  if (body.email) patch.email = body.email;
  if (body.password) patch.passwordHash = await bcrypt.hash(body.password, 10);
  if (body.name !== undefined) patch.name = body.name;
  if (body.specialization !== undefined) patch.specialization = body.specialization || null;
  if (body.experience !== undefined) patch.experience = body.experience.length > 0 ? body.experience : null;
  if (body.qualification !== undefined) {
    patch.qualification = body.qualification.length > 0 ? body.qualification : null;
  }
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl.length > 0 ? body.imageUrl : null;

  const updated = await app.prisma.doctor.update({
    where: { id: doctorId },
    data: asDoctorUncheckedUpdate(patch),
    include: {
      department: { select: { id: true, name: true } },
    },
  });
  return toDoctorProfileDto(asDoctorProfileRow(updated));
}

export async function listDoctorAppointments(
  app: FastifyInstance,
  doctorId: string,
  dateStr: string
) {
  await getDoctorIdForAccount(app, doctorId);
  const rows = await app.prisma.appointment.findMany({
    where: { doctorId, date: dateOnlyUtc(dateStr) },
    orderBy: { tokenNumber: "asc" },
    include: {
      user: { select: asUserSelect(appointmentPatientSelect) },
    },
  });

  type ApptRow = (typeof rows)[number] & {
    user: { id: string; name: string; email: string; phone: string | null };
  };

  return {
    date: dateStr,
    appointments: (rows as ApptRow[]).map((a) => ({
      id: a.id,
      patient: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        phone: a.user.phone,
      },
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      token: formatTokenDisplay(a.tokenNumber),
    })),
  };
}

export async function updateDoctorAppointmentStatus(
  app: FastifyInstance,
  doctorId: string,
  appointmentId: string,
  status: AppointmentStatus
) {
  await getDoctorIdForAccount(app, doctorId);
  const existing = await app.prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { doctorId: true },
  });
  if (!existing) throw new AppError(404, "Appointment not found", "NOT_FOUND");
  if (existing.doctorId !== doctorId) {
    throw new AppError(403, "Not allowed to update this appointment", "FORBIDDEN");
  }
  return updateAppointmentStatus(app, appointmentId, status);
}
