import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const doctorAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const doctorAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

const doctorImageUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (s) => s === "" || /^https?:\/\//i.test(s),
    "Use an https image URL or upload a photo file"
  );

export const updateDoctorProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    specialization: z.string().max(200).optional(),
    experience: z.string().max(200).optional(),
    qualification: z.string().max(1000).optional(),
    imageUrl: z.union([doctorImageUrlSchema, z.literal("")]).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine(
    (b) =>
      Object.keys(b).some(
        (k) => b[k as keyof typeof b] !== undefined && b[k as keyof typeof b] !== ""
      ),
    { message: "At least one field is required" }
  );
