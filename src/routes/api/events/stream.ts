import { createFileRoute } from "@tanstack/react-router";

import { jsonError, requireApiAuth } from "@/server/auth/secure";
import { subscribe, toSse } from "@/server/realtime/events";

/** Global realtime fan-out (chat, fraud, imaging, whatsapp). */
export const Route = createFileRoute("/api/events/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          const url = new URL(request.url);
          const types = new Set(
            (url.searchParams.get("types") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );

          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              let seq = 0;
              controller.enqueue(
                encoder.encode(
                  toSse(
                    { type: "system.ping", payload: { at: new Date().toISOString() } },
                    "hello",
                  ),
                ),
              );

              const ping = setInterval(() => {
                controller.enqueue(
                  encoder.encode(
                    toSse(
                      { type: "system.ping", payload: { at: new Date().toISOString() } },
                      `ping-${++seq}`,
                    ),
                  ),
                );
              }, 20000);

              const unsub = subscribe(
                (event) => {
                  controller.enqueue(encoder.encode(toSse(event, `evt-${++seq}`)));
                },
                (event) => (types.size === 0 ? true : types.has(event.type)),
              );

              request.signal.addEventListener("abort", () => {
                clearInterval(ping);
                unsub();
                try {
                  controller.close();
                } catch {
                  /* ignore */
                }
              });
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
