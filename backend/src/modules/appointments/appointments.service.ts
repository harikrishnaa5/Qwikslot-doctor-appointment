import type { FastifyInstance } from "fastify";
import { AppointmentStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { skipTake } from "../../lib/pagination.js";
import { assertBookableAppointmentDate, assertOneAppointmentPerDoctorDay } from "../../lib/booking-rules.js";
import { dateOnlyUtc, toDateOnlyIso } from "../../lib/time.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import * as mockPayment from "../payments/mock-payment.service.js";
import * as doctorsService from "../doctors/doctors.service.js";
import * as sessionService from "../queue/session.service.js";
import * as tokenService from "../queue/token.service.js";
import * as realtime from "./appointments.realtime.js";
import type { bookAppointmentSchema, appointmentListQuerySchema } from "./appointments.schemas.js";
import type { z } from "zod";

export async function bookAppointment(
  app: FastifyInstance,
  userId: string,
  body: z.infer<typeof bookAppointmentSchema>
) {
  const payment = mockPayment.consumeMockIntent(body.paymentRef, userId);
  const scheduledAt = new Date(body.scheduledAt);
  const scheduledIso = scheduledAt.toISOString();

  if (payment.doctorId !== body.doctorId) {
    throw new AppError(400, "Payment doctor mismatch", "PAYMENT_MISMATCH");
  }
  if (payment.scheduledAt !== scheduledIso) {
    throw new AppError(400, "Payment slot mismatch", "PAYMENT_MISMATCH");
  }

  const dateStr = toDateOnlyIso(scheduledAt);
  assertBookableAppointmentDate(dateStr);
  const { slots } = await doctorsService.getAvailableSlots(app, body.doctorId, dateStr);
  const slotOk = slots.some((s) => s.start === scheduledIso);
  if (!slotOk) throw new AppError(400, "Slot is no longer available", "SLOT_TAKEN");

  const date = dateOnlyUtc(dateStr);
  await assertOneAppointmentPerDoctorDay(app.prisma, userId, body.doctorId, date);

  const session = await sessionService.resolveSessionForBooking(
    app,
    body.doctorId,
    scheduledAt,
    dateStr
  );

  try {
    const appointment = await app.prisma.$transaction(async (tx) => {
      await assertOneAppointmentPerDoctorDay(tx, userId, body.doctorId, date);
      const tokenNumber = await tokenService.issueNextToken(tx, session.id);

      return tx.appointment.create({
        data: {
          doctorId: body.doctorId,
          sessionId: session.id,
          userId,
          scheduledAt,
          date,
          tokenNumber,
          status: AppointmentStatus.BOOKED,
          paymentRef: body.paymentRef,
          notes: body.notes,
        },
        include: {
          doctor: { select: { id: true, name: true } },
          session: { select: { id: true, label: true } },
        },
      });
    });

    return {
      appointment: {
        id: appointment.id,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.name,
        sessionId: session.id,
        sessionLabel: session.label,
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
        token: formatTokenDisplay(appointment.tokenNumber),
        tokenNumber: appointment.tokenNumber,
      },
    };
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      const target = (
        typeof e === "object" && e !== null && "meta" in e
          ? (e as { meta?: { target?: string[] | false } }).meta?.target
          : undefined
      );
      if (
        Array.isArray(target) &&
        target.includes("userId") &&
        target.includes("doctorId") &&
        target.includes("date")
      ) {
        throw new AppError(
          409,
          "You already have an appointment with this doctor on this day",
          "DUPLICATE_DOCTOR_DAY"
        );
      }
      throw new AppError(409, "That slot was just booked", "SLOT_CONFLICT");
    }
    throw e;
  }
}

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
] as const;

export async function listMyAppointments(
  app: FastifyInstance,
  userId: string,
  q: z.infer<typeof appointmentListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const where = {
    userId,
    ...(q.doctorId ? { doctorId: q.doctorId } : {}),
    ...(q.date
      ? {
          date: dateOnlyUtc(q.date),
        }
      : {}),
    ...(q.scope === "active"
      ? { status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } }
      : q.scope === "history"
        ? { status: { notIn: [...ACTIVE_APPOINTMENT_STATUSES] } }
        : {}),
  };

  const [total, rows] = await Promise.all([
    app.prisma.appointment.count({ where }),
    app.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        doctorId: true,
        sessionId: true,
        scheduledAt: true,
        status: true,
        tokenNumber: true,
        scheduleNotice: true,
        doctor: { select: { name: true } },
        session: { select: { id: true, label: true } },
      },
    }),
  ]);

  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    appointments: rows.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: a.doctor.name,
      sessionId: a.sessionId ?? undefined,
      sessionLabel: a.session?.label,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      token: formatTokenDisplay(a.tokenNumber),
      scheduleNotice: a.scheduleNotice,
    })),
  };
}

export async function getMyAppointment(app: FastifyInstance, userId: string, id: string) {
  const row = await app.prisma.appointment.findFirst({
    where: { id, userId },
    include: {
      doctor: { select: { id: true, name: true, department: { select: { name: true } } } },
      session: { select: { id: true, label: true, startTime: true, endTime: true } },
    },
  });
  if (!row) throw new AppError(404, "Appointment not found", "NOT_FOUND");
  if (!row.session) throw new AppError(500, "Appointment session not found", "SESSION_MISSING");

  return {
    id: row.id,
    doctorId: row.doctorId,
    doctorName: row.doctor.name,
    departmentName: row.doctor.department.name,
    sessionId: row.sessionId ?? row.session.id,
    session: {
      id: row.session.id,
      label: row.session.label,
      startTime: row.session.startTime,
      endTime: row.session.endTime,
    },
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    token: formatTokenDisplay(row.tokenNumber),
    tokenNumber: row.tokenNumber,
    notes: row.notes,
    scheduleNotice: row.scheduleNotice,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function dismissScheduleNotice(app: FastifyInstance, userId: string, appointmentId: string) {
  const row = await app.prisma.appointment.findFirst({
    where: { id: appointmentId, userId },
    select: { id: true },
  });
  if (!row) throw new AppError(404, "Appointment not found", "NOT_FOUND");
  await app.prisma.appointment.update({
    where: { id: appointmentId },
    data: { scheduleNotice: null },
  });
}

export async function updateAppointmentStatus(
  app: FastifyInstance,
  appointmentId: string,
  status: AppointmentStatus
) {
  const existing = await app.prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, doctorId: true, sessionId: true, date: true, status: true },
  });
  if (!existing) throw new AppError(404, "Appointment not found", "NOT_FOUND");

  const updated = await app.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { doctor: { select: { id: true, name: true } } },
  });

  if (existing.sessionId) {
    await realtime.emitSessionQueue(app, existing.sessionId);
  }

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    sessionId: updated.sessionId,
    status: updated.status,
    token: formatTokenDisplay(updated.tokenNumber),
    scheduledAt: updated.scheduledAt.toISOString(),
  };
}

/** @deprecated Prefer queueService.nextPatient(sessionId) */
export async function advanceQueue(app: FastifyInstance, doctorId: string, dateStr: string) {
  const { nextPatientByDoctorDate } = await import("../queue/queue.service.js");
  const result = await nextPatientByDoctorDate(app, doctorId, dateStr);
  const session = await sessionService.resolveSessionForQueueView(app, doctorId, dateStr);
  await realtime.emitSessionQueue(app, session.id);
  return result;
}
