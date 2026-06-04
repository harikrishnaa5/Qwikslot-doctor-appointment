/** Human-readable appointment status for UI. */
const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Booked",
  WAITING: "Waiting",
  CHECKED_IN: "Checked in",
  SKIPPED: "Skipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatAppointmentStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase();
}

export function formatPatientDisplayStatus(status: string): string {
  if (status === "NOT_BOOKED") return "Not booked";
  return formatAppointmentStatus(status);
}
