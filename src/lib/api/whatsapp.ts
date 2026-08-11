import type { WaConversation, WaMessage } from "@/types/whatsapp";

import { javaApi } from "./config";

/** GET {JAVA_API_BASE}/api/whatsapp/conversations */
export async function fetchWaConversations(signal?: AbortSignal): Promise<WaConversation[]> {
  const rows = await javaApi<WaConversation[]>(
    "/api/whatsapp/conversations",
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** POST {JAVA_API_BASE}/api/whatsapp/conversations/{id}/messages */
export async function sendWaMessage(conversationId: string, texte: string): Promise<WaMessage> {
  return javaApi<WaMessage>(
    `/api/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: { texte } },
  );
}
