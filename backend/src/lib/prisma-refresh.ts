import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import type { PublicUser } from "../modules/auth/auth.types.js";
import { adminRoleToJwt } from "./account.js";

type StoredRefresh = {
  id: string;
  revokedAt: Date | null;
  expiresAt: Date;
  patient: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    createdAt: Date;
  } | null;
  doctor: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  } | null;
  admin: {
    id: string;
    email: string;
    name: string;
    role: import("./roles.js").AdminRoleValue;
    createdAt: Date;
  } | null;
};

function storedToPublicUser(row: StoredRefresh): PublicUser | null {
  if (row.patient) {
    return {
      id: row.patient.id,
      email: row.patient.email,
      name: row.patient.name,
      phone: row.patient.phone,
      role: Role.USER,
      createdAt: row.patient.createdAt,
    };
  }
  if (row.doctor) {
    return {
      id: row.doctor.id,
      email: row.doctor.email,
      name: row.doctor.name,
      phone: null,
      role: Role.DOCTOR,
      createdAt: row.doctor.createdAt,
    };
  }
  if (row.admin) {
    return {
      id: row.admin.id,
      email: row.admin.email,
      name: row.admin.name,
      phone: null,
      role: adminRoleToJwt(row.admin.role),
      createdAt: row.admin.createdAt,
    };
  }
  return null;
}

const refreshInclude = {
  patient: {
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  },
  doctor: { select: { id: true, email: true, name: true, createdAt: true } },
  admin: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
} as const;

/** CRUD surface used by auth refresh-token flows. */
export type RefreshTokenDb = {
  findUnique(args: {
    where: { tokenHash: string };
    include: typeof refreshInclude;
  }): Promise<(StoredRefresh & { user?: never }) | null>;
  update(args: { where: { id: string }; data: { revokedAt: Date } }): Promise<unknown>;
  updateMany(args: {
    where: { tokenHash: string; revokedAt: null };
    data: { revokedAt: Date };
  }): Promise<{ count: number }>;
  create(args: {
    data: {
      tokenHash: string;
      expiresAt: Date;
      patientId?: string;
      doctorId?: string;
      adminId?: string;
    };
  }): Promise<unknown>;
};

export function prismaRefreshToken(app: FastifyInstance): RefreshTokenDb {
  return (app.prisma as unknown as { refreshToken: RefreshTokenDb }).refreshToken;
}

export function resolveRefreshAccount(row: StoredRefresh): PublicUser | null {
  return storedToPublicUser(row);
}

export { refreshInclude };
