import { HttpError } from "../auth/secure";
import { publish, subscribe } from "../realtime/events";
import { domainRefs, store } from "../store/memory-store";
import type { ChatMessage, ChatRoom } from "../store/types";

export function listRooms(): ChatRoom[] {
  return store.rooms;
}

export function getRoom(roomId: string): ChatRoom {
  const room = store.rooms.find((r) => r.id === roomId);
  if (!room) throw new HttpError(404, "Salon introuvable", "not_found");
  return room;
}

export function listMessages(roomId: string, limit = 100): ChatMessage[] {
  getRoom(roomId);
  return store.messages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

export type SendMessageInput = {
  roomId: string;
  senderId: string;
  body: string;
  studyId?: string;
};

export function sendMessage(input: SendMessageInput): ChatMessage {
  getRoom(input.roomId);
  const body = input.body.trim();
  if (!body) throw new HttpError(400, "Message vide", "empty_message");
  if (body.length > 4000) throw new HttpError(400, "Message trop long", "message_too_long");

  const sender =
    domainRefs.doctors.find((d) => d.id === input.senderId) ??
    ({ id: input.senderId, name: input.senderId, role: "radiologue" } as const);

  const message: ChatMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    roomId: input.roomId,
    senderId: sender.id,
    senderName: sender.name,
    body,
    createdAt: new Date().toISOString(),
    ...(input.studyId ? { studyId: input.studyId } : {}),
  };

  store.messages.push(message);
  publish({ type: "chat.message", payload: message });
  return message;
}

/** WebSocket clients keyed by connection id. */
type WsClient = {
  id: string;
  roomId: string | null;
  send: (data: string) => void;
};

const g = globalThis as typeof globalThis & { __radiocrmWs?: Map<string, WsClient> };
const wsClients = g.__radiocrmWs ?? (g.__radiocrmWs = new Map());

export function registerWsClient(client: WsClient): () => void {
  wsClients.set(client.id, client);
  return () => wsClients.delete(client.id);
}

export function broadcastWs(roomId: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const client of wsClients.values()) {
    if (client.roomId && client.roomId !== roomId) continue;
    try {
      client.send(data);
    } catch {
      wsClients.delete(client.id);
    }
  }
}

subscribeChatToWs();

function subscribeChatToWs() {
  const g2 = globalThis as typeof globalThis & { __radiocrmWsBridged?: boolean };
  if (g2.__radiocrmWsBridged) return;
  g2.__radiocrmWsBridged = true;

  subscribe((event) => {
    if (event.type !== "chat.message") return;
    broadcastWs(event.payload.roomId, { type: event.type, payload: event.payload });
  });
}
