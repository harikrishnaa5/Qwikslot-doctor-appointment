import { AppError } from "./errors.js";
import { getSessionPhase } from "./session-window.js";
import { toDateOnlyIso } from "./time.js";

/** Local calendar today as YYYY-MM-DD. */
export function localTodayDateStr(): string {
  return toDateOnlyIso(new Date());
}

/** Earliest bookable appointment day (tomorrow, local calendar). */
export function earliestBookableDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateOnlyIso(d);
}

/** Patients must book at least one full day before the appointment (not same day). */
export function assertBookableAppointmentDate(dateStr: string) {
  const today = localTodayDateStr();
  if (dateStr <= today) {
    throw new AppError(
      400,
      "Appointments must be booked at least one day in advance",
      "BOOKING_TOO_SOON"
    );
  }
}

/** Manual queue actions only during the availability window on the appointment day. */
export function assertConsultationWindowOpen(session: {
  date: Date;
  startTime: string;
  endTime: string;
}) {
  const phase = getSessionPhase(session);
  if (phase === "before_day") {
    throw new AppError(
      400,
      "Consultation has not started yet (appointment is on a future date)",
      "CONSULTATION_EARLY"
    );
  }
  if (phase === "before_start") {
    throw new AppError(
      400,
      "Consultation has not started yet (before clinic hours)",
      "CONSULTATION_NOT_STARTED"
    );
  }
  if (phase === "after_end") {
    throw new AppError(400, "Consultation hours have ended for this day", "CONSULTATION_ENDED");
  }
}
