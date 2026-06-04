import type { Role } from "@prisma/client";

/** Prisma `Role.DOCTOR` — use when the generated client predates the DOCTOR enum value. */
export const DOCTOR_ROLE: Role = "DOCTOR" as Role;

/** Matches Prisma `AdminRole` enum — use when the generated client predates the AdminRole export. */
export const AdminRole = {
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type AdminRoleValue = (typeof AdminRole)[keyof typeof AdminRole];
