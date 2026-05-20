import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "./lib/errors.js";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import websocketPlugin from "./plugins/websocket.js";
import authRoutes from "./modules/auth/auth.routes.js";
import departmentsRoutes from "./modules/doctors/departments.routes.js";
import doctorsRoutes from "./modules/doctors/doctors.routes.js";
import appointmentsRoutes from "./modules/appointments/appointments.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

export async function buildApp() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  const app = Fastify({
    bodyLimit: 2 * 1024 * 1024,
    logger:
      nodeEnv === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
            },
          }
        : true,
  });

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  await app.register(cors, {
    origin: corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(websocketPlugin);

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        details: err.flatten(),
      });
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message, code: err.code });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      request.log.error(err);
      return reply.status(500).send({
        error: err.message,
        code: err.code,
        meta: err.meta,
      });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      request.log.error(err);
      return reply.status(400).send({ error: err.message });
    }
    request.log.error(err);
    return reply.status(500).send({ error: "Internal server error" });
  });

  app.get("/health", async () => ({ ok: true, service: "doctor-appointment-api" }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(departmentsRoutes, { prefix: "/api/v1/departments" });
  await app.register(doctorsRoutes, { prefix: "/api/v1/doctors" });
  await app.register(appointmentsRoutes, { prefix: "/api/v1/appointments" });
  await app.register(paymentsRoutes, { prefix: "/api/v1/payments" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });

  return app;
}
