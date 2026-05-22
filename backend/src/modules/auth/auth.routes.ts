import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import * as controller from "./auth.controller.js";

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", controller.register);
  app.post("/login", controller.login);
  app.post("/refresh", controller.refresh);
  app.post("/logout", controller.logout);
  app.get("/me", { preHandler: [authenticate] }, controller.me);
};

export default authRoutes;
