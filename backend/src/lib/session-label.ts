/** Derive a human-readable session label from start time (local wall clock HH:mm). */
export function sessionLabelFromStartTime(startTime: string): string {
  const [hStr] = startTime.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return "Session";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
