/** Combine YYYY-MM-DD and HH:mm as UTC for predictable demo behavior. */
export function utcDateTime(dateStr: string, hhmm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0));
}

export function parseDateOnly(date: Date): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function toDateOnlyIso(date: Date): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
