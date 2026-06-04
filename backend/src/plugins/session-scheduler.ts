import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { startSessionLifecycleScheduler } from "../modules/queue/session-lifecycle.service.js";

const sessionSchedulerPlugin: FastifyPluginAsync = async (app) => {
  startSessionLifecycleScheduler(app);
};

export default fp(sessionSchedulerPlugin, { name: "session-scheduler" });
