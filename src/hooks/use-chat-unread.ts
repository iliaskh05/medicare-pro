import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  chatSocketUrl,
  fetchChannels,
  type ChatChannelDto,
  type ChatMessageDto,
} from "@/lib/api/chat";
import { readAuthToken } from "@/lib/auth-session";

const POLL_MS = 12_000;

type Store = {
  channels: ChatChannelDto[];
  activeChannelId: string | null;
  bootstrapped: boolean;
  knownIds: Set<string>;
  started: boolean;
};

const store: Store = {
  channels: [],
  activeChannelId: null,
  bootstrapped: false,
  knownIds: new Set(),
  started: false,
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

async function refreshChannels() {
  if (!readAuthToken()) return;
  try {
    const rows = await fetchChannels();
    store.channels = rows;
    emit();
  } catch {
    /* silencieux */
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

  try {
    const socket = new WebSocket(chatSocketUrl());
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
        /* ignore */
      }
    };
  } catch {
    /* polling only */
  }

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
  const totalUnread = channels.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const refresh = useCallback(() => {
    void refreshChannels();
  }, []);

  // Force re-render when active changes unread display only — channels from store
  const [, setTick] = useState(0);
  useEffect(() => {
    setTick((t) => t + 1);
  }, [activeChannelId]);

  return { channels, totalUnread, refresh };
}

export function refreshChatUnread() {
  void refreshChannels();
}

/** Met à jour le canal « actif » pour supprimer les toasts sur ce canal. */
export function setChatActiveChannel(channelId: string | null) {
  store.activeChannelId = channelId;
}
