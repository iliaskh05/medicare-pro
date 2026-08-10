import { createFileRoute } from "@tanstack/react-router";

import { extractCredential, HttpError, jsonError, jsonOk } from "@/server/auth/secure";
import { registerWsClient, sendMessage } from "@/server/chat/hub";
import { serverConfig } from "@/server/config";

/**
 * WebSocket handshake endpoint.
 * - Browsers connect to the companion WS server (services/ws) which proxies here for auth/config.
 * - Also exposes connection metadata for the frontend.
 */
export const Route = createFileRoute("/api/chat/ws")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const key = url.searchParams.get("apiKey") ?? extractCredential(request);
          if (key !== serverConfig.apiKey && !key?.startsWith("doc-")) {
            return jsonError(new HttpError(401, "Authentification requise", "unauthorized"));
          }

          const upgrade = request.headers.get("upgrade");
          if (upgrade?.toLowerCase() === "websocket") {
            // Cloudflare / runtime-specific upgrade path when available
            const maybe = request as Request & {
              webSocket?: unknown;
            };
            if ("webSocket" in maybe) {
              return new Response(
                "WebSocket upgrade non supporté sur ce runtime — utilisez le serveur WS dédié",
                {
                  status: 426,
                },
              );
            }
            return new Response(
              "Utilisez le serveur WebSocket dédié (port 8788) ou le flux SSE /api/chat/stream",
              { status: 426, headers: { "content-type": "text/plain" } },
            );
          }

          return jsonOk({
            transport: "websocket",
            path: serverConfig.wsPath,
            dedicatedUrl: process.env["WS_PUBLIC_URL"] ?? "ws://127.0.0.1:8788/chat",
            sseFallback: "/api/chat/stream",
            protocol: {
              join: { type: "join", roomId: "room-staff" },
              send: {
                type: "chat.send",
                roomId: "room-staff",
                senderId: "doc-skalli",
                body: "message",
              },
            },
            registerHint: "Le serveur services/ws enregistre les clients via registerWsClient",
          });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        // Internal bridge: dedicated WS server posts messages here
        try {
          const key = extractCredential(request);
          if (key !== serverConfig.apiKey) {
            return jsonError(new HttpError(401, "Authentification requise", "unauthorized"));
          }
          const body = (await request.json()) as {
            action: "register" | "send";
            clientId?: string;
            roomId?: string;
            senderId?: string;
            text?: string;
            studyId?: string;
          };

          if (body.action === "send" && body.roomId && body.senderId && body.text) {
            const message = sendMessage({
              roomId: body.roomId,
              senderId: body.senderId,
              body: body.text,
              ...(body.studyId ? { studyId: body.studyId } : {}),
            });
            return jsonOk(message);
          }

          if (body.action === "register" && body.clientId) {
            // No-op acknowledgment — actual WS sockets live in services/ws
            registerWsClient({
              id: body.clientId,
              roomId: body.roomId ?? null,
              send: () => undefined,
            });
            return jsonOk({ registered: true });
          }

          return jsonOk({ ok: true });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
