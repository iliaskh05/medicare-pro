import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import {
  ingestWhatsAppPayload,
  listWhatsAppInbox,
  sendWhatsAppText,
  verifyWhatsAppChallenge,
  verifyWhatsAppSignature,
} from "@/server/whatsapp/handler";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const challenge = verifyWhatsAppChallenge(new URL(request.url));
          return new Response(challenge, {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          await verifyWhatsAppSignature(raw, request.headers.get("x-hub-signature-256"));
          const payload = JSON.parse(raw) as unknown;
          const ingested = ingestWhatsAppPayload(payload);
          return jsonOk({ received: ingested.length, messages: ingested });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
