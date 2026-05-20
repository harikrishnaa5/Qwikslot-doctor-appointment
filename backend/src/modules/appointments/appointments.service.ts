import type { FastifyInstance } from "fastify";
import { AppointmentStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { skipTake } from "../../lib/pagination.js";
import { toDateOnlyIso, utcDateTime } from "../../lib/time.js";
import { formatAppointmentToken } from "../../lib/tokens.js";
import * as mockPayment from "../payments/mock-payment.service.js";
import * as doctorsService from "../doctors/doctors.service.js";
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
  const { slots } = await doctorsService.getAvailableSlots(app, body.doctorId, dateStr);
  const slotOk = slots.some((s) => s.start === scheduledIso);
  if (!slotOk) throw new AppError(400, "Slot is no longer available", "SLOT_TAKEN");

  const date = utcDateTime(dateStr, "00:00");

  try {
    const appointment = await app.prisma.$transaction(async (tx) => {
      const agg = await tx.appointment.aggregate({
        where: { doctorId: body.doctorId, date },
        _max: { tokenNumber: true },
      });
      const tokenNumber = (agg._max.tokenNumber ?? 0) + 1;

      return tx.appointment.create({
        data: {
          doctorId: body.doctorId,
          userId,
          scheduledAt,
          date,
          tokenNumber,
          status: AppointmentStatus.WAITING,
          paymentRef: body.paymentRef,
          notes: body.notes,
        },
        include: {
          doctor: { select: { id: true, name: true } },
        },
      });
    });

    await realtime.emitDoctorQueue(app, body.doctorId, dateStr);

    return {
      appointment: {
        id: appointment.id,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.name,
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
        token: formatAppointmentToken(appointment.doctorId, appointment.tokenNumber),
        tokenNumber: appointment.tokenNumber,
      },
    };
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      throw new AppError(409, "That slot was just booked", "SLOT_CONFLICT");
    }
    throw e;
  }
}

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
          date: utcDateTime(q.date, "00:00"),
        }
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
        scheduledAt: true,
        status: true,
        tokenNumber: true,
        scheduleNotice: true,
        doctor: { select: { name: true } },
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
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      token: formatAppointmentToken(a.doctorId, a.tokenNumber),
      scheduleNotice: a.scheduleNotice,
    })),
  };
}

export async function getMyAppointment(app: FastifyInstance, userId: string, id: string) {
  const row = await app.prisma.appointment.findFirst({
    where: { id, userId },
    include: {
      doctor: { select: { id: true, name: true, department: { select: { name: true } } } },
    },
  });
  if (!row) throw new AppError(404, "Appointment not found", "NOT_FOUND");

  return {
    id: row.id,
    doctorId: row.doctorId,
    doctorName: row.doctor.name,
    departmentName: row.doctor.department.name,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    token: formatAppointmentToken(row.doctorId, row.tokenNumber),
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
    select: { id: true, doctorId: true, date: true, status: true },
  });
  if (!existing) throw new AppError(404, "Appointment not found", "NOT_FOUND");

  const updated = await app.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { doctor: { select: { id: true, name: true } } },
  });

  const dateStr = toDateOnlyIso(existing.date);
  await realtime.emitDoctorQueue(app, existing.doctorId, dateStr);

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    status: updated.status,
    token: formatAppointmentToken(updated.doctorId, updated.tokenNumber),
    scheduledAt: updated.scheduledAt.toISOString(),
  };
}

export async function advanceQueue(app: FastifyInstance, doctorId: string, dateStr: string) {
  const day = utcDateTime(dateStr, "00:00");

  const result = await app.prisma.$transaction(async (tx) => {
    const inProgress = await tx.appointment.findFirst({
      where: { doctorId, date: day, status: AppointmentStatus.IN_PROGRESS },
      orderBy: { tokenNumber: "asc" },
    });
    if (inProgress) {
      await tx.appointment.update({
        where: { id: inProgress.id },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    const next = await tx.appointment.findFirst({
      where: { doctorId, date: day, status: AppointmentStatus.WAITING },
      orderBy: { tokenNumber: "asc" },
    });

    if (!next) {
      return { advanced: false as const, message: "No waiting tokens" };
    }

    await tx.appointment.update({
      where: { id: next.id },
      data: { status: AppointmentStatus.IN_PROGRESS },
    });

    return { advanced: true as const, appointmentId: next.id, tokenNumber: next.tokenNumber };
  });

  await realtime.emitDoctorQueue(app, doctorId, dateStr);
  return {
    ...result,
    token: result.advanced ? formatAppointmentToken(doctorId, result.tokenNumber) : undefined,
  };
}
