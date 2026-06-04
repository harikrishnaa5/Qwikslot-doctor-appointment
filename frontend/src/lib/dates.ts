export function localTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Earliest date patients may book (tomorrow, local calendar). */
export function localTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatSlotLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Locale date + time for appointment / booking displays. */
export function formatLocaleDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Local calendar date + `HH:mm` → `Date` in the user's timezone. */
export function parseLocalDateTime(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function formatLocalHm(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** `HH:mm` on a calendar day → locale 12-hour string (e.g. `2:30 PM`). */
export function formatHm12Hour(hhmm: string, dateYmd: string) {
  const d = parseLocalDateTime(dateYmd, hhmm);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Start = now + 5 minutes (minute precision); end = start + 3h on the same local calendar day, or latest feasible time. */
export function defaultAvailabilityStartEnd(): { start: string; end: string } {
  const start = new Date(Date.now() + 5 * 60_000);
  start.setSeconds(0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 3);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  let endDate = end;
  if (!sameDay) {
    endDate = new Date(start);
    endDate.setHours(23, 59, 0, 0);
    if (endDate.getTime() <= start.getTime()) {
      endDate = new Date(start);
      endDate.setMinutes(endDate.getMinutes() + 60);
    }
  }
  return { start: formatLocalHm(start), end: formatLocalHm(endDate) };
}

/** Keeps `endHm` unchanged if it is strictly after `startHm`; otherwise returns a later time on the same `dateStr`. */
export function ensureEndAfterStart(dateStr: string, startHm: string, endHm: string): string {
  const startAt = parseLocalDateTime(dateStr, startHm);
  const endAt = parseLocalDateTime(dateStr, endHm);
  if (endAt.getTime() > startAt.getTime()) return endHm;

  const dayEnd = parseLocalDateTime(dateStr, "23:59");
  const bumped = new Date(startAt);
  bumped.setMinutes(bumped.getMinutes() + 60);
  const bumpedSameDay =
    bumped.getFullYear() === startAt.getFullYear() &&
    bumped.getMonth() === startAt.getMonth() &&
    bumped.getDate() === startAt.getDate();
  if (bumpedSameDay && bumped.getTime() > startAt.getTime() && bumped.getTime() <= dayEnd.getTime()) {
    return formatLocalHm(bumped);
  }

  const plusOne = new Date(startAt);
  plusOne.setMinutes(plusOne.getMinutes() + 1);
  if (plusOne.getTime() > startAt.getTime() && plusOne.getTime() <= dayEnd.getTime()) {
    return formatLocalHm(plusOne);
  }

  return formatLocalHm(dayEnd);
}
