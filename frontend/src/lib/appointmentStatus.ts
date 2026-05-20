/** Human-readable appointment status for UI (API values stay e.g. IN_PROGRESS). */
const STATUS_LABELS: Record<string, string> = {
  WAITING: "Waiting",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  SKIPPED: "Skipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatAppointmentStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase();
}
