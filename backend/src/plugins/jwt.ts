import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";

const jwtPlugin: FastifyPluginAsync = async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  await app.register(jwt, {
    secret,
    sign: { expiresIn: "7d" },
  });
};

export default fp(jwtPlugin, { name: "jwt-plugin" });
