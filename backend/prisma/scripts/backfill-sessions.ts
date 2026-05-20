/**
 * One-time backfill for existing databases before making Appointment.sessionId required.
 * Run: npx tsx prisma/scripts/backfill-sessions.ts
 */
import { PrismaClient } from "@prisma/client";
import { sessionLabelFromStartTime } from "../../src/lib/session-label.js";
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
  const sessionByAvail = new Map<string, string>();

  for (const a of availabilities) {
    const dateStr = toDateOnlyIso(a.date);
    let session = await prisma.doctorSession.findFirst({
      where: {
        doctorId: a.doctorId,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
      },
    });
    if (!session) {
      session = await prisma.doctorSession.create({
        data: {
          doctorId: a.doctorId,
          availabilityId: a.id,
          date: a.date,
          label: sessionLabelFromStartTime(a.startTime),
          startTime: a.startTime,
          endTime: a.endTime,
          status: "SCHEDULED",
        },
      });
    }
    sessionByAvail.set(a.id, session.id);
  }

  const appointments = await prisma.appointment.findMany({
    where: { sessionId: null as unknown as string },
  }).catch(() => prisma.appointment.findMany());

  for (const appt of appointments) {
    const dateStr = toDateOnlyIso(appt.date);
    const avails = availabilities.filter(
      (a) => a.doctorId === appt.doctorId && a.date.getTime() === appt.date.getTime()
    );
    const match = avails.find((a) => slotInRange(appt.scheduledAt, dateStr, a.startTime, a.endTime));
    if (!match) {
      console.warn("No availability for appointment", appt.id);
      continue;
    }
    const sessionId = sessionByAvail.get(match.id);
    if (!sessionId) continue;
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
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
