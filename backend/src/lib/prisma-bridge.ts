/**
 * Typed shapes + thin casts for Prisma models.
 * Prefer these helpers over direct Prisma input types when the IDE client is stale
 * (run `npm run db:generate`, then restart the TS server).
 */
import type { Prisma } from "@prisma/client";
import type { AdminRoleValue } from "./roles.js";
import type { AppPrismaClient } from "./prisma-client.js";

// ——— Patient (User table) ———

export type PatientCreateData = {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
};

export type PatientPublicRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: Date;
};

export type PatientAuthRow = PatientPublicRow & { passwordHash: string };

export const patientAuthSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  passwordHash: true,
  createdAt: true,
} as const;

export const patientPublicSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  createdAt: true,
} as const;

export const patientListSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  createdAt: true,
} as const;

export const appointmentPatientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
} as const;

export function asUserUncheckedCreate(data: PatientCreateData): Prisma.UserUncheckedCreateInput {
  return data as unknown as Prisma.UserUncheckedCreateInput;
}

export function asUserUncheckedUpdate(data: Record<string, unknown>): Prisma.UserUncheckedUpdateInput {
  return data as unknown as Prisma.UserUncheckedUpdateInput;
}

export function asUserSelect<T>(select: T): Prisma.UserSelect {
  return select as unknown as Prisma.UserSelect;
}

export function asUserWhereInput(where: Record<string, unknown>): Prisma.UserWhereInput {
  return where as unknown as Prisma.UserWhereInput;
}

export function asPatientPublicRow(row: unknown): PatientPublicRow {
  return row as unknown as PatientPublicRow;
}

export function asPatientAuthRow(row: unknown): PatientAuthRow {
  return row as unknown as PatientAuthRow;
}

// ——— Doctor ———

export type DoctorAuthRow = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  active: boolean;
  createdAt: Date;
};

export type DoctorCreateData = {
  departmentId: string;
  email: string;
  passwordHash: string;
  name: string;
  specialization?: string | null;
  experience?: string | null;
  qualification?: string | null;
  imageUrl?: string | null;
  active?: boolean;
};

export type DoctorSeedData = DoctorCreateData & {
  id: string;
  specialization: string;
  experience: string;
  qualification: string;
  imageUrl: string;
};

export type DoctorProfileRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  specialization: string | null;
  experience: string | null;
  qualification: string | null;
  imageUrl: string | null;
  department: { id: string; name: string };
};

export function asDoctorUncheckedCreate(
  data: DoctorCreateData & { id?: string }
): Prisma.DoctorUncheckedCreateInput {
  return data as unknown as Prisma.DoctorUncheckedCreateInput;
}

export function asDoctorUncheckedUpdate(data: Record<string, unknown>): Prisma.DoctorUncheckedUpdateInput {
  return data as unknown as Prisma.DoctorUncheckedUpdateInput;
}

export function doctorWhereEmail(email: string): Prisma.DoctorWhereUniqueInput {
  return { email } as unknown as Prisma.DoctorWhereUniqueInput;
}

export function asDoctorProfileRow(doctor: unknown): DoctorProfileRow {
  return doctor as unknown as DoctorProfileRow;
}

export function asDoctorAuthRow(row: unknown): DoctorAuthRow {
  return row as unknown as DoctorAuthRow;
}

// ——— Admin ———

export type AdminRow = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRoleValue;
  createdAt: Date;
};

export type AdminListRow = {
  id: string;
  email: string;
  name: string;
  role: AdminRoleValue;
  createdAt: Date;
};

export type AdminCreateData = {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRoleValue;
};

/** Minimal Admin delegate — avoids referencing generated `prisma.admin` types. */
export type AdminDelegate = {
  findUnique(args: {
    where: { id?: string; email?: string };
    select?: Record<string, boolean>;
  }): Promise<unknown>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    skip?: number;
    take?: number;
    select?: Record<string, boolean>;
  }): Promise<unknown[]>;
  create(args: { data: AdminCreateData }): Promise<unknown>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  upsert(args: {
    where: { email: string };
    create: AdminCreateData;
    update?: Record<string, unknown>;
  }): Promise<unknown>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
};

export function asAdminCreateInput(data: AdminCreateData): AdminCreateData {
  return data;
}

export function asAdminUpdateInput(data: Record<string, unknown>): Record<string, unknown> {
  return data;
}

export function asAdminListRow(row: unknown): AdminListRow {
  return row as unknown as AdminListRow;
}

export function asAdminRow(row: unknown): AdminRow {
  return row as unknown as AdminRow;
}

/** Access `prisma.admin` without requiring `Admin` on the generated `PrismaClient` type. */
export function adminDb(prisma: AppPrismaClient): AdminDelegate {
  return (prisma as unknown as { admin: AdminDelegate }).admin;
}
