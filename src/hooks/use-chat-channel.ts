import { useCallback, useEffect, useRef, useState } from "react";

import {
  chatSocketUrl,
  fetchChannelMessages,
  postChannelMessage,
  type ChannelId,
  type ChatMessageDto,
} from "@/lib/api/chat";

export type SocketStatus = "connecting" | "open" | "closed" | "polling";

const POLL_MS = 3500;

/**
 * Canal de messagerie interne :
 * - historique + envoi via API Java sécurisée (auteur = JWT),
 * - WebSocket si `VITE_WS_URL` est configuré,
 * - sinon polling léger pour rester à jour.
 */
export function useChatChannel(
  channelId: ChannelId,
  author: { id: string; name: string; role: string },
) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);

  const mergeMessages = useCallback((incoming: ChatMessageDto[]) => {
    setMessages((prev) => {
      const byId = new Map<string, ChatMessageDto>();
      for (const m of prev) {
        if (!m.id.startsWith("local-")) byId.set(m.id, m);
      }
      for (const m of incoming) byId.set(m.id, m);
      return Array.from(byId.values()).sort((a, b) =>
        String(a.createdAt).localeCompare(String(b.createdAt)),
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setIsLoading(true);
    setError(null);

    fetchChannelMessages(channelId)
      .then((remote) => {
        if (!cancelled && remote) setMessages(remote);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error("Historique indisponible"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wsConfigured = Boolean(import.meta.env?.["VITE_WS_URL"]);
    if (wsConfigured) {
      const url = chatSocketUrl(channelId);
      setStatus("connecting");
      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => setStatus("open");
      socket.onclose = () => setStatus("closed");
      socket.onerror = () => setStatus("closed");
      socket.onmessage = (event) => {
        try {
          const incoming = JSON.parse(event.data as string) as ChatMessageDto;
          if (incoming.channelId === channelId) {
            setMessages((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
            );
          }
        } catch {
          /* trame non JSON ignorée */
        }
      };
      return () => {
        socketRef.current = null;
        socket.close();
      };
    }

    setStatus("polling");
    const tick = () => {
      if (document.visibilityState === "hidden" || sendingRef.current) return;
      fetchChannelMessages(channelId)
        .then((remote) => {
          if (remote) mergeMessages(remote);
          setError(null);
        })
        .catch(() => {
          /* silencieux en polling pour éviter le bruit UI */
        });
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [channelId, mergeMessages]);

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      const optimistic: ChatMessageDto = {
        id: `local-${Date.now()}`,
        channelId,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        body: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      sendingRef.current = true;

      try {
        const saved = await postChannelMessage(channelId, { body: trimmed });
        if (saved) {
          setMessages((prev) => {
            const withoutLocal = prev.filter((m) => m.id !== optimistic.id);
            if (withoutLocal.some((m) => m.id === saved.id)) return withoutLocal;
            return [...withoutLocal, saved];
          });
          setError(null);
        }
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setError(e instanceof Error ? e : new Error("Envoi impossible"));
      } finally {
        sendingRef.current = false;
      }
    },
    [channelId, author.id, author.name, author.role],
  );

  return { messages, status, isLoading, error, sendMessage };
}
