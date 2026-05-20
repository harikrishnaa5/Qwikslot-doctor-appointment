import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { SessionStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { sessionLabelFromStartTime } from "../../lib/session-label.js";
import { dateOnlyUtc, localDateTime, toDateOnlyIso } from "../../lib/time.js";

type Tx = Prisma.TransactionClient;

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

export async function ensureSessionForAvailability(
  tx: Tx,
  availability: { id: string; doctorId: string; date: Date; startTime: string; endTime: string }
) {
  const dateStr = toDateOnlyIso(availability.date);
  const existing = await tx.doctorSession.findFirst({
    where: {
      doctorId: availability.doctorId,
      date: availability.date,
      startTime: availability.startTime,
      endTime: availability.endTime,
    },
  });
  if (existing) {
    if (!existing.availabilityId) {
      return tx.doctorSession.update({
        where: { id: existing.id },
        data: { availabilityId: availability.id },
      });
    }
    return existing;
  }

  return tx.doctorSession.create({
    data: {
      doctorId: availability.doctorId,
      availabilityId: availability.id,
      date: availability.date,
      label: sessionLabelFromStartTime(availability.startTime),
      startTime: availability.startTime,
      endTime: availability.endTime,
      status: SessionStatus.SCHEDULED,
    },
  });
}

/** Resolve the session for a booking slot; creates session from matching availability if needed. */
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
    throw new AppError(400, "No clinic session covers this time slot", "NO_SESSION");
  }

  return app.prisma.$transaction((tx) => ensureSessionForAvailability(tx, match));
}

export async function createDoctorSession(
  app: FastifyInstance,
  input: {
    doctorId: string;
    date: string;
    label?: string;
    startTime: string;
    endTime: string;
    availabilityId?: string;
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
  const label = input.label ?? sessionLabelFromStartTime(input.startTime);

  try {
    return await app.prisma.doctorSession.create({
      data: {
        doctorId: input.doctorId,
        date: day,
        label,
        startTime: input.startTime,
        endTime: input.endTime,
        availabilityId: input.availabilityId,
        avgMinutesPerPatient: input.avgMinutesPerPatient ?? 8,
      },
      include: { doctor: { select: { id: true, name: true } } },
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      throw new AppError(409, "Session already exists for this time block", "SESSION_EXISTS");
    }
    throw e;
  }
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

export async function patchDoctorSession(
  app: FastifyInstance,
  sessionId: string,
  data: { status?: SessionStatus; avgMinutesPerPatient?: number }
) {
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
            ...(data.status === SessionStatus.OPEN && !existing.openedAt
              ? { openedAt: now }
              : {}),
            ...(data.status === SessionStatus.CLOSED ? { closedAt: now } : {}),
          }
        : {}),
    },
    include: { doctor: { select: { id: true, name: true } } },
  });

  return updated;
}

/** Pick session for legacy doctor+date queue API (explicit sessionId or first active session). */
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
  const sessions = await app.prisma.doctorSession.findMany({
    where: { doctorId, date: day },
    orderBy: { startTime: "asc" },
  });
  if (sessions.length === 0) {
    throw new AppError(404, "No queue session for this date", "NO_SESSION");
  }

  const open = sessions.find((s) => s.status === SessionStatus.OPEN);
  if (open) return open;

  const withTokens = sessions.find((s) => s.tokenCounter > 0);
  return withTokens ?? sessions[0]!;
}
