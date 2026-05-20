import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyPluginAsync } from "fastify";
import { subscribeDoctorRoom } from "../realtime/queue-hub.js";

const wsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (connection) => {
    const socket = connection.socket;
    let cleanup: (() => void) | undefined;

    socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; doctorId?: string };
        if (msg.type === "subscribe" && msg.doctorId) {
          cleanup?.();
          cleanup = subscribeDoctorRoom(msg.doctorId, socket);
          socket.send(JSON.stringify({ event: "subscribed", doctorId: msg.doctorId }));
        }
      } catch {
        socket.send(JSON.stringify({ event: "error", message: "Invalid message" }));
      }
    });

    socket.on("close", () => {
      cleanup?.();
    });
  });
};

export default fp(wsPlugin, { name: "websocket" });
