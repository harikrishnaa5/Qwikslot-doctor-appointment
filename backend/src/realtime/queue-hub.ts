type HubMessage =
  | { event: "queue_updated"; payload: unknown }
  | { event: "current_token_changed"; payload: unknown }
  | { event: "subscribed"; sessionId: string }
  | { event: "error"; message: string };

export type ClientSocket = { readyState: number; send: (data: string) => void };

/** Room key: one channel per doctor session (independent queues). */
function roomKey(sessionId: string) {
  return `session:${sessionId}`;
}

const rooms = new Map<string, Set<ClientSocket>>();

function safeSend(ws: ClientSocket, data: string) {
  if (ws.readyState === 1) ws.send(data);
}

export function subscribeSessionRoom(sessionId: string, ws: ClientSocket) {
  const key = roomKey(sessionId);
  let set = rooms.get(key);
  if (!set) {
    set = new Set();
    rooms.set(key, set);
  }
  set.add(ws);
  return () => {
    set!.delete(ws);
    if (set!.size === 0) rooms.delete(key);
  };
}

export function broadcastSession(sessionId: string, message: HubMessage) {
  const set = rooms.get(roomKey(sessionId));
  if (!set) return;
  const raw = JSON.stringify(message);
  for (const ws of set) safeSend(ws, raw);
}

