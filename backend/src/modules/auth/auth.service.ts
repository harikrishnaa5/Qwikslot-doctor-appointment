import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { loadConfig } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { prismaRefreshToken } from "../../lib/prisma-refresh.js";
import { generateRefreshToken, hashRefreshToken } from "../../lib/refresh-token.js";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants.js";
import type { AuthTokensResponse, JwtPayload, PublicUser } from "./auth.types.js";
import type { loginSchema, registerSchema } from "./auth.schemas.js";
import type { z } from "zod";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

export async function registerUser(
  app: FastifyInstance,
  body: z.infer<typeof registerSchema>
): Promise<AuthTokensResponse> {
  const existing = await app.prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, "Email already registered", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await app.prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      role: Role.USER,
    },
    select: userSelect,
  });

  return issueAuthTokens(app, user);
}

export async function loginUser(
  app: FastifyInstance,
  body: z.infer<typeof loginSchema>
): Promise<AuthTokensResponse> {
  const user = await app.prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  return issueAuthTokens(app, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  });
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
    include: { user: { select: userSelect } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  await refreshDb.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueAuthTokens(app, stored.user);
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

export async function getMe(app: FastifyInstance, userId: string): Promise<PublicUser> {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
  return user;
}

async function issueAuthTokens(
  app: FastifyInstance,
  user: PublicUser
): Promise<AuthTokensResponse> {
  const accessToken = app.jwt.sign(buildPayload(user), { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  const refreshToken = await createRefreshToken(app, user.id);

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}

async function createRefreshToken(app: FastifyInstance, userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  const { REFRESH_TOKEN_TTL_DAYS } = loadConfig();
  const plain = generateRefreshToken();
  const tokenHash = hashRefreshToken(plain, secret);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prismaRefreshToken(app).create({
    data: { userId, tokenHash, expiresAt },
  });

  return plain;
}

function buildPayload(user: { id: string; email: string; role: Role }): JwtPayload {
  return { sub: user.id, email: user.email, role: user.role, typ: "access" };
}
