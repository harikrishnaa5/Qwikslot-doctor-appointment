import type { FastifyInstance } from "fastify";
import { AppointmentStatus, SessionStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import { getSessionPhase } from "../../lib/session-window.js";
import { toDateOnlyIso } from "../../lib/time.js";
import * as sessionService from "./session.service.js";
import type { QueueSnapshot } from "./queue.types.js";

/** Shown in live queue once consultation has started. */
export const LIVE_QUEUE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
];

/** Patient currently with the doctor (CHECKED_IN + session current token). */
function isServingAppointment(
  a: { status: AppointmentStatus; tokenNumber: number },
  currentToken: number
): boolean {
  return a.status === AppointmentStatus.CHECKED_IN && currentToken > 0 && a.tokenNumber === currentToken;
}

const ACTIVE_QUEUE_STATUSES: AppointmentStatus[] = [
  ...LIVE_QUEUE_APPOINTMENT_STATUSES,
];

function isQueueLive(sessionStatus: SessionStatus): boolean {
  return sessionStatus === SessionStatus.OPEN || sessionStatus === SessionStatus.PAUSED;
}

export async function buildQueueSnapshot(
  app: FastifyInstance,
  sessionId: string,
  options?: { patientAppointmentId?: string }
): Promise<QueueSnapshot> {
  const { runSessionLifecycleTick } = await import("./session-lifecycle.service.js");
  await runSessionLifecycleTick(app);

  const session = await sessionService.getSessionById(app, sessionId);
  const dateStr = toDateOnlyIso(session.date);

  const allAppointments = await app.prisma.appointment.findMany({
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
      createdAt: true,
      checkedInAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  const sessionPhase = getSessionPhase(session);
  const queueLive = isQueueLive(session.status);
  const appointments = queueLive
    ? allAppointments.filter((a) => a.status !== AppointmentStatus.BOOKED)
    : [];

  const serving = appointments.find((a) => isServingAppointment(a, session.currentToken));
  const waiting = appointments.filter((a) => a.status === AppointmentStatus.WAITING);

  const currentTokenNumber =
    serving?.tokenNumber ?? (session.currentToken > 0 ? session.currentToken : null);

  const patientAppt = options?.patientAppointmentId
    ? allAppointments.find((a) => a.id === options.patientAppointmentId)
    : undefined;

  let patientsAhead = 0;
  let estimatedWaitMinutes = 0;

  if (patientAppt && queueLive && ACTIVE_QUEUE_STATUSES.includes(patientAppt.status)) {
    const servingNum = currentTokenNumber ?? 0;
    patientsAhead = appointments.filter(
      (a) =>
        (a.status === AppointmentStatus.WAITING ||
          a.status === AppointmentStatus.CHECKED_IN) &&
        a.tokenNumber > servingNum &&
        a.tokenNumber < patientAppt.tokenNumber
    ).length;

    if (isServingAppointment(patientAppt, session.currentToken)) {
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
    queueStarted: queueLive,
    sessionPhase,
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
    current: serving
      ? {
          token: formatTokenDisplay(serving.tokenNumber),
          tokenNumber: serving.tokenNumber,
          appointmentId: serving.id,
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
            patientsAhead: queueLive ? patientsAhead : 0,
            estimatedWaitMinutes: queueLive ? estimatedWaitMinutes : 0,
          }
        : null,
    appointments: appointments.map(mapQueueAppointment),
    sessionAppointments: allAppointments.map(mapQueueAppointment),
  };
}

function mapQueueAppointment(a: {
  id: string;
  tokenNumber: number;
  status: AppointmentStatus;
  scheduledAt: Date;
  createdAt: Date;
  checkedInAt: Date | null;
  user: { name: string };
}) {
  return {
    id: a.id,
    token: formatTokenDisplay(a.tokenNumber),
    tokenNumber: a.tokenNumber,
    status: a.status,
    scheduledAt: a.scheduledAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    patientName: a.user.name,
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
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
    let session = await tx.doctorSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");
    if (session.status === SessionStatus.CLOSED) {
      throw new AppError(400, "Session is closed", "SESSION_CLOSED");
    }

    if (session.status === SessionStatus.SCHEDULED) {
      await sessionService.activateConsultationQueueInTx(tx, sessionId);
      session = await tx.doctorSession.findUniqueOrThrow({ where: { id: sessionId } });
      if (session.status === SessionStatus.SCHEDULED) {
        throw new AppError(
          400,
          "Consultation is not open yet (outside clinic hours)",
          "CONSULTATION_NOT_STARTED"
        );
      }
    }

    if (session.currentToken > 0) {
      const serving = await tx.appointment.findFirst({
        where: {
          sessionId,
          status: AppointmentStatus.CHECKED_IN,
          tokenNumber: session.currentToken,
        },
      });
      if (serving) {
        await tx.appointment.update({
          where: { id: serving.id },
          data: { status: AppointmentStatus.COMPLETED },
        });
      }
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
      data: {
        status: AppointmentStatus.CHECKED_IN,
        checkedInAt: next.checkedInAt ?? new Date(),
      },
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
      if (session.currentToken <= 0) {
        throw new AppError(400, "No patient currently being seen", "NO_CURRENT");
      }
      const current = await tx.appointment.findFirst({
        where: {
          sessionId,
          status: AppointmentStatus.CHECKED_IN,
          tokenNumber: session.currentToken,
        },
      });
      if (!current) {
        throw new AppError(400, "No patient currently being seen", "NO_CURRENT");
      }
      targetId = current.id;
    }

    const appt = await tx.appointment.findFirst({
      where: { id: targetId, sessionId },
    });
    if (!appt) throw new AppError(404, "Appointment not found in this session", "NOT_FOUND");
    if (
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
