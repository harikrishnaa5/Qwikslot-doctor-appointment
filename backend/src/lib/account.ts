import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { AppError } from "./errors.js";
import type { PublicUser } from "../modules/auth/auth.types.js";
import {
  adminDb,
  asAdminRow,
  asDoctorAuthRow,
  asPatientAuthRow,
  asPatientPublicRow,
  asUserSelect,
  asUserUncheckedCreate,
  asDoctorProfileRow,
  doctorWhereEmail,
  patientAuthSelect,
  patientPublicSelect,
  type PatientCreateData,
  type PatientPublicRow,
} from "./prisma-bridge.js";
import { AdminRole, type AdminRoleValue } from "./roles.js";

export type { PatientCreateData, PatientPublicRow };

export { patientAuthSelect, patientPublicSelect };

export function toPublicPatient(row: PatientPublicRow): PublicUser {
  return { ...row, role: Role.USER };
}

/** Create patient row. */
export async function createPatient(
  app: FastifyInstance,
  data: PatientCreateData
): Promise<PatientPublicRow> {
  const row = await app.prisma.user.create({
    data: asUserUncheckedCreate(data),
    select: asUserSelect(patientPublicSelect),
  });
  return asPatientPublicRow(row);
}

export function adminRoleToJwt(role: AdminRoleValue): Role {
  return role === AdminRole.SUPER_ADMIN ? Role.SUPER_ADMIN : Role.ADMIN;
}

export async function assertEmailAvailable(
  app: FastifyInstance,
  email: string,
  exclude?: { patientId?: string; doctorId?: string; adminId?: string }
) {
  const [patient, doctor, admin] = await Promise.all([
    app.prisma.user.findUnique({ where: { email } }),
    app.prisma.doctor.findUnique({ where: doctorWhereEmail(email) }),
    adminDb(app.prisma).findUnique({ where: { email } }),
  ]);

  if (patient && patient.id !== exclude?.patientId) {
    throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
  }
  if (doctor && doctor.id !== exclude?.doctorId) {
    throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
  }
  if (admin && asAdminRow(admin).id !== exclude?.adminId) {
    throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
  }
}

export async function findAccountByEmail(app: FastifyInstance, email: string) {
  const [patient, doctor, admin] = await Promise.all([
    app.prisma.user.findUnique({ where: { email }, select: asUserSelect(patientAuthSelect) }),
    app.prisma.doctor.findUnique({ where: doctorWhereEmail(email) }),
    adminDb(app.prisma).findUnique({ where: { email } }),
  ]);

  if (patient) {
    const row = asPatientAuthRow(patient);
    return {
      kind: "patient" as const,
      publicUser: toPublicPatient(row),
      passwordHash: row.passwordHash,
    };
  }

  if (doctor) {
    const d = asDoctorAuthRow(doctor);
    return {
      kind: "doctor" as const,
      publicUser: {
        id: d.id,
        email: d.email,
        name: d.name,
        phone: null,
        role: Role.DOCTOR,
        createdAt: d.createdAt,
      },
      passwordHash: d.passwordHash,
      active: d.active,
    };
  }

  if (admin) {
    const a = asAdminRow(admin);
    return {
      kind: "admin" as const,
      publicUser: {
        id: a.id,
        email: a.email,
        name: a.name,
        phone: null,
        role: adminRoleToJwt(a.role),
        createdAt: a.createdAt,
      },
      passwordHash: a.passwordHash,
    };
  }

  return null;
}

export async function getPublicUserById(
  app: FastifyInstance,
  id: string,
  role: Role
): Promise<PublicUser> {
  if (role === Role.USER) {
    const patient = await app.prisma.user.findUnique({
      where: { id },
      select: asUserSelect(patientPublicSelect),
    });
    if (!patient) throw new AppError(404, "User not found", "NOT_FOUND");
    return toPublicPatient(asPatientPublicRow(patient));
  }

  if (role === Role.DOCTOR) {
    const doctor = await app.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new AppError(404, "User not found", "NOT_FOUND");
    const d = asDoctorProfileRow(doctor);
    return {
      id: d.id,
      email: d.email,
      name: d.name,
      phone: null,
      role: Role.DOCTOR,
      createdAt: d.createdAt,
    };
  }

  const admin = await adminDb(app.prisma).findUnique({ where: { id } });
  if (!admin) throw new AppError(404, "User not found", "NOT_FOUND");
  const a = asAdminRow(admin);
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    phone: null,
    role: adminRoleToJwt(a.role),
    createdAt: a.createdAt,
  };
}
