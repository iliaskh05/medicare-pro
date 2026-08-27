import { javaApi } from "./config";

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

/** GET {JAVA_API_BASE}/api/chat/channels */
export async function fetchChannels(signal?: AbortSignal): Promise<ChatChannelDto[]> {
  const rows = await javaApi<ChatChannelDto[]>("/api/chat/channels", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/chat/channels/{id}/messages */
export async function fetchChannelMessages(
  channelId: ChannelId,
  signal?: AbortSignal,
): Promise<ChatMessageDto[]> {
  const rows = await javaApi<ChatMessageDto[]>(
    `/api/chat/channels/${channelId}/messages`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/**
 * POST {JAVA_API_BASE}/api/chat/channels/{id}/messages
 * L'auteur est dérivé du JWT côté serveur — ne jamais envoyer authorId/authorName.
 */
export async function postChannelMessage(
  channelId: ChannelId,
  body: { body: string },
): Promise<ChatMessageDto> {
  return javaApi<ChatMessageDto>(`/api/chat/channels/${channelId}/messages`, {
    method: "POST",
    body,
  });
}

/** URL du WebSocket temps réel (optionnel, si VITE_WS_URL est défini). */
export function chatSocketUrl(channelId: ChannelId): string {
  const configured = import.meta.env?.["VITE_WS_URL"] as string | undefined;
  const base =
    configured ??
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/chat`
      : "");
  return `${base}?channelId=${encodeURIComponent(channelId)}`;
}
