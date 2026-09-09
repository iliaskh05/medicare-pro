import { javaApi, javaApiForm, getJavaApiBase } from "./config";
import { readAuthToken } from "@/lib/auth-session";

export type ChatChannelType = "GROUP" | "DIRECT";
export type ChatMessageType = "TEXT" | "IMAGE" | "PDF" | "AUDIO";

export type ChatChannelDto = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  type?: ChatChannelType;
  peerUserId?: string;
  peerName?: string;
  peerEmail?: string;
  unreadCount?: number;
};

export type ChatDirectoryUserDto = {
  id: string;
  nomComplet: string;
  email: string;
  role: string;
};

export type ChatMessageDto = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  messageType?: ChatMessageType;
  body: string | null;
  createdAt: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  durationSeconds?: number | null;
};

/** @deprecated use string channel ids from API */
export type ChannelId = string;

/** GET {JAVA_API_BASE}/api/chat/channels */
export async function fetchChannels(signal?: AbortSignal): Promise<ChatChannelDto[]> {
  const rows = await javaApi<ChatChannelDto[]>("/api/chat/channels", signal ? { signal } : {});
  return rows ?? [];
}

/** POST {JAVA_API_BASE}/api/chat/channels/{id}/read */
export async function markChannelRead(channelId: string): Promise<void> {
  await javaApi<void>(`/api/chat/channels/${encodeURIComponent(channelId)}/read`, {
    method: "POST",
  });
}

/** GET {JAVA_API_BASE}/api/chat/directory?q= */
export async function searchChatDirectory(
  q: string,
  signal?: AbortSignal,
): Promise<ChatDirectoryUserDto[]> {
  const query = encodeURIComponent(q.trim());
  const rows = await javaApi<ChatDirectoryUserDto[]>(
    `/api/chat/directory?q=${query}`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** POST {JAVA_API_BASE}/api/chat/direct */
export async function openDirectChat(peerUserId: string): Promise<ChatChannelDto> {
  return javaApi<ChatChannelDto>("/api/chat/direct", {
    method: "POST",
    body: { peerUserId: Number(peerUserId) },
  });
}

/** GET {JAVA_API_BASE}/api/chat/channels/{id}/messages */
export async function fetchChannelMessages(
  channelId: string,
  signal?: AbortSignal,
): Promise<ChatMessageDto[]> {
  const rows = await javaApi<ChatMessageDto[]>(
    `/api/chat/channels/${encodeURIComponent(channelId)}/messages`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/**
 * POST {JAVA_API_BASE}/api/chat/channels/{id}/messages
 * L'auteur est dérivé du JWT côté serveur.
 */
export async function postChannelMessage(
  channelId: string,
  body: { body: string },
): Promise<ChatMessageDto> {
  return javaApi<ChatMessageDto>(
    `/api/chat/channels/${encodeURIComponent(channelId)}/messages`,
    { method: "POST", body },
  );
}

/** POST multipart upload image/PDF/audio */
export async function uploadChannelMessage(
  channelId: string,
  file: File,
  caption?: string,
  options?: { durationSeconds?: number; signal?: AbortSignal },
): Promise<ChatMessageDto> {
  const form = new FormData();
  form.append("file", file);
  if (caption?.trim()) form.append("caption", caption.trim());
  if (options?.durationSeconds != null && options.durationSeconds > 0) {
    form.append("durationSeconds", String(Math.round(options.durationSeconds)));
  }
  return javaApiForm<ChatMessageDto>(
    `/api/chat/channels/${encodeURIComponent(channelId)}/messages/upload`,
    form,
    { signal: options?.signal },
  );
}

/** Absolute URL for chat file (still needs Authorization header for fetch). */
export function chatFileAbsoluteUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${getJavaApiBase()}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

/** Download / preview chat file with JWT → Blob URL (revoke after use). */
export async function fetchChatFileBlob(fileUrl: string, signal?: AbortSignal): Promise<Blob> {
  const token = readAuthToken();
  const res = await fetch(chatFileAbsoluteUrl(fileUrl), {
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error("Fichier inaccessible");
  }
  return res.blob();
}

/** WebSocket URL with JWT query param. */
export function chatSocketUrl(): string {
  const rawWs = (import.meta.env?.["VITE_WS_URL"] as string | undefined)?.trim();
  let base =
    rawWs?.replace(/\/$/, "") ||
    getJavaApiBase().replace(/^http/, "ws");
  // Si VITE_WS_URL contient déjà /ws/chat (config legacy), ne pas le doubler
  if (/\/ws\/chat$/i.test(base)) {
    base = base.replace(/\/ws\/chat$/i, "");
  }
  const token = readAuthToken() ?? "";
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${base}/ws/chat${qs}`;
}
