import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  MessageSquare,
  Minus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { useChatUnread, setChatActiveChannel } from "@/hooks/use-chat-unread";
import { useRole } from "@/hooks/use-role";
import {
  openDirectChat,
  searchChatDirectory,
  type ChatDirectoryUserDto,
} from "@/lib/api/chat";

function initiales(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ChannelThread({ channelId, channelName }: { channelId: string; channelName: string }) {
  const { profile, userId, backendRole } = useRole();
  const authorId = userId ?? "anonymous";
  const { messages, isLoading, error, uploadProgress, sendMessage, sendFile } = useChatChannel(
    channelId,
    {
      id: authorId,
      name: profile.nom,
      role: backendRole,
    },
  );

  return (
    <>
      {error ? (
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">{error.message}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList messages={messages} currentAuthorId={authorId} isLoading={isLoading} />
        <MessageInput
          channelName={channelName}
          onSend={sendMessage}
          onSendFile={sendFile}
          uploadProgress={uploadProgress}
        />
      </div>
    </>
  );
}

/** Fenêtre de messagerie interne rétractable. */
export function MessagerieDock() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ChatDirectoryUserDto[]>([]);
  const [searching, setSearching] = useState(false);
  const { channels, totalUnread, refresh, lastError } = useChatUnread({
    activeChannelId: open ? activeId : null,
    enabled: true,
  });

  const active = channels.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    setChatActiveChannel(open ? activeId : null);
    return () => setChatActiveChannel(null);
  }, [open, activeId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const t = window.setTimeout(() => {
      searchChatDirectory(q, controller.signal)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const groups = useMemo(
    () => channels.filter((c) => (c.type ?? "GROUP") === "GROUP"),
    [channels],
  );
  const directs = useMemo(() => channels.filter((c) => c.type === "DIRECT"), [channels]);

  const startDirect = async (user: ChatDirectoryUserDto) => {
    try {
      const ch = await openDirectChat(user.id);
      setQuery("");
      setHits([]);
      refresh();
      setActiveId(ch.id);
      toast.success(`Discussion avec ${user.nomComplet}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ouvrir la discussion");
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-[4.75rem] right-5 z-40 h-11 gap-2 rounded-full pl-4 pr-5 shadow-elevated"
      >
        <span className="relative">
          <MessageSquare className="size-5" />
          {totalUnread > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          ) : null}
        </span>
        <span className="hidden sm:inline">Messagerie interne</span>
      </Button>
    );
  }

  return (
    <section
      aria-label="Messagerie interne"
      className="fixed bottom-[4.75rem] right-5 z-40 flex h-[32rem] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
    >
      <header className="flex items-center gap-2 border-b border-border bg-primary px-3 py-2.5 text-primary-foreground">
        {active ? (
          <button
            onClick={() => setActiveId(null)}
            className="rounded-md p-1 transition-colors hover:bg-primary-foreground/15"
            aria-label="Retour aux canaux"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <MessageSquare className="size-4" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {active ? active.name : "Messagerie interne"}
          </p>
          <p className="truncate text-xs opacity-80">
            {active
              ? active.description || (active.type === "DIRECT" ? "Privé" : "")
              : `${channels.length} conversation(s)`}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 transition-colors hover:bg-primary-foreground/15"
          aria-label="Réduire la messagerie"
        >
          <Minus className="size-4" />
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setActiveId(null);
          }}
          className="rounded-md p-1 transition-colors hover:bg-primary-foreground/15"
          aria-label="Fermer la messagerie"
        >
          <X className="size-4" />
        </button>
      </header>

      {active ? (
        <ChannelThread channelId={active.id} channelName={active.name} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom ou email…"
              className="h-8 pl-8 text-sm"
            />
            {searching ? (
              <Loader2 className="absolute right-4 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : null}
          </div>
          {hits.length > 0 ? (
            <ul className="max-h-28 space-y-0.5 overflow-y-auto border-b border-border p-1">
              {hits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                    onClick={() => void startDirect(u)}
                  >
                    <span className="font-medium">{u.nomComplet}</span>
                    <span className="block truncate text-muted-foreground">{u.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {lastError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm font-medium text-destructive">Messagerie indisponible</p>
              <p className="text-xs text-muted-foreground">{lastError}</p>
              <Button size="sm" variant="outline" onClick={() => void refresh()}>
                Réessayer
              </Button>
            </div>
          ) : channels.length === 0 ? (
            <EmptyState message="Aucun canal — vérifiez la connexion au serveur ou réessayez." />
          ) : (
            <ScrollArea className="flex-1">
              <p className="px-3 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                Groupes
              </p>
              <ul className="divide-y divide-border">
                {groups.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary-soft text-[10px] font-semibold">
                          {initiales(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                      </div>
                      {(c.unreadCount ?? 0) > 0 ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          {(c.unreadCount ?? 0) > 9 ? "9+" : c.unreadCount}
                        </span>
                      ) : (
                        <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {directs.length > 0 ? (
                <>
                  <p className="px-3 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    Discussions
                  </p>
                  <ul className="divide-y divide-border">
                    {directs.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => setActiveId(c.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent"
                        >
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary-soft text-[10px] font-semibold">
                              {initiales(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.peerEmail || "Privé"}
                            </p>
                          </div>
                          {(c.unreadCount ?? 0) > 0 ? (
                            <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {(c.unreadCount ?? 0) > 9 ? "9+" : c.unreadCount}
                            </span>
                          ) : (
                            <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </ScrollArea>
          )}
        </div>
      )}
    </section>
  );
}
