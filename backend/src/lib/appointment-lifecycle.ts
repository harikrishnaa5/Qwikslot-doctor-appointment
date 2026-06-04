import { AppointmentStatus } from "@prisma/client";

/** Not finalized by staff — auto-cancelled when the consultation window ends. */
export const OUTSTANDING_ON_SESSION_CLOSE: AppointmentStatus[] = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
];

export const FINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.SKIPPED,
  AppointmentStatus.CANCELLED,
];
