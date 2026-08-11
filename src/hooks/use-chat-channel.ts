import { useCallback, useEffect, useRef, useState } from "react";

import {
  chatSocketUrl,
  fetchChannelMessages,
  postChannelMessage,
  type ChannelId,
  type ChatMessageDto,
} from "@/lib/api/chat";

export type SocketStatus = "connecting" | "open" | "closed";

/**
 * Canal de messagerie interne prêt pour le temps réel.
 * - charge l'historique via l'API Java (repli sur l'historique local),
 * - ouvre un WebSocket si `VITE_WS_URL` est configuré,
 * - retombe sur POST HTTP lorsque la socket est fermée.
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
    const url = import.meta.env?.["VITE_WS_URL"] ? chatSocketUrl(channelId) : null;
    if (!url) {
      setStatus("closed");
      return;
    }

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
        // trame non JSON ignorée
      }
    };

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [channelId]);

  const sendMessage = useCallback(
    async (body: string, attachment?: ChatMessageDto["attachment"]) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment) return;

      const optimistic: ChatMessageDto = {
        id: `local-${Date.now()}`,
        channelId,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        body: trimmed,
        createdAt: new Date().toISOString(),
        ...(attachment ? { attachment } : {}),
      };
      setMessages((prev) => [...prev, optimistic]);

      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(optimistic));
        return;
      }

      try {
        const saved = await postChannelMessage(channelId, {
          authorId: author.id,
          authorName: author.name,
          body: trimmed,
        });
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Envoi impossible"));
      }
    },
    [channelId, author.id, author.name, author.role],
  );

  return { messages, status, isLoading, error, sendMessage };
}
