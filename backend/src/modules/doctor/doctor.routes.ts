import type { FastifyPluginAsync } from "fastify";
import { DOCTOR_ROLE } from "../../lib/roles.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/require-roles.js";
import * as controller from "./doctor.controller.js";

const doctorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRoles(DOCTOR_ROLE));

  app.get("/me", controller.me);
  app.patch("/profile", controller.patchProfile);
  app.post("/uploads/photo", controller.uploadPhoto);
  app.get("/appointments", controller.listAppointments);
  app.patch("/appointments/:id/status", controller.patchAppointmentStatus);
};

export default doctorRoutes;
