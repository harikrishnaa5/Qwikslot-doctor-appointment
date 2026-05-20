import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { paginationQuerySchema } from "../../lib/pagination.js";

export const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  paymentRef: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const patchAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const appointmentListQuerySchema = paginationQuerySchema.extend({
  doctorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** active = waiting/in progress; history = all other statuses; all = no status filter */
  scope: z.enum(["active", "history", "all"]).default("all"),
});

export const patchMyAppointmentSchema = z.object({
  dismissScheduleNotice: z.literal(true),
});
