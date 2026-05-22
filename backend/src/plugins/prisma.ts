import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createPrismaClient } from "../lib/prisma-client.js";

const prismaPlugin: FastifyPluginAsync = async (app) => {
  const prisma = createPrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  app.decorate("prisma", prisma);

  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: "prisma" });
