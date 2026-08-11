import { isJavaApiConfigured, javaApi } from "./config";

/** Canaux internes du centre (créés côté backend, identifiants stables). */
export type ChannelId = "accueil-medecins" | "techniciens-medecins" | "general";

export type ChatChannelDto = {
  id: ChannelId;
  name: string;
  description: string;
  membersCount: number;
};

export type ChatMessageDto = {
  id: string;
  channelId: ChannelId;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
  attachment?:
    | { kind: "image"; url: string; caption: string }
    | { kind: "file"; name: string; size: string }
    | { kind: "audio"; durationSec: number; transcript: string };
};

/**
 * Liste des canaux.
 * TODO backend Java : GET /api/chat/channels
 */
export async function fetchChannels(): Promise<ChatChannelDto[] | null> {
  if (isJavaApiConfigured()) return javaApi<ChatChannelDto[]>("/api/chat/channels");
  return null;
}

/**
 * Historique d'un canal (chargé avant l'ouverture du WebSocket).
 * TODO backend Java : GET /api/chat/channels/{id}/messages
 */
export async function fetchChannelMessages(channelId: ChannelId): Promise<ChatMessageDto[] | null> {
  if (isJavaApiConfigured()) {
    return javaApi<ChatMessageDto[]>(`/api/chat/channels/${channelId}/messages`);
  }
  return null;
}

/**
 * Envoi d'un message. Le transport privilégié est le WebSocket ; cette route
 * HTTP sert de repli lorsque la socket est fermée.
 * TODO backend Java : POST /api/chat/channels/{id}/messages
 */
export async function postChannelMessage(
  channelId: ChannelId,
  body: { authorId: string; authorName: string; body: string },
): Promise<ChatMessageDto | null> {
  if (isJavaApiConfigured()) {
    return javaApi<ChatMessageDto>(`/api/chat/channels/${channelId}/messages`, {
      method: "POST",
      body,
    });
  }
  return null;
}

/** URL du WebSocket temps réel exposé par le backend Java. */
export function chatSocketUrl(channelId: ChannelId): string {
  const configured = import.meta.env?.["VITE_WS_URL"] as string | undefined;
  const base =
    configured ??
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/chat`
      : "");
  return `${base}?channelId=${encodeURIComponent(channelId)}`;
}
