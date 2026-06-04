/**
 * One-time backfill: one DoctorSession per doctor per day, link appointments.
 * Run: npx tsx prisma/scripts/backfill-sessions.ts
 */
import { PrismaClient } from "@prisma/client";
import { toDateOnlyIso } from "../../src/lib/time.js";

const prisma = new PrismaClient();

function slotInRange(
  scheduledAt: Date,
  dateStr: string,
  startTime: string,
  endTime: string
): boolean {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = new Date(scheduledAt);
  start.setHours(sh, sm ?? 0, 0, 0);
  const end = new Date(scheduledAt);
  end.setHours(eh, em ?? 0, 0, 0);
  const t = scheduledAt.getTime();
  return t >= start.getTime() && t < end.getTime();
}

async function main() {
  const availabilities = await prisma.availability.findMany();
  const sessionByDoctorDate = new Map<string, string>();

  for (const a of availabilities) {
    const key = `${a.doctorId}:${toDateOnlyIso(a.date)}`;
    if (sessionByDoctorDate.has(key)) continue;

    let session = await prisma.doctorSession.findUnique({
      where: { doctorId_date: { doctorId: a.doctorId, date: a.date } },
    });
    if (!session) {
      const sameDay = availabilities.filter(
        (x) => x.doctorId === a.doctorId && x.date.getTime() === a.date.getTime()
      );
      let startTime = sameDay[0]!.startTime;
      let endTime = sameDay[0]!.endTime;
      for (const row of sameDay) {
        if (row.startTime < startTime) startTime = row.startTime;
        if (row.endTime > endTime) endTime = row.endTime;
      }
      session = await prisma.doctorSession.create({
        data: {
          doctorId: a.doctorId,
          date: a.date,
          label: "Clinic",
          startTime,
          endTime,
          status: "SCHEDULED",
        },
      });
    }
    sessionByDoctorDate.set(key, session.id);
  }

  const appointments = await prisma.appointment.findMany({
    where: { sessionId: null },
  });

  for (const appt of appointments) {
    const dateStr = toDateOnlyIso(appt.date);
    const key = `${appt.doctorId}:${dateStr}`;
    const sessionId = sessionByDoctorDate.get(key);
    if (!sessionId) {
      const avails = availabilities.filter(
        (a) => a.doctorId === appt.doctorId && a.date.getTime() === appt.date.getTime()
      );
      const match = avails.find((a) =>
        slotInRange(appt.scheduledAt, dateStr, a.startTime, a.endTime)
      );
      if (!match) {
        console.warn("No availability for appointment", appt.id);
        continue;
      }
      continue;
    }
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { sessionId },
    });
    const max = await prisma.appointment.aggregate({
      where: { sessionId },
      _max: { tokenNumber: true },
    });
    await prisma.doctorSession.update({
      where: { id: sessionId },
      data: { tokenCounter: Math.max(max._max.tokenNumber ?? 0, 0) },
    });
  }

  console.log("Backfill complete");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    throw e;
  });
