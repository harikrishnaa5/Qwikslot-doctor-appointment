import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { BOOKING_SLOT_STEP_MINUTES } from "../../lib/slots-config.js";
import { toDateOnlyIso, utcDateTime } from "../../lib/time.js";

export async function listDepartments(app: FastifyInstance) {
  return app.prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

export async function listDoctors(app: FastifyInstance, departmentId?: string) {
  return app.prisma.doctor.findMany({
    where: {
      active: true,
      ...(departmentId ? { departmentId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      specialization: true,
      experience: true,
      qualification: true,
      imageUrl: true,
      department: { select: { id: true, name: true } },
    },
  });
}

export async function getDoctor(app: FastifyInstance, id: string) {
  const doctor = await app.prisma.doctor.findFirst({
    where: { id, active: true },
    select: {
      id: true,
      name: true,
      specialization: true,
      experience: true,
      qualification: true,
      imageUrl: true,
      department: { select: { id: true, name: true, description: true } },
    },
  });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");
  return doctor;
}

export async function getAvailableSlots(app: FastifyInstance, doctorId: string, dateStr: string) {
  const doctor = await app.prisma.doctor.findFirst({ where: { id: doctorId, active: true } });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const day = utcDateTime(dateStr, "00:00");
  const availabilities = await app.prisma.availability.findMany({
    where: { doctorId, date: day },
  });
  if (availabilities.length === 0) return { date: dateStr, slots: [] as { start: string; end: string }[] };

  const booked = await app.prisma.appointment.findMany({
    where: {
      doctorId,
      date: day,
      status: { notIn: ["CANCELLED"] },
    },
    select: { scheduledAt: true },
  });
  const bookedSet = new Set(booked.map((b) => b.scheduledAt.toISOString()));

  const slots: { start: string; end: string }[] = [];
  const stepMs = BOOKING_SLOT_STEP_MINUTES * 60_000;
  for (const a of availabilities) {
    let cur = utcDateTime(dateStr, a.startTime);
    const end = utcDateTime(dateStr, a.endTime);
    while (cur.getTime() + stepMs <= end.getTime()) {
      const next = new Date(cur.getTime() + stepMs);
      const iso = cur.toISOString();
      if (!bookedSet.has(iso)) {
        slots.push({ start: iso, end: next.toISOString() });
      }
      cur = next;
    }
  }

  slots.sort((x, y) => x.start.localeCompare(y.start));

  const nowMs = Date.now();
  const futureOnly = slots.filter((s) => new Date(s.start).getTime() > nowMs);

  return { date: dateStr, slots: futureOnly };
}

export async function getQueueSnapshot(app: FastifyInstance, doctorId: string, dateStr?: string) {
  const doctor = await app.prisma.doctor.findFirst({ where: { id: doctorId } });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const dayStr = dateStr ?? toDateOnlyIso(new Date());
  const day = utcDateTime(dayStr, "00:00");

  const list = await app.prisma.appointment.findMany({
    where: { doctorId, date: day, status: { notIn: ["CANCELLED"] } },
    orderBy: [{ tokenNumber: "asc" }],
    select: {
      id: true,
      tokenNumber: true,
      status: true,
      scheduledAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  const inProgress = list.find((x) => x.status === "IN_PROGRESS");
  const waiting = list.filter((x) => x.status === "WAITING");

  return {
    doctorId,
    date: dayStr,
    current: inProgress
      ? { token: `${doctorId}--${inProgress.tokenNumber}`, appointmentId: inProgress.id }
      : null,
    nextWaiting: waiting[0]
      ? { token: `${doctorId}--${waiting[0].tokenNumber}`, appointmentId: waiting[0].id }
      : null,
    appointments: list.map((a) => ({
      id: a.id,
      token: `${doctorId}--${a.tokenNumber}`,
      tokenNumber: a.tokenNumber,
      status: a.status,
      scheduledAt: a.scheduledAt.toISOString(),
      patientName: a.user.name,
    })),
  };
}
