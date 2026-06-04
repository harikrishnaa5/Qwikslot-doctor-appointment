import { localDateTime, toDateOnlyIso, toDateOnlyIsoFromDbDate } from "./time.js";

export type SessionPhase = "before_day" | "before_start" | "active" | "after_end";

export function sessionDateStr(sessionDate: Date): string {
  return toDateOnlyIsoFromDbDate(sessionDate);
}

export function sessionWindowBounds(dateStr: string, startTime: string, endTime: string) {
  return {
    start: localDateTime(dateStr, startTime),
    end: localDateTime(dateStr, endTime),
  };
}

export function getSessionPhase(
  session: { date: Date; startTime: string; endTime: string },
  now: Date = new Date()
): SessionPhase {
  const dateStr = sessionDateStr(session.date);
  const today = toDateOnlyIso(now);

  if (dateStr < today) return "after_end";
  if (dateStr > today) return "before_day";

  const { start, end } = sessionWindowBounds(dateStr, session.startTime, session.endTime);
  if (now.getTime() < start.getTime()) return "before_start";
  if (now.getTime() >= end.getTime()) return "after_end";
  return "active";
}
