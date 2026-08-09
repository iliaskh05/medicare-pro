/**
 * Dedicated WebSocket server for doctor-to-doctor chat.
 * Bridges messages to the TanStack Start API (same process store via HTTP).
 *
 * Usage: node services/ws/server.mjs
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT ?? 8788);
const API_BASE = process.env.API_BASE ?? "http://127.0.0.1:8080";
const API_KEY = process.env.RADIOCRM_API_KEY ?? "dev-radiocrm-key";

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "radiocrm-ws", clients: wss.clients.size }));
});

const wss = new WebSocketServer({ server, path: "/chat" });

wss.on("connection", (socket, req) => {
  const url = new URL(req.url ?? "/chat", `http://${req.headers.host}`);
  const apiKey = url.searchParams.get("apiKey") ?? API_KEY;
  const clientId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  let roomId = url.searchParams.get("roomId");

  socket.send(JSON.stringify({ type: "system.welcome", payload: { clientId, roomId } }));

  socket.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      socket.send(JSON.stringify({ type: "error", payload: { message: "JSON invalide" } }));
      return;
    }

    if (msg.type === "join") {
      roomId = msg.roomId;
      socket.send(JSON.stringify({ type: "system.joined", payload: { roomId } }));
      return;
    }

    if (msg.type === "chat.send") {
      try {
        const res = await fetch(`${API_BASE}/api/chat/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            roomId: msg.roomId ?? roomId,
            senderId: msg.senderId,
            body: msg.body,
            studyId: msg.studyId,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: { message: json.error?.message ?? "Échec envoi" },
            }),
          );
          return;
        }
        // Fan-out to all sockets in room
        const envelope = JSON.stringify({ type: "chat.message", payload: json.data });
        for (const client of wss.clients) {
          if (client.readyState === 1) client.send(envelope);
        }
      } catch (e) {
        socket.send(
          JSON.stringify({
            type: "error",
            payload: { message: e instanceof Error ? e.message : "Erreur réseau" },
          }),
        );
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[radiocrm-ws] listening on ws://127.0.0.1:${PORT}/chat`);
});
