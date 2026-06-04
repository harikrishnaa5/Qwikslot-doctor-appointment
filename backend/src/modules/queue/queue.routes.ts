import type { FastifyPluginAsync } from "fastify";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/require-roles.js";
import * as controller from "./queue.controller.js";

/** Public queue read endpoints */
const queuePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/sessions/:sessionId", controller.getSessionQueue);
};

/** Admin queue control */
const queueAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

  app.get("/doctors/:doctorId/sessions", controller.listSessions);
  app.post("/sessions", controller.createSession);
  app.patch("/sessions/:sessionId", controller.patchSession);
  app.post("/sessions/:sessionId/start", controller.startConsultation);
  app.post("/sessions/:sessionId/next", controller.nextPatient);
  app.post("/sessions/:sessionId/skip", controller.skipPatient);
  app.post("/appointments/:appointmentId/complete", controller.completeAppointment);
  app.post("/appointments/:appointmentId/check-in", controller.checkInAppointment);
};

export { queuePublicRoutes, queueAdminRoutes };
