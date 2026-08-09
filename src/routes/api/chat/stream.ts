import { createFileRoute } from "@tanstack/react-router";

import { jsonError, requireApiAuth } from "@/server/auth/secure";
import { subscribe, toSse } from "@/server/realtime/events";

export const Route = createFileRoute("/api/chat/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          const url = new URL(request.url);
          const roomId = url.searchParams.get("roomId");

          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              let seq = 0;
              const ping = setInterval(() => {
                controller.enqueue(
                  encoder.encode(
                    toSse({ type: "system.ping", payload: { at: new Date().toISOString() } }, `ping-${++seq}`),
                  ),
                );
              }, 15000);

              const unsub = subscribe(
                (event) => {
                  controller.enqueue(encoder.encode(toSse(event, `evt-${++seq}`)));
                },
                (event) => {
                  if (!roomId) return true;
                  if (event.type !== "chat.message") return true;
                  return event.payload.roomId === roomId;
                },
              );

              const close = () => {
                clearInterval(ping);
                unsub();
                try {
                  controller.close();
                } catch {
                  /* already closed */
                }
              };

              request.signal.addEventListener("abort", close);
            },
          });

          return new Response(stream, {
            headers: {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache, no-transform",
              connection: "keep-alive",
            },
          });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
