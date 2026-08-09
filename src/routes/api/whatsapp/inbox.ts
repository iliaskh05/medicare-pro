import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import { listWhatsAppInbox, sendWhatsAppText } from "@/server/whatsapp/handler";

export const Route = createFileRoute("/api/whatsapp/inbox")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          return jsonOk({ messages: listWhatsAppInbox() });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        try {
          requireApiAuth(request);
          const body = await parseJsonBody<{ to: string; text: string }>(request);
          const sent = await sendWhatsAppText(body.to, body.text);
          return jsonOk({ sent });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
