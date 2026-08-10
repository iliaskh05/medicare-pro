import { useEffect, useRef, useState } from "react";

import { getApiKey } from "@/lib/api-client";

export function useEventSource(
  path: string | null,
  onEvent: (type: string, data: unknown) => void,
) {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!path) return;
    const sep = path.includes("?") ? "&" : "?";
    const url = `${path}${sep}apiKey=${encodeURIComponent(getApiKey())}`;
    const es = new EventSource(url);

    const forward = (type: string) => (ev: MessageEvent) => {
      try {
        handler.current(type, JSON.parse(ev.data));
      } catch {
        handler.current(type, ev.data);
      }
    };

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    const types = [
      "chat.message",
      "fraud.alert",
      "imaging.analysis",
      "report.ready",
      "whatsapp.inbound",
      "system.ping",
    ];
    for (const t of types) es.addEventListener(t, forward(t));

    return () => {
      es.close();
      setConnected(false);
    };
  }, [path]);

  return { connected };
}

export function useChatSocket(
  enabled: boolean,
  roomId: string,
  onMessage: (payload: unknown) => void,
) {
  const [status, setStatus] = useState<"off" | "connecting" | "open" | "closed">("off");
  const wsRef = useRef<WebSocket | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    if (!enabled || !roomId) return;
    const base = (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://127.0.0.1:8788/chat";
    const url = `${base}?apiKey=${encodeURIComponent(getApiKey())}&roomId=${encodeURIComponent(roomId)}`;
    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      ws.send(JSON.stringify({ type: "join", roomId }));
    };
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("closed");
    ws.onmessage = (ev) => {
      try {
        handler.current(JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, roomId]);

  const send = (payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  return { status, send };
}
