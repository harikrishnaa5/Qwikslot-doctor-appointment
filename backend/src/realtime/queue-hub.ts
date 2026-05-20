type HubMessage =
  | { event: "token_updated"; payload: unknown }
  | { event: "current_token_changed"; payload: unknown };

export type ClientSocket = { readyState: number; send: (data: string) => void };

const rooms = new Map<string, Set<ClientSocket>>();

function safeSend(ws: ClientSocket, data: string) {
  if (ws.readyState === 1) ws.send(data);
}

export function subscribeDoctorRoom(doctorId: string, ws: ClientSocket) {
  let set = rooms.get(doctorId);
  if (!set) {
    set = new Set();
    rooms.set(doctorId, set);
  }
  set.add(ws);
  return () => {
    set!.delete(ws);
    if (set!.size === 0) rooms.delete(doctorId);
  };
}

export function broadcastDoctor(doctorId: string, message: HubMessage) {
  const set = rooms.get(doctorId);
  if (!set) return;
  const raw = JSON.stringify(message);
  for (const ws of set) safeSend(ws, raw);
}
