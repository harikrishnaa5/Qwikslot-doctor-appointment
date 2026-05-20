import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import * as controller from "./appointments.controller.js";

const userAppointmentsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", { preHandler: [authenticate] }, controller.book);
  app.get("/mine", { preHandler: [authenticate] }, controller.listMine);
  app.patch("/mine/:id", { preHandler: [authenticate] }, controller.patchMine);
  app.get("/mine/:id", { preHandler: [authenticate] }, controller.getMine);
};

export default userAppointmentsRoutes;
