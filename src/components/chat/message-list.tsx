import { memo, useEffect, useRef } from "react";
import { FileText, Mic, Play } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pill } from "@/components/ui-kit";
import type { ChatMessageDto } from "@/lib/api/chat";

const initials = (nom: string) =>
  nom
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });

function Attachment({ attachment }: { attachment: NonNullable<ChatMessageDto["attachment"]> }) {
  if (attachment.kind === "image") {
    return (
      <figure className="mt-2 overflow-hidden rounded-lg border border-border">
        <img
          src={attachment.url}
          alt={attachment.caption}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
        <figcaption className="px-2 py-1 text-xs text-muted-foreground">
          {attachment.caption}
        </figcaption>
      </figure>
    );
  }
  if (attachment.kind === "file") {
    return (
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:border-primary/40"
      >
        <FileText className="size-4 shrink-0 text-primary" />
        <span className="truncate">{attachment.name}</span>
        <span className="ml-auto shrink-0 text-muted-foreground">{attachment.size}</span>
      </a>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Play className="size-3.5" />
      </span>
      <span className="h-1 flex-1 rounded-full bg-muted">
        <span className="block h-full w-1/3 rounded-full bg-primary" />
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Mic className="size-3.5" />
        {attachment.durationSec}s
      </span>
    </div>
  );
}

/**
 * Liste des messages — composant isolé de la saisie pour éviter de re-rendre
 * l'historique à chaque frappe (préparation temps réel WebSocket).
 */
export const MessageList = memo(function MessageList({
  messages,
  currentAuthorId,
  isLoading,
}: {
  messages: ChatMessageDto[];
  currentAuthorId: string;
  isLoading?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-label="Historique des messages du canal"
    >
      {isLoading && messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chargement de l&apos;historique…</p>
      ) : null}
      {messages.map((m) => {
        const mine = m.authorId === currentAuthorId;
        return (
          <article key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(m.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className={`min-w-0 max-w-[min(30rem,80%)] ${mine ? "text-right" : ""}`}>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{m.authorName}</span>
                <Pill tone="neutral">{m.authorRole}</Pill>
                <time dateTime={m.createdAt}>{heure(m.createdAt)}</time>
              </p>
              <div
                className={`mt-1 inline-block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  mine
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                {m.attachment ? <Attachment attachment={m.attachment} /> : null}
              </div>
            </div>
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
});
