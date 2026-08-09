import { createFileRoute } from "@tanstack/react-router";

import { HttpError, jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import { listMessages, sendMessage } from "@/server/chat/hub";

export const Route = createFileRoute("/api/chat/messages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          const url = new URL(request.url);
          const roomId = url.searchParams.get("roomId");
          if (!roomId) throw new HttpError(400, "roomId requis", "missing_room");
          const limit = Number(url.searchParams.get("limit") ?? 100);
          return jsonOk({ messages: listMessages(roomId, limit) });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        try {
          requireApiAuth(request);
          const body = await parseJsonBody<{
            roomId: string;
            senderId: string;
            body: string;
            studyId?: string;
          }>(request);
          const message = sendMessage(body);
          return jsonOk(message);
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
