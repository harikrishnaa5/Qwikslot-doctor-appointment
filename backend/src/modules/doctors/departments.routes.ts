import type { FastifyPluginAsync } from "fastify";
import * as controller from "./doctors.controller.js";

const departmentsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", controller.listDepartments);
};

export default departmentsRoutes;
