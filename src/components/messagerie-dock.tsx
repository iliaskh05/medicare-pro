import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, MessageSquare, Minus, Send, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { channels } from "@/data/chat-channels";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { useRole } from "@/hooks/use-role";
import type { ChannelId } from "@/lib/api/chat";

/** Initiales d'un nom pour l'avatar (aucune donnée stockée). */
function initiales(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function heure(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Fil actif : historique chargé depuis le backend et envoi temps réel. */
function ChannelThread({ channelId }: { channelId: ChannelId }) {
  const { profile } = useRole();
  const { messages, isLoading, error, sendMessage } = useChatChannel(channelId, {
    id: profile.id,
    name: profile.nom,
    role: profile.label,
  });
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [channelId, messages.length]);

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="ml-auto h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Historique indisponible.
            </p>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune donnée disponible
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.authorId === profile.id;
              return (
                <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  {!mine ? (
                    <span className="mb-1 text-[11px] font-semibold text-muted-foreground">
                      {m.authorName}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {heure(m.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const texte = draft.trim();
          if (!texte) return;
          setDraft("");
          void sendMessage(texte);
        }}
        className="flex items-center gap-2 border-t border-border p-2"
      >
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Écrire un message…"
          className="h-9"
          aria-label="Nouveau message"
        />
        <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!draft.trim()}>
          <Send className="size-4" />
          <span className="sr-only">Envoyer</span>
        </Button>
      </form>
    </>
  );
}

/** Fenêtre de messagerie interne rétractable, disponible sur toute la plateforme. */
export function MessagerieDock() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<ChannelId | null>(null);
  const active = channels.find((c) => c.id === activeId) ?? null;

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-[4.75rem] right-5 z-40 h-11 gap-2 rounded-full pl-4 pr-5 shadow-elevated"
      >
        <MessageSquare className="size-5" />
        <span className="hidden sm:inline">Messagerie interne</span>
      </Button>
    );
  }

  return (
    <section
      aria-label="Messagerie interne"
      className="fixed bottom-[4.75rem] right-5 z-40 flex h-[30rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
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
            {active ? active.description : `${channels.length} canaux du centre`}
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
        <ChannelThread channelId={active.id} />
      ) : channels.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollArea className="flex-1">
          <ul className="divide-y divide-border">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">
                      {initiales(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
