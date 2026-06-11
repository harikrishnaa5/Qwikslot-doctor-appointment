import type { FastifyPluginAsync } from "fastify";
import { optionalAuthenticate } from "../../middleware/optional-authenticate.js";
import * as controller from "./doctors.controller.js";

const doctorsPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", controller.listDoctors);
  app.get("/:id/slots", { preHandler: [optionalAuthenticate] }, controller.getSlots);
  app.get("/:id/queue", controller.getQueue);
  app.get("/:id", controller.getDoctor);
};

export default doctorsPublicRoutes;
