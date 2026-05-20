import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { BOOKING_SLOT_STEP_MINUTES } from "../../lib/slots-config.js";
import { dateOnlyUtc, localDateTime, toDateOnlyIso } from "../../lib/time.js";
import * as queueService from "../queue/queue.service.js";
import * as sessionService from "../queue/session.service.js";

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

  const day = dateOnlyUtc(dateStr);
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
    let cur = localDateTime(dateStr, a.startTime);
    const end = localDateTime(dateStr, a.endTime);
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

/** Queue snapshot for a doctor on a date (resolves session automatically). */
export async function getQueueSnapshot(
  app: FastifyInstance,
  doctorId: string,
  dateStr?: string,
  sessionId?: string,
  patientAppointmentId?: string
) {
  const dayStr = dateStr ?? toDateOnlyIso(new Date());
  const session = await sessionService.resolveSessionForQueueView(
    app,
    doctorId,
    dayStr,
    sessionId
  );
  return queueService.buildQueueSnapshot(app, session.id, { patientAppointmentId });
}
