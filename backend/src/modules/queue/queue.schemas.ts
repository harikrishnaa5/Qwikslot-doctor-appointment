import { z } from "zod";
import { SessionStatus } from "@prisma/client";

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const createSessionSchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(64).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  avgMinutesPerPatient: z.coerce.number().int().min(1).max(120).optional(),
});

export const patchSessionSchema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  avgMinutesPerPatient: z.coerce.number().int().min(1).max(120).optional(),
});

export const skipPatientSchema = z.object({
  appointmentId: z.string().min(1).optional(),
});

export const queueByDoctorQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sessionId: z.string().optional(),
});
