import type { FastifyInstance } from "fastify";
import { AppointmentStatus, SessionStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import { toDateOnlyIso } from "../../lib/time.js";
import * as sessionService from "./session.service.js";
import type { QueueSnapshot } from "./queue.types.js";

const ACTIVE_QUEUE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
];

export async function buildQueueSnapshot(
  app: FastifyInstance,
  sessionId: string,
  options?: { patientAppointmentId?: string }
): Promise<QueueSnapshot> {
  const session = await sessionService.getSessionById(app, sessionId);
  const dateStr = toDateOnlyIso(session.date);

  const appointments = await app.prisma.appointment.findMany({
    where: {
      sessionId,
      status: { notIn: [AppointmentStatus.CANCELLED] },
    },
    orderBy: { tokenNumber: "asc" },
    select: {
      id: true,
      tokenNumber: true,
      status: true,
      scheduledAt: true,
      checkedInAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  const inProgress = appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS);
  const waiting = appointments.filter(
    (a) =>
      a.status === AppointmentStatus.WAITING || a.status === AppointmentStatus.CHECKED_IN
  );

  const currentTokenNumber =
    inProgress?.tokenNumber ?? (session.currentToken > 0 ? session.currentToken : null);

  const patientAppt = options?.patientAppointmentId
    ? appointments.find((a) => a.id === options.patientAppointmentId)
    : undefined;

  let patientsAhead = 0;
  let estimatedWaitMinutes = 0;

  if (patientAppt && ACTIVE_QUEUE_STATUSES.includes(patientAppt.status)) {
    const servingNum = currentTokenNumber ?? 0;
    patientsAhead = appointments.filter(
      (a) =>
        (a.status === AppointmentStatus.WAITING ||
          a.status === AppointmentStatus.CHECKED_IN) &&
        a.tokenNumber > servingNum &&
        a.tokenNumber < patientAppt.tokenNumber
    ).length;

    if (patientAppt.status === AppointmentStatus.IN_PROGRESS) {
      patientsAhead = 0;
    }

    estimatedWaitMinutes = patientsAhead * session.avgMinutesPerPatient;
  }

  const remainingPatients = waiting.length;

  return {
    sessionId: session.id,
    doctorId: session.doctorId,
    doctorName: session.doctor.name,
    date: dateStr,
    session: {
      id: session.id,
      label: session.label,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      tokenCounter: session.tokenCounter,
      currentToken: session.currentToken,
      currentTokenDisplay:
        session.currentToken > 0 ? formatTokenDisplay(session.currentToken) : null,
      avgMinutesPerPatient: session.avgMinutesPerPatient,
    },
    current: inProgress
      ? {
          token: formatTokenDisplay(inProgress.tokenNumber),
          tokenNumber: inProgress.tokenNumber,
          appointmentId: inProgress.id,
        }
      : session.currentToken > 0
        ? {
            token: formatTokenDisplay(session.currentToken),
            tokenNumber: session.currentToken,
            appointmentId: null,
          }
        : null,
    nextWaiting: waiting[0]
      ? {
          token: formatTokenDisplay(waiting[0].tokenNumber),
          tokenNumber: waiting[0].tokenNumber,
          appointmentId: waiting[0].id,
        }
      : null,
    remainingPatients,
    estimatedWaitMinutes,
    patient:
      patientAppt && options?.patientAppointmentId
        ? {
            appointmentId: patientAppt.id,
            token: formatTokenDisplay(patientAppt.tokenNumber),
            tokenNumber: patientAppt.tokenNumber,
            status: patientAppt.status,
            patientsAhead,
            estimatedWaitMinutes,
          }
        : null,
    appointments: appointments.map((a) => ({
      id: a.id,
      token: formatTokenDisplay(a.tokenNumber),
      tokenNumber: a.tokenNumber,
      status: a.status,
      scheduledAt: a.scheduledAt.toISOString(),
      patientName: a.user.name,
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
    })),
  };
}

export async function getQueueStatus(
  app: FastifyInstance,
  sessionId: string,
  patientAppointmentId?: string
) {
  return buildQueueSnapshot(app, sessionId, { patientAppointmentId });
}

export async function nextPatient(app: FastifyInstance, sessionId: string) {
  const result = await app.prisma.$transaction(async (tx) => {
    const session = await tx.doctorSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");
    if (session.status === SessionStatus.CLOSED) {
      throw new AppError(400, "Session is closed", "SESSION_CLOSED");
    }

    const inProgress = await tx.appointment.findFirst({
      where: { sessionId, status: AppointmentStatus.IN_PROGRESS },
      orderBy: { tokenNumber: "asc" },
    });
    if (inProgress) {
      await tx.appointment.update({
        where: { id: inProgress.id },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    const next = await tx.appointment.findFirst({
      where: {
        sessionId,
        status: { in: [AppointmentStatus.WAITING, AppointmentStatus.CHECKED_IN] },
        tokenNumber: { gt: session.currentToken },
      },
      orderBy: { tokenNumber: "asc" },
    });

    if (!next) {
      return { advanced: false as const, message: "No waiting patients" };
    }

    await tx.appointment.update({
      where: { id: next.id },
      data: { status: AppointmentStatus.IN_PROGRESS },
    });

    await tx.doctorSession.update({
      where: { id: sessionId },
      data: {
        currentToken: next.tokenNumber,
        status: SessionStatus.OPEN,
        openedAt: session.openedAt ?? new Date(),
      },
    });

    return {
      advanced: true as const,
      appointmentId: next.id,
      tokenNumber: next.tokenNumber,
    };
  });

  return {
    ...result,
    token: result.advanced ? formatTokenDisplay(result.tokenNumber) : undefined,
  };
}

export async function skipPatient(
  app: FastifyInstance,
  sessionId: string,
  appointmentId?: string
) {
  const updated = await app.prisma.$transaction(async (tx) => {
    const session = await tx.doctorSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");

    let targetId = appointmentId;
    if (!targetId) {
      const current = await tx.appointment.findFirst({
        where: { sessionId, status: AppointmentStatus.IN_PROGRESS },
        orderBy: { tokenNumber: "asc" },
      });
      if (!current) {
        throw new AppError(400, "No patient currently in progress", "NO_CURRENT");
      }
      targetId = current.id;
    }

    const appt = await tx.appointment.findFirst({
      where: { id: targetId, sessionId },
    });
    if (!appt) throw new AppError(404, "Appointment not found in this session", "NOT_FOUND");
    if (
      appt.status !== AppointmentStatus.IN_PROGRESS &&
      appt.status !== AppointmentStatus.WAITING &&
      appt.status !== AppointmentStatus.CHECKED_IN
    ) {
      throw new AppError(400, "Appointment cannot be skipped", "INVALID_STATUS");
    }

    return tx.appointment.update({
      where: { id: targetId },
      data: { status: AppointmentStatus.SKIPPED },
      select: { id: true, tokenNumber: true, status: true },
    });
  });

  return {
    appointment: {
      id: updated.id,
      status: updated.status,
      token: formatTokenDisplay(updated.tokenNumber),
    },
  };
}

export async function completePatient(app: FastifyInstance, appointmentId: string) {
  const existing = await app.prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, sessionId: true, status: true, tokenNumber: true },
  });
  if (!existing) throw new AppError(404, "Appointment not found", "NOT_FOUND");
  if (
    existing.status !== AppointmentStatus.IN_PROGRESS &&
    existing.status !== AppointmentStatus.CHECKED_IN &&
    existing.status !== AppointmentStatus.WAITING
  ) {
    throw new AppError(400, "Appointment cannot be completed", "INVALID_STATUS");
  }

  const updated = await app.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.COMPLETED },
    include: { doctor: { select: { id: true, name: true } } },
  });

  return {
    appointment: {
      id: updated.id,
      sessionId: updated.sessionId,
      doctorId: updated.doctorId,
      status: updated.status,
      token: formatTokenDisplay(updated.tokenNumber),
      scheduledAt: updated.scheduledAt.toISOString(),
    },
  };
}

export async function checkInPatient(app: FastifyInstance, appointmentId: string) {
  const existing = await app.prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, sessionId: true, status: true, tokenNumber: true },
  });
  if (!existing) throw new AppError(404, "Appointment not found", "NOT_FOUND");
  if (existing.status !== AppointmentStatus.WAITING) {
    throw new AppError(400, "Only waiting appointments can check in", "INVALID_STATUS");
  }

  const updated = await app.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CHECKED_IN, checkedInAt: new Date() },
  });

  return {
    appointment: {
      id: updated.id,
      sessionId: updated.sessionId,
      status: updated.status,
      token: formatTokenDisplay(updated.tokenNumber),
    },
  };
}

/** Legacy: advance queue by doctor + date (resolves primary session). */
export async function nextPatientByDoctorDate(
  app: FastifyInstance,
  doctorId: string,
  dateStr: string
) {
  const session = await sessionService.resolveSessionForQueueView(app, doctorId, dateStr);
  return nextPatient(app, session.id);
}
