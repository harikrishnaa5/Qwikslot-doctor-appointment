import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { loadConfig } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import {
  assertEmailAvailable,
  createPatient,
  findAccountByEmail,
  getPublicUserById,
  toPublicPatient,
} from "../../lib/account.js";
import { prismaRefreshToken, resolveRefreshAccount, refreshInclude } from "../../lib/prisma-refresh.js";
import { generateRefreshToken, hashRefreshToken } from "../../lib/refresh-token.js";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants.js";
import type { AuthTokensResponse, JwtPayload, PublicUser } from "./auth.types.js";
import type { loginSchema, registerSchema } from "./auth.schemas.js";
import type { z } from "zod";

export async function registerUser(
  app: FastifyInstance,
  body: z.infer<typeof registerSchema>
): Promise<AuthTokensResponse> {
  await assertEmailAvailable(app, body.email);

  const passwordHash = await bcrypt.hash(body.password, 10);
  const patient = await createPatient(app, {
    email: body.email,
    passwordHash,
    name: body.name,
    phone: body.phone,
  });

  return issueAuthTokens(app, toPublicPatient(patient));
}

export async function loginUser(
  app: FastifyInstance,
  body: z.infer<typeof loginSchema>
): Promise<AuthTokensResponse> {
  const account = await findAccountByEmail(app, body.email);
  if (!account) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(body.password, account.passwordHash);
  if (!ok) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  if (account.kind === "doctor" && !account.active) {
    throw new AppError(403, "Doctor account is inactive", "DOCTOR_INACTIVE");
  }

  return issueAuthTokens(app, account.publicUser);
}

export async function refreshSession(
  app: FastifyInstance,
  refreshToken: string
): Promise<AuthTokensResponse> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  const tokenHash = hashRefreshToken(refreshToken, secret);
  const refreshDb = prismaRefreshToken(app);
  const stored = await refreshDb.findUnique({
    where: { tokenHash },
    include: refreshInclude,
  });

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  const publicUser = resolveRefreshAccount(stored);
  if (!publicUser) {
    throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  await refreshDb.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueAuthTokens(app, publicUser);
}

export async function logoutUser(app: FastifyInstance, refreshToken: string): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  const tokenHash = hashRefreshToken(refreshToken, secret);
  await prismaRefreshToken(app).updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(
  app: FastifyInstance,
  accountId: string,
  role: Role
): Promise<PublicUser> {
  return getPublicUserById(app, accountId, role);
}

async function issueAuthTokens(
  app: FastifyInstance,
  user: PublicUser
): Promise<AuthTokensResponse> {
  const accessToken = app.jwt.sign(buildPayload(user), { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  const refreshToken = await createRefreshToken(app, user);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}

async function createRefreshToken(app: FastifyInstance, user: PublicUser): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  const { REFRESH_TOKEN_TTL_DAYS } = loadConfig();
  const plain = generateRefreshToken();
  const tokenHash = hashRefreshToken(plain, secret);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  const data: {
    tokenHash: string;
    expiresAt: Date;
    patientId?: string;
    doctorId?: string;
    adminId?: string;
  } = { tokenHash, expiresAt };

  if (user.role === Role.USER) data.patientId = user.id;
  else if (user.role === Role.DOCTOR) data.doctorId = user.id;
  else data.adminId = user.id;

  await prismaRefreshToken(app).create({ data });

  return plain;
}

function buildPayload(user: PublicUser): JwtPayload {
  return { sub: user.id, email: user.email, role: user.role, typ: "access" };
}
