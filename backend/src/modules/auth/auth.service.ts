import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import type { JwtPayload } from "./auth.types.js";
import type { loginSchema, registerSchema } from "./auth.schemas.js";
import type { z } from "zod";

export async function registerUser(
  app: FastifyInstance,
  body: z.infer<typeof registerSchema>
) {
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
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = app.jwt.sign(buildPayload(user));
  return { user, token };
}

export async function loginUser(app: FastifyInstance, body: z.infer<typeof loginSchema>) {
  const user = await app.prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");

  const token = app.jwt.sign(
    buildPayload({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function getMe(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
  return user;
}

function buildPayload(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): JwtPayload {
  return { sub: user.id, email: user.email, role: user.role };
}
