import type { FastifyInstance } from "fastify";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../lib/errors.js";
import { dateOnlyUtc } from "../../lib/time.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import { updateAppointmentStatus } from "../appointments/appointments.service.js";
import type { updateDoctorProfileSchema } from "./doctor.schemas.js";
import type { z } from "zod";

function toDoctorProfileDto(
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
    experience: string | null;
    qualification: string | null;
    imageUrl: string | null;
    department: { id: string; name: string };
    user: { email: string } | null;
  }
) {
  return {
    id: doctor.id,
    name: doctor.name,
    specialization: doctor.specialization,
    experience: doctor.experience,
    qualification: doctor.qualification,
    imageUrl: doctor.imageUrl,
    department: doctor.department,
    email: doctor.user?.email ?? null,
  };
}

export async function getDoctorIdForUser(app: FastifyInstance, userId: string): Promise<string> {
  const doctor = await app.prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, active: true },
  });
  if (!doctor) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  if (!doctor.active) throw new AppError(403, "Doctor account is inactive", "DOCTOR_INACTIVE");
  return doctor.id;
}

export async function getDoctorProfile(app: FastifyInstance, userId: string) {
  const doctor = await app.prisma.doctor.findUnique({
    where: { userId },
    include: {
      department: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!doctor) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  return toDoctorProfileDto(doctor);
}

export async function updateDoctorProfile(
  app: FastifyInstance,
  userId: string,
  body: z.infer<typeof updateDoctorProfileSchema>
) {
  const existing = await app.prisma.doctor.findUnique({
    where: { userId },
    include: {
      department: { select: { id: true, name: true } },
      user: { select: { id: true, email: true } },
    },
  });
  if (!existing) throw new AppError(403, "Doctor profile not found", "NOT_DOCTOR");
  await getDoctorIdForUser(app, userId);

  if (body.email && existing.user) {
    const emailOwner = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (emailOwner && emailOwner.id !== existing.user.id) {
      throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }
  }

  return app.prisma.$transaction(async (tx) => {
    if (existing.user) {
      const userData: Prisma.UserUpdateInput = {};
      if (body.email) userData.email = body.email;
      if (body.password) userData.passwordHash = await bcrypt.hash(body.password, 10);
      if (body.name) userData.name = body.name;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: existing.user!.id }, data: userData });
      }
    }

    const data: Prisma.DoctorUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.specialization !== undefined) data.specialization = body.specialization || null;
    if (body.experience !== undefined) data.experience = body.experience.length > 0 ? body.experience : null;
    if (body.qualification !== undefined) {
      data.qualification = body.qualification.length > 0 ? body.qualification : null;
    }
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl.length > 0 ? body.imageUrl : null;

    const updated = await tx.doctor.update({
      where: { id: existing.id },
      data,
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return toDoctorProfileDto(updated);
  });
}

export async function listDoctorAppointments(
  app: FastifyInstance,
  userId: string,
  dateStr: string
) {
  const doctorId = await getDoctorIdForUser(app, userId);
  const rows = await app.prisma.appointment.findMany({
    where: { doctorId, date: dateOnlyUtc(dateStr) },
    orderBy: { tokenNumber: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    date: dateStr,
    appointments: rows.map((a) => ({
      id: a.id,
      patient: { id: a.user.id, name: a.user.name, email: a.user.email },
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      token: formatTokenDisplay(a.tokenNumber),
    })),
  };
}

export async function updateDoctorAppointmentStatus(
  app: FastifyInstance,
  userId: string,
  appointmentId: string,
  status: AppointmentStatus
) {
  const doctorId = await getDoctorIdForUser(app, userId);
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
