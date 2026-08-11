import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, MessageSquare, Minus, Send, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  conversationsInternes,
  type ConversationInterne,
  type MessageInterne,
} from "@/types/imaging";

export function MessagerieDock() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ConversationInterne[]>(conversationsInternes);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);
  const nonLus = threads.reduce((s, t) => s + t.nonLus, 0);

  useEffect(() => {
    if (open && active) {
      inputRef.current?.focus();
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [open, active, active?.messages.length]);

  const openThread = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, nonLus: 0 } : t)));
  };

  const send = () => {
    const texte = draft.trim();
    if (!texte || !active) return;
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const message: MessageInterne = { id: `m-${Date.now()}`, auteur: "moi", texte, heure };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, messages: [...t.messages, message], dernierMessage: texte }
          : t,
      ),
    );
    setDraft("");
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-[4.75rem] right-5 z-40 h-11 gap-2 rounded-full pl-4 pr-5 shadow-elevated"
      >
        <MessageSquare className="size-5" />
        <span className="hidden sm:inline">Messagerie médecins</span>
        {nonLus > 0 ? (
          <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
            {nonLus}
          </span>
        ) : null}
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
            aria-label="Retour aux conversations"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <MessageSquare className="size-4" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {active ? active.medecin : "Messagerie interne"}
          </p>
          <p className="truncate text-xs opacity-80">
            {active
              ? `${active.specialite} · ${active.enLigne ? "en ligne" : "hors ligne"}`
              : `${threads.length} médecins · ${nonLus} non lu(s)`}
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
        <>
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-3">
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex flex-col", m.auteur === "moi" ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.auteur === "moi"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.texte}
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">{m.heure}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message…"
              className="h-9"
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!draft.trim()}>
              <Send className="size-4" />
              <span className="sr-only">Envoyer</span>
            </Button>
          </form>
        </>
      ) : (
        <ScrollArea className="flex-1">
          <ul className="divide-y divide-border">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => openThread(t.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="relative">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">
                        {t.initiales}
                      </AvatarFallback>
                    </Avatar>
                    {t.enLigne ? (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.medecin}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.dernierMessage}</p>
                  </div>
                  {t.nonLus > 0 ? (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                      {t.nonLus}
                    </span>
                  ) : (
                    <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
