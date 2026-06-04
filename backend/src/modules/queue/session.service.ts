import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { AppointmentStatus, SessionStatus } from "@prisma/client";
import { OUTSTANDING_ON_SESSION_CLOSE } from "../../lib/appointment-lifecycle.js";
import { assertConsultationWindowOpen } from "../../lib/booking-rules.js";
import { AppError } from "../../lib/errors.js";
import { getSessionPhase } from "../../lib/session-window.js";
import { defaultSessionLabel } from "../../lib/session-label.js";
import { dateOnlyUtc, localDateTime, toDateOnlyIso } from "../../lib/time.js";

type Tx = Prisma.TransactionClient;

function compareTime(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (ah ?? 0) * 60 + (am ?? 0) - ((bh ?? 0) * 60 + (bm ?? 0));
}

export function slotWithinAvailability(
  scheduledAt: Date,
  dateStr: string,
  startTime: string,
  endTime: string
): boolean {
  const start = localDateTime(dateStr, startTime);
  const end = localDateTime(dateStr, endTime);
  const t = scheduledAt.getTime();
  return t >= start.getTime() && t < end.getTime();
}

async function availabilityBounds(
  tx: Tx,
  doctorId: string,
  date: Date
): Promise<{ startTime: string; endTime: string } | null> {
  const rows = await tx.availability.findMany({
    where: { doctorId, date },
    select: { startTime: true, endTime: true },
  });
  if (rows.length === 0) return null;

  let startTime = rows[0]!.startTime;
  let endTime = rows[0]!.endTime;
  for (const row of rows.slice(1)) {
    if (compareTime(row.startTime, startTime) < 0) startTime = row.startTime;
    if (compareTime(row.endTime, endTime) > 0) endTime = row.endTime;
  }
  return { startTime, endTime };
}

/** Update session start/end to cover all availability blocks for the day. */
export async function syncSessionTimeRange(
  tx: Tx,
  doctorId: string,
  date: Date,
  sessionId?: string
) {
  const bounds = await availabilityBounds(tx, doctorId, date);
  if (!bounds) return;

  const session =
    sessionId !== undefined
      ? await tx.doctorSession.findFirst({ where: { id: sessionId, doctorId, date } })
      : await tx.doctorSession.findUnique({
          where: { doctorId_date: { doctorId, date } },
        });

  if (!session) return;

  await tx.doctorSession.update({
    where: { id: session.id },
    data: { startTime: bounds.startTime, endTime: bounds.endTime },
  });
}

/** Get or create the single queue session for a doctor on a given day. */
export async function ensureSessionForDoctorDay(tx: Tx, doctorId: string, date: Date) {
  const existing = await tx.doctorSession.findUnique({
    where: { doctorId_date: { doctorId, date } },
  });
  if (existing) {
    await syncSessionTimeRange(tx, doctorId, date, existing.id);
    return tx.doctorSession.findUniqueOrThrow({ where: { id: existing.id } });
  }

  const bounds = await availabilityBounds(tx, doctorId, date);
  return tx.doctorSession.create({
    data: {
      doctorId,
      date,
      label: defaultSessionLabel(),
      startTime: bounds?.startTime ?? "09:00",
      endTime: bounds?.endTime ?? "17:00",
      status: SessionStatus.SCHEDULED,
    },
  });
}

export async function ensureSessionForAvailability(
  tx: Tx,
  availability: { id: string; doctorId: string; date: Date; startTime: string; endTime: string }
) {
  return ensureSessionForDoctorDay(tx, availability.doctorId, availability.date);
}

/** Resolve the session for a booking slot; creates the daily session if needed. */
export async function resolveSessionForBooking(
  app: FastifyInstance,
  doctorId: string,
  scheduledAt: Date,
  dateStr: string
) {
  const day = dateOnlyUtc(dateStr);
  const availabilities = await app.prisma.availability.findMany({
    where: { doctorId, date: day },
  });

  const match = availabilities.find((a) =>
    slotWithinAvailability(scheduledAt, dateStr, a.startTime, a.endTime)
  );
  if (!match) {
    throw new AppError(400, "No clinic hours cover this time slot", "NO_SESSION");
  }

  return app.prisma.$transaction((tx) => ensureSessionForDoctorDay(tx, doctorId, day));
}

export async function createDoctorSession(
  app: FastifyInstance,
  input: {
    doctorId: string;
    date: string;
    label?: string;
    startTime: string;
    endTime: string;
    avgMinutesPerPatient?: number;
  }
) {
  const doctor = await app.prisma.doctor.findFirst({ where: { id: input.doctorId } });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const dateStr = input.date;
  if (
    localDateTime(dateStr, input.endTime).getTime() <=
    localDateTime(dateStr, input.startTime).getTime()
  ) {
    throw new AppError(400, "End time must be after start time", "INVALID_RANGE");
  }

  const day = dateOnlyUtc(dateStr);
  const existing = await app.prisma.doctorSession.findUnique({
    where: { doctorId_date: { doctorId: input.doctorId, date: day } },
  });
  if (existing) {
    throw new AppError(409, "Queue session already exists for this date", "SESSION_EXISTS");
  }

  const bounds = await availabilityBounds(app.prisma, input.doctorId, day);
  const label = input.label ?? defaultSessionLabel();

  return app.prisma.doctorSession.create({
    data: {
      doctorId: input.doctorId,
      date: day,
      label,
      startTime: bounds?.startTime ?? input.startTime,
      endTime: bounds?.endTime ?? input.endTime,
      avgMinutesPerPatient: input.avgMinutesPerPatient ?? 8,
    },
    include: { doctor: { select: { id: true, name: true } } },
  });
}

