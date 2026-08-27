import { javaApi } from "./config";

export type AssistantChatRequest = {
  message: string;
  pathname?: string;
  role?: string;
};

export type AssistantChatResponse = {
  text: string;
  intent: string;
  gemini: boolean;
};

/** POST /api/assistant/chat — réponse Gemini côté serveur Spring. */
export async function askAssistant(
  body: AssistantChatRequest,
  signal?: AbortSignal,
): Promise<AssistantChatResponse> {
  return javaApi<AssistantChatResponse>("/api/assistant/chat", {
    method: "POST",
    body,
    signal,
  });
}
