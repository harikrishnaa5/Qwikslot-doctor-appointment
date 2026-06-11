import { z } from "zod";
import { AppointmentStatus, Role } from "@prisma/client";
import { optionalPhoneSchema } from "../../lib/phone.js";
import { paginationQuerySchema } from "../../lib/pagination.js";

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

/** Stored value is a short public URL (S3/LocalStack or any https link), not inline base64. */
const doctorImageUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (s) => s === "" || /^https?:\/\//i.test(s),
    "Use an https image URL or upload a file (POST /api/v1/admin/uploads/doctor-photo)"
  );

export const createDoctorSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  specialization: z.string().max(200).optional(),
  experience: z.string().max(200).optional(),
  qualification: z.string().max(1000).optional(),
  imageUrl: z.union([doctorImageUrlSchema, z.literal("")]).optional(),
  active: z.boolean().optional(),
});

export const updateDoctorSchema = z.object({
  departmentId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  specialization: z.string().max(200).optional(),
  experience: z.string().max(200).optional(),
  qualification: z.string().max(1000).optional(),
  imageUrl: z.union([doctorImageUrlSchema, z.literal("")]).optional(),
  active: z.boolean().optional(),
});

export const adminUserListQuerySchema = paginationQuerySchema;

export const adminPatientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  filter: z.enum(["all", "pending", "completed"]).default("all"),
  search: z.string().trim().max(120).optional(),
});

export const adminResourceListQuerySchema = paginationQuerySchema;

export const adminAvailabilityListQuerySchema = paginationQuerySchema.extend({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  range: z.enum(["future", "past"]),
});

export const upsertAvailabilitySchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const patchAvailabilitySchema = z
  .object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
  .refine((b) => b.startTime !== undefined || b.endTime !== undefined, {
    message: "At least one of startTime or endTime is required",
  });

export const adminAppointmentListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  doctorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const createStaffUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});

export const patchSuperUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: optionalPhoneSchema,
    role: z.enum([Role.ADMIN, Role.SUPER_ADMIN]).optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined || d.phone !== undefined, {
    message: "At least one of name, phone, or role is required",
  });
