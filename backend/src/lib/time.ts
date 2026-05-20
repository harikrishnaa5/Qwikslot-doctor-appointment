/** Calendar day at UTC midnight — stable key for Prisma `@db.Date`. */
export function dateOnlyUtc(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
}

/** YYYY-MM-DD + HH:mm as local wall time (matches admin UI & patient slot picker). */
export function localDateTime(dateStr: string, hhmm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** @deprecated Use `dateOnlyUtc` or `localDateTime`. */
export function utcDateTime(dateStr: string, hhmm: string): Date {
  if (hhmm === "00:00") return dateOnlyUtc(dateStr);
  return localDateTime(dateStr, hhmm);
}

export function parseDateOnly(date: Date): Date {
  return dateOnlyUtc(toDateOnlyIso(date));
}

/** Calendar date in local timezone (e.g. from `scheduledAt`). */
export function toDateOnlyIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar date from a Prisma `@db.Date` value (stored as UTC midnight). */
export function toDateOnlyIsoFromDbDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
