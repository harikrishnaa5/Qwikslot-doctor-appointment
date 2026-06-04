import { AppointmentStatus, Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { theoreticalSlotStartIsoSet } from "./availability-slots.js";
import { toDateOnlyIsoFromDbDate } from "./time.js";

export const SCHEDULE_DISRUPTION_NOTICE =
  "This visit time is no longer on the doctor's published schedule. Please contact the clinic or choose another time.";

/** Clears or sets scheduleNotice on active visits for this doctor/day based on current availability. */
export async function syncScheduleNoticesForDoctorDate(app: FastifyInstance, doctorId: string, day: Date) {
  const dateStr = toDateOnlyIsoFromDbDate(day);
  if (!Number.isFinite(day.getTime())) {
    app.log.error({ day }, "syncScheduleNoticesForDoctorDate: invalid day");
    return;
  }

  try {
    // Use the same `Date` Prisma stores for @db.Date so filters match reliably (avoids UTC midnight mismatches).
    const availabilities = await app.prisma.availability.findMany({
      where: { doctorId, date: day },
      select: { startTime: true, endTime: true },
    });
    const valid = theoreticalSlotStartIsoSet(dateStr, availabilities);
    const appts = await app.prisma.appointment.findMany({
      where: {
        doctorId,
        date: day,
        status: { in: [AppointmentStatus.WAITING, AppointmentStatus.CHECKED_IN] },
      },
      select: { id: true, scheduledAt: true },
    });
    await Promise.all(
      appts.map((a) =>
        app.prisma.appointment.update({
          where: { id: a.id },
          data: { scheduleNotice: valid.has(a.scheduledAt.toISOString()) ? null : SCHEDULE_DISRUPTION_NOTICE },
        })
      )
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      app.log.warn(
        "Appointment.scheduleNotice column missing. Run `npx prisma migrate deploy` in the backend folder. Skipping notice sync."
      );
      return;
    }
    throw e;
  }
}
