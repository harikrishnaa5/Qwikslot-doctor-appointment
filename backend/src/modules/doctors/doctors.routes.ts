import type { FastifyPluginAsync } from "fastify";
import * as controller from "./doctors.controller.js";

const doctorsPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", controller.listDoctors);
  app.get("/:id/slots", controller.getSlots);
  app.get("/:id/queue", controller.getQueue);
  app.get("/:id", controller.getDoctor);
};

export default doctorsPublicRoutes;
