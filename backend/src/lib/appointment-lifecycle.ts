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

/** Existing rows in these statuses block another booking with the same doctor on the same day. */
export const PATIENT_DOCTOR_DAY_BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.SKIPPED,
  AppointmentStatus.COMPLETED,
];