export async function listDoctorSessions(
  app: FastifyInstance,
  doctorId: string,
  dateStr?: string
) {
  const doctor = await app.prisma.doctor.findFirst({ where: { id: doctorId } });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const dayStr = dateStr ?? toDateOnlyIso(new Date());
  const day = dateOnlyUtc(dayStr);

  const sessions = await app.prisma.doctorSession.findMany({
    where: { doctorId, date: day },
    orderBy: { startTime: "asc" },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { notIn: ["CANCELLED"] } },
          },
        },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    doctorId: s.doctorId,
    date: dayStr,
    label: s.label,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    tokenCounter: s.tokenCounter,
    currentToken: s.currentToken,
    avgMinutesPerPatient: s.avgMinutesPerPatient,
    appointmentCount: s._count.appointments,
    openedAt: s.openedAt?.toISOString() ?? null,
    closedAt: s.closedAt?.toISOString() ?? null,
  }));
}

export async function getSessionById(app: FastifyInstance, sessionId: string) {
  const session = await app.prisma.doctorSession.findUnique({
    where: { id: sessionId },
    include: { doctor: { select: { id: true, name: true } } },
  });
  if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");
  return session;
}

/** Start consultation: open session and move all BOOKED appointments into the live queue (WAITING). */
export async function activateConsultationQueue(
  app: FastifyInstance,
  sessionId: string,
  opts?: { auto?: boolean }
) {
  return app.prisma.$transaction((tx) => activateConsultationQueueInTx(tx, sessionId, opts));
}

export async function activateConsultationQueueInTx(
  tx: Tx,
  sessionId: string,
  opts?: { auto?: boolean }
) {
  const session = await tx.doctorSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, "Session not found", "NOT_FOUND");
  if (session.status === SessionStatus.CLOSED) {
    throw new AppError(400, "Session is closed", "SESSION_CLOSED");
  }
  if (session.status === SessionStatus.OPEN || session.status === SessionStatus.PAUSED) {
    return tx.doctorSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { doctor: { select: { id: true, name: true } } },
    });
  }

  const phase = getSessionPhase(session);
  if (opts?.auto) {
    if (phase !== "active") {
      return tx.doctorSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { doctor: { select: { id: true, name: true } } },
      });
    }
  } else {
    assertConsultationWindowOpen(session);
  }

  const now = new Date();
  await tx.appointment.updateMany({
    where: { sessionId, status: AppointmentStatus.BOOKED },
    data: { status: AppointmentStatus.WAITING },
  });

  return tx.doctorSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.OPEN,
      openedAt: session.openedAt ?? now,
    },
    include: { doctor: { select: { id: true, name: true } } },
  });
}

/** End consultation window: close session and cancel appointments staff did not finalize. */
export async function closeSessionAndCancelOutstanding(app: FastifyInstance, sessionId: string) {
  const closed = await app.prisma.$transaction((tx) =>
    closeSessionAndCancelOutstandingInTx(tx, sessionId)
  );
  return closed;
}

export async function closeSessionAndCancelOutstandingInTx(
  tx: Tx,
  sessionId: string
): Promise<boolean> {
  const session = await tx.doctorSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status === SessionStatus.CLOSED) return false;

  const phase = getSessionPhase(session);
  if (phase !== "after_end") return false;

  const now = new Date();
  await tx.appointment.updateMany({
    where: {
      sessionId,
      status: { in: OUTSTANDING_ON_SESSION_CLOSE },
    },
    data: { status: AppointmentStatus.CANCELLED },
  });

  await tx.doctorSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.CLOSED, closedAt: session.closedAt ?? now },
  });

  return true;
}

export async function patchDoctorSession(
  app: FastifyInstance,
  sessionId: string,
  data: { status?: SessionStatus; avgMinutesPerPatient?: number }
) {
  if (data.status === SessionStatus.OPEN) {
    const session = await activateConsultationQueue(app, sessionId);
    if (data.avgMinutesPerPatient !== undefined) {
      return app.prisma.doctorSession.update({
        where: { id: sessionId },
        data: { avgMinutesPerPatient: data.avgMinutesPerPatient },
        include: { doctor: { select: { id: true, name: true } } },
      });
    }
    return session;
  }

  const existing = await getSessionById(app, sessionId);
  const now = new Date();

  const updated = await app.prisma.doctorSession.update({
    where: { id: sessionId },
    data: {
      ...(data.avgMinutesPerPatient !== undefined
        ? { avgMinutesPerPatient: data.avgMinutesPerPatient }
        : {}),
      ...(data.status !== undefined
        ? {
            status: data.status,
            ...(data.status === SessionStatus.CLOSED ? { closedAt: now } : {}),
          }
        : {}),
    },
    include: { doctor: { select: { id: true, name: true } } },
  });

  return updated;
}

/** Resolve session for doctor+date queue API (explicit sessionId or the day's session). */
export async function resolveSessionForQueueView(
  app: FastifyInstance,
  doctorId: string,
  dateStr: string,
  sessionId?: string
) {
  if (sessionId) {
    const s = await app.prisma.doctorSession.findFirst({
      where: { id: sessionId, doctorId },
    });
    if (!s) throw new AppError(404, "Session not found", "NOT_FOUND");
    return s;
  }

  const day = dateOnlyUtc(dateStr);
  const session = await app.prisma.doctorSession.findUnique({
    where: { doctorId_date: { doctorId, date: day } },
  });
  if (!session) {
    throw new AppError(404, "No queue session for this date", "NO_SESSION");
  }
  return session;
}
