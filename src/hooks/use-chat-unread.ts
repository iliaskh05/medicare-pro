import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  chatSocketUrl,
  fetchChannels,
  type ChatChannelDto,
  type ChatMessageDto,
} from "@/lib/api/chat";
import { readAuthToken } from "@/lib/auth-session";

const POLL_MS = 12_000;
const WS_RETRY_MS = [2000, 5000, 10000, 20000];

type Store = {
  channels: ChatChannelDto[];
  activeChannelId: string | null;
  bootstrapped: boolean;
  knownIds: Set<string>;
  started: boolean;
  lastError: string | null;
  socket: WebSocket | null;
  retryAttempt: number;
  retryTimer: number | null;
};

const store: Store = {
  channels: [],
  activeChannelId: null,
  bootstrapped: false,
  knownIds: new Set(),
  started: false,
  lastError: null,
  socket: null,
  retryAttempt: 0,
  retryTimer: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store.channels;
}

function getErrorSnapshot() {
  return store.lastError;
}

async function refreshChannels() {
  if (!readAuthToken()) {
    store.channels = [];
    store.lastError = null;
    emit();
    return;
  }
  try {
    const rows = await fetchChannels();
    store.channels = rows;
    store.lastError = null;
    emit();
  } catch (e) {
    store.lastError =
      e instanceof Error ? e.message : "Impossible de charger la messagerie";
    emit();
  }
}

function clearWsRetry() {
  if (store.retryTimer != null) {
    window.clearTimeout(store.retryTimer);
    store.retryTimer = null;
  }
}

function connectUnreadSocket() {
  if (typeof window === "undefined") return;
  if (!readAuthToken()) return;

  try {
    store.socket?.close();
  } catch {
    /* ignore */
  }

  try {
    const socket = new WebSocket(chatSocketUrl());
    store.socket = socket;

    socket.onopen = () => {
      store.retryAttempt = 0;
    };

    socket.onclose = () => {
      store.socket = null;
      const delay = WS_RETRY_MS[Math.min(store.retryAttempt, WS_RETRY_MS.length - 1)] ?? 20000;
      store.retryAttempt += 1;
      clearWsRetry();
      store.retryTimer = window.setTimeout(() => {
        connectUnreadSocket();
      }, delay);
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
        if (!incoming?.id || !incoming.channelId) return;
        const isNew = !store.knownIds.has(incoming.id);
        store.knownIds.add(incoming.id);
        if (!store.bootstrapped || !isNew) return;
        if (incoming.channelId === store.activeChannelId) {
          void refreshChannels();
          return;
        }
        const label = incoming.authorName || "Collègue";
        toast.message(`Nouveau message de ${label}`, {
          description:
            incoming.messageType === "AUDIO"
              ? "Message vocal"
              : incoming.messageType === "IMAGE"
                ? "Photo"
                : incoming.messageType === "PDF"
                  ? "PDF"
                  : (incoming.body ?? "").slice(0, 80) || "Nouveau message",
        });
        void refreshChannels();
      } catch {
        /* ignore pong / non-JSON */
      }
    };
  } catch {
    /* polling only */
  }
}

function ensureStarted() {
  if (store.started || typeof window === "undefined") return;
  store.started = true;

  void refreshChannels();

  window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void refreshChannels();
  }, POLL_MS);

  const onFocus = () => void refreshChannels();
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  connectUnreadSocket();

  window.setTimeout(() => {
    store.bootstrapped = true;
  }, 1500);
}

/**
 * Agrège les non-lus chat + toast hors canal actif (singleton partagé sidebar/dock).
 */
export function useChatUnread(opts?: { activeChannelId?: string | null; enabled?: boolean }) {
  const enabled = opts?.enabled !== false;
  const activeChannelId = opts?.activeChannelId ?? null;

  useEffect(() => {
    if (!enabled) return;
    ensureStarted();
  }, [enabled]);

  useEffect(() => {
    if (activeChannelId !== undefined) {
      store.activeChannelId = activeChannelId;
    }
  }, [activeChannelId]);

  const channels = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const lastError = useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
  const totalUnread = channels.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const refresh = useCallback(() => {
    void refreshChannels();
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    setTick((t) => t + 1);
  }, [activeChannelId]);

  return { channels, totalUnread, refresh, lastError };
}

export function refreshChatUnread() {
  void refreshChannels();
}

/** Met à jour le canal « actif » pour supprimer les toasts sur ce canal. */
export function setChatActiveChannel(channelId: string | null) {
  store.activeChannelId = channelId;
}

/** À appeler après login / logout pour repartir proprement. */
export function resetChatUnreadStore() {
  clearWsRetry();
  try {
    store.socket?.close();
  } catch {
    /* ignore */
  }
  store.socket = null;
  store.channels = [];
  store.activeChannelId = null;
  store.bootstrapped = false;
  store.knownIds = new Set();
  store.started = false;
  store.lastError = null;
  store.retryAttempt = 0;
  emit();
}
