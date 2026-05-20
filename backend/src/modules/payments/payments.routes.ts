import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import * as controller from "./payments.controller.js";

const paymentsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/mock/intent", { preHandler: [authenticate] }, controller.createMockIntent);
};

export default paymentsRoutes;
