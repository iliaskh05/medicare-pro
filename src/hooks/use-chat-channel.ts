import { useCallback, useEffect, useRef, useState } from "react";

import {
  chatSocketUrl,
  fetchChannelMessages,
  markChannelRead,
  postChannelMessage,
  uploadChannelMessage,
  type ChatMessageDto,
} from "@/lib/api/chat";
import { refreshChatUnread } from "@/hooks/use-chat-unread";
import { readAuthToken } from "@/lib/auth-session";

export type SocketStatus = "connecting" | "open" | "closed" | "polling";

const POLL_MS = 2500;
const WS_RETRY_MS = [1000, 2000, 4000, 8000, 15000];

/**
 * Canal de messagerie interne :
 * - historique + envoi via API Java (auteur = JWT),
 * - WebSocket pour push immédiat (reconnexion auto),
 * - polling de secours.
 */
export function useChatChannel(
  channelId: string,
  author: { id: string; name: string; role: string },
) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [status, setStatus] = useState<SocketStatus>("polling");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);

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

    if (!channelId) {
      setIsLoading(false);
      return;
    }

    fetchChannelMessages(channelId)
      .then((remote) => {
        if (!cancelled && remote) setMessages(remote);
        if (!cancelled) {
          void markChannelRead(channelId)
            .then(() => refreshChatUnread())
            .catch(() => undefined);
        }
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
    if (typeof window === "undefined" || !channelId) return;

    let cancelled = false;
    let wsOpen = false;

    const clearRetry = () => {
      if (retryTimerRef.current != null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      if (!readAuthToken()) {
        setStatus("polling");
        return;
      }

      setStatus("connecting");
      try {
        const socket = new WebSocket(chatSocketUrl());
        socketRef.current = socket;

        socket.onopen = () => {
          if (cancelled) {
            socket.close();
            return;
          }
          wsOpen = true;
          retryRef.current = 0;
          setStatus("open");
        };

        socket.onclose = () => {
          wsOpen = false;
          socketRef.current = null;
          if (cancelled) return;
          setStatus("polling");
          const delay = WS_RETRY_MS[Math.min(retryRef.current, WS_RETRY_MS.length - 1)] ?? 15000;
          retryRef.current += 1;
          clearRetry();
          retryTimerRef.current = window.setTimeout(connect, delay);
        };

        socket.onerror = () => {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
        };

        socket.onmessage = (event) => {
          try {
            const incoming = JSON.parse(event.data as string) as ChatMessageDto;
            if (incoming.channelId === channelId) {
              setMessages((prev) =>
                prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
              );
            }
          } catch {
            /* ignore non-JSON (pong) */
          }
        };
      } catch {
        setStatus("polling");
        const delay = WS_RETRY_MS[Math.min(retryRef.current, WS_RETRY_MS.length - 1)] ?? 15000;
        retryRef.current += 1;
        clearRetry();
        retryTimerRef.current = window.setTimeout(connect, delay);
      }
    };

    connect();

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden" || sendingRef.current) return;
      fetchChannelMessages(channelId)
        .then((remote) => {
          if (remote) mergeMessages(remote);
          setError(null);
          if (!wsOpen) setStatus("polling");
        })
        .catch(() => {
          /* silencieux en poll */
        });
    }, POLL_MS);

    const pingId = window.setInterval(() => {
      const s = socketRef.current;
      if (s && s.readyState === WebSocket.OPEN) {
        try {
          s.send("ping");
        } catch {
          /* ignore */
        }
      }
    }, 25000);

    return () => {
      cancelled = true;
      clearRetry();
      window.clearInterval(pollId);
      window.clearInterval(pingId);
      const s = socketRef.current;
      socketRef.current = null;
      try {
        s?.close();
      } catch {
        /* ignore */
      }
    };
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
        messageType: "TEXT",
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
        throw e;
      } finally {
        sendingRef.current = false;
      }
    },
    [channelId, author.id, author.name, author.role],
  );

  const sendFile = useCallback(
    async (file: File, caption?: string, durationSeconds?: number) => {
      sendingRef.current = true;
      setUploadProgress(file.name);
      try {
        const saved = await uploadChannelMessage(channelId, file, caption, {
          durationSeconds,
        });
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
        setError(null);
        return saved;
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Upload impossible"));
        throw e;
      } finally {
        sendingRef.current = false;
        setUploadProgress(null);
      }
    },
    [channelId],
  );

  return { messages, status, isLoading, error, uploadProgress, sendMessage, sendFile };
}
