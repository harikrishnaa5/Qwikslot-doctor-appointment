import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyPluginAsync } from "fastify";
import { subscribeSessionRoom } from "../realtime/queue-hub.js";

const wsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (connection) => {
    const socket = connection.socket;
    let cleanup: (() => void) | undefined;

    socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          type?: string;
          sessionId?: string;
          /** @deprecated subscribe by sessionId */
          doctorId?: string;
        };

        if (msg.type === "subscribe" && msg.sessionId) {
          cleanup?.();
          cleanup = subscribeSessionRoom(msg.sessionId, socket);
          socket.send(
            JSON.stringify({ event: "subscribed", sessionId: msg.sessionId })
          );
          return;
        }

        if (msg.type === "subscribe" && msg.doctorId) {
          socket.send(
            JSON.stringify({
              event: "error",
              message:
                "Subscribe with sessionId (doctor+date channels are deprecated). Fetch queue status to get sessionId.",
            })
          );
          return;
        }

        socket.send(JSON.stringify({ event: "error", message: "Invalid message" }));
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
