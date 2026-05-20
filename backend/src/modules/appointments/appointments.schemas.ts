import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  paymentRef: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const patchAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const appointmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  doctorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const patchMyAppointmentSchema = z.object({
  dismissScheduleNotice: z.literal(true),
});
