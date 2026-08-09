import { serverConfig } from "../config";
import { HttpError, safeEqual } from "../auth/secure";
import { publish } from "../realtime/events";
import { store } from "../store/memory-store";
import type { WhatsAppInbound } from "../store/types";

/** Meta webhook verification (GET). */
export function verifyWhatsAppChallenge(url: URL): string {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && safeEqual(token, serverConfig.whatsapp.verifyToken) && challenge) {
    return challenge;
  }
  throw new HttpError(403, "Vérification WhatsApp refusée", "wa_verify_failed");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<void> {
  const secret = serverConfig.whatsapp.appSecret;
  if (!secret) {
    // Dev mode: allow without signature when secret unset
    return;
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    throw new HttpError(401, "Signature WhatsApp manquante", "wa_sig_missing");
  }
  const digest = await hmacSha256Hex(secret, rawBody);
  const expected = `sha256=${digest}`;
  if (!safeEqual(expected, signatureHeader)) {
    throw new HttpError(401, "Signature WhatsApp invalide", "wa_sig_invalid");
  }
}

type WaChange = {
  value?: {
    messages?: Array<{
      id: string;
      from: string;
      timestamp: string;
      type: string;
      text?: { body?: string };
    }>;
    contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  };
};

export function ingestWhatsAppPayload(payload: unknown): WhatsAppInbound[] {
  const body = payload as {
    object?: string;
    entry?: Array<{ changes?: WaChange[] }>;
  };

  if (body.object !== "whatsapp_business_account") {
    throw new HttpError(400, "Payload WhatsApp inattendu", "wa_bad_object");
  }

  const ingested: WhatsAppInbound[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      const contactName = change.value?.contacts?.[0]?.profile?.name;
      for (const msg of messages) {
        const inbound: WhatsAppInbound = {
          id: msg.id,
          from: msg.from,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          type: msg.type,
          ...(msg.text?.body ? { text: msg.text.body } : {}),
          ...(contactName ? { patientHint: contactName } : {}),
          raw: msg,
        };
        store.whatsapp.unshift(inbound);
        publish({ type: "whatsapp.inbound", payload: inbound });
        ingested.push(inbound);
      }
    }
  }

  if (store.whatsapp.length > 500) store.whatsapp.length = 500;
  return ingested;
}

export async function sendWhatsAppText(to: string, text: string): Promise<{ id: string } | null> {
  const { accessToken, phoneNumberId } = serverConfig.whatsapp;
  if (!accessToken || !phoneNumberId) {
    return { id: `wamid.dev.${Date.now()}` };
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    console.error("WhatsApp send failed", await res.text());
    throw new HttpError(502, "Échec envoi WhatsApp", "wa_send_failed");
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return { id: data.messages?.[0]?.id ?? "unknown" };
}

export function listWhatsAppInbox(limit = 50): WhatsAppInbound[] {
  return store.whatsapp.slice(0, limit);
}
