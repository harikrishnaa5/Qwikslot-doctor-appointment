import { BOOKING_SLOT_STEP_MINUTES } from "./slots-config.js";
import { utcDateTime } from "./time.js";

/** All slot start ISO strings implied by availability rows (ignores existing bookings). */
export function theoreticalSlotStartIsoSet(
  dateStr: string,
  rows: { startTime: string; endTime: string }[]
): Set<string> {
  const set = new Set<string>();
  const stepMs = Math.max(1, BOOKING_SLOT_STEP_MINUTES) * 60_000;
  for (const a of rows) {
    let cur = utcDateTime(dateStr, a.startTime);
    const end = utcDateTime(dateStr, a.endTime);
    while (cur.getTime() + stepMs <= end.getTime()) {
      set.add(cur.toISOString());
      cur = new Date(cur.getTime() + stepMs);
    }
  }
  return set;
}
