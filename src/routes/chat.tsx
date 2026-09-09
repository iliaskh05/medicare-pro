import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Loader2, Search, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, Pill } from "@/components/ui-kit";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { setChatActiveChannel } from "@/hooks/use-chat-unread";
import { useRole } from "@/hooks/use-role";
import {
  fetchChannels,
  openDirectChat,
  searchChatDirectory,
  type ChatChannelDto,
  type ChatDirectoryUserDto,
} from "@/lib/api/chat";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messagerie interne du centre — RadioCRM" },
      {
        name: "description",
        content:
          "Messagerie interne : groupes du centre et discussions privées (texte, photo, PDF, audio).",
      },
    ],
  }),
  component: ChatPage,
});

function initiales(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ChatPage() {
  const { profile, userId, backendRole } = useRole();
  const [channels, setChannels] = useState<ChatChannelDto[]>([]);
  const [channelId, setChannelId] = useState<string>("accueil-medecins");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ChatDirectoryUserDto[]>([]);
  const [searching, setSearching] = useState(false);

  const author = {
    id: userId ?? "anonymous",
    name: profile.nom,
    role: backendRole,
  };

  const reloadChannels = useCallback(async (preferId?: string) => {
    setLoadingChannels(true);
    try {
      const rows = await fetchChannels();
      setChannels(rows);
      setChannelId((prev) => {
        if (preferId && rows.some((c) => c.id === preferId)) return preferId;
        if (rows.some((c) => c.id === prev)) return prev;
        return rows[0]?.id ?? "accueil-medecins";
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Canaux indisponibles");
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    void reloadChannels();
  }, [reloadChannels]);

  useEffect(() => {
    setChatActiveChannel(channelId);
    return () => setChatActiveChannel(null);
  }, [channelId]);

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
  const directs = useMemo(
    () => channels.filter((c) => c.type === "DIRECT"),
    [channels],
  );
  const active = channels.find((c) => c.id === channelId) ?? groups[0];

  const { messages, status, isLoading, error, uploadProgress, sendMessage, sendFile } =
    useChatChannel(channelId, author);

  const startDirect = async (user: ChatDirectoryUserDto) => {
    try {
      const ch = await openDirectChat(user.id);
      setQuery("");
      setHits([]);
      await reloadChannels(ch.id);
      toast.success(`Discussion avec ${user.nomComplet}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ouvrir la discussion");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Messagerie interne"
        subtitle="Groupes du centre et discussions privées — texte, photos, PDF et messages vocaux"
        actions={
          <Pill tone={status === "open" ? "success" : status === "polling" ? "warning" : "neutral"}>
            {status === "open"
              ? "Temps réel"
              : status === "polling"
                ? "Polling (secours)"
                : "Connexion…"}
          </Pill>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-3 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un collègue (nom ou email)…"
                className="pl-8"
                aria-label="Rechercher un membre du centre"
              />
              {searching ? (
                <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            {hits.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {hits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => void startDirect(u)}
                    >
                      <span className="font-medium">{u.nomComplet}</span>
                      <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {loadingChannels ? (
              <p className="text-xs text-muted-foreground">Chargement des canaux…</p>
            ) : (
              <>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Groupes
                </p>
                <ul className="space-y-1">
                  {groups.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setChannelId(c.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm",
                          channelId === c.id ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                        )}
                      >
                        <Hash className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-tight">{c.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.membersCount} membre{c.membersCount > 1 ? "s" : ""}
                          </span>
                        </span>
                        {(c.unreadCount ?? 0) > 0 ? (
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {(c.unreadCount ?? 0) > 9 ? "9+" : c.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Discussions
                </p>
                {directs.length === 0 ? (
                  <p className="px-2 text-xs text-muted-foreground">
                    Recherchez un collègue pour démarrer une discussion.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {directs.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setChannelId(c.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm",
                            channelId === c.id ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                          )}
                        >
                          <Avatar className="mt-0.5 size-7 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {initiales(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium leading-tight">{c.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.peerEmail || "Privé"}
                            </span>
                          </span>
                          {(c.unreadCount ?? 0) > 0 ? (
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {(c.unreadCount ?? 0) > 9 ? "9+" : c.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[28rem] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initiales(active?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{active?.name ?? "Canal"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {active?.type === "DIRECT"
                  ? active.peerEmail || "Discussion privée"
                  : active?.description ||
                    `${active?.membersCount ?? 0} membre${(active?.membersCount ?? 0) > 1 ? "s" : ""}`}
              </p>
            </div>
            {active?.type === "DIRECT" ? (
              <UserRound className="size-4 text-muted-foreground" />
            ) : (
              <Users className="size-4 text-muted-foreground" />
            )}
          </div>
          {error ? (
            <p className="px-4 py-2 text-sm text-destructive">{error.message}</p>
          ) : null}
          <MessageList
            messages={messages}
            currentAuthorId={author.id}
            isLoading={isLoading}
          />
          <MessageInput
            channelName={active?.name ?? "canal"}
            onSend={sendMessage}
            onSendFile={sendFile}
            uploadProgress={uploadProgress}
          />
        </Card>
      </div>
    </div>
  );
}
