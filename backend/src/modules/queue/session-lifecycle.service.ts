import type { FastifyInstance } from "fastify";
import { SessionStatus } from "@prisma/client";
import { localTodayDateStr } from "../../lib/booking-rules.js";
import { dateOnlyUtc } from "../../lib/time.js";
import { getSessionPhase } from "../../lib/session-window.js";
import * as sessionService from "./session.service.js";
import { emitSessionQueue } from "./queue.realtime.js";

const TICK_INTERVAL_MS = 60_000;

let tickTimer: ReturnType<typeof setInterval> | undefined;

/** Open/close sessions by availability window; cancel unfinished appointments at close. */
export async function runSessionLifecycleTick(app: FastifyInstance): Promise<string[]> {
  const todayStr = localTodayDateStr();
  const today = dateOnlyUtc(todayStr);

  const sessions = await app.prisma.doctorSession.findMany({
    where: {
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.OPEN, SessionStatus.PAUSED] },
      date: { lte: today },
    },
  });

  const changed: string[] = [];
  const now = new Date();

  for (const session of sessions) {
    const phase = getSessionPhase(session, now);

    if (phase === "active" && session.status === SessionStatus.SCHEDULED) {
      await app.prisma.$transaction((tx) =>
        sessionService.activateConsultationQueueInTx(tx, session.id, { auto: true })
      );
      changed.push(session.id);
      continue;
    }

    if (phase === "after_end") {
      const closed = await app.prisma.$transaction((tx) =>
        sessionService.closeSessionAndCancelOutstandingInTx(tx, session.id)
      );
      if (closed) changed.push(session.id);
    }
  }

  for (const sessionId of changed) {
    await emitSessionQueue(app, sessionId);
  }

  return changed;
}

export function startSessionLifecycleScheduler(app: FastifyInstance) {
  if (tickTimer) return;

  const tick = () => {
    runSessionLifecycleTick(app).catch((err) => {
      app.log.error(err, "session lifecycle tick failed");
    });
  };

  tick();
  tickTimer = setInterval(tick, TICK_INTERVAL_MS);
  app.addHook("onClose", async () => {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = undefined;
  });
}
