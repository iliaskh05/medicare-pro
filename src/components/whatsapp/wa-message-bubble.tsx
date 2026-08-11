import { Bot, Check, CheckCheck, FileText, Headset, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WaEtat, WaMessage, WaQuickReply } from "@/types/whatsapp";

function EtatIcone({ etat }: { etat?: WaEtat | undefined }) {
  if (!etat) return null;
  if (etat === "envoye") return <Check className="size-3" aria-label="Envoyé" />;
  if (etat === "delivre") return <CheckCheck className="size-3" aria-label="Délivré" />;
  return <CheckCheck className="size-3 text-primary" aria-label="Lu" />;
}

export function WaMessageBubble({
  message,
  onQuickReply,
  quickRepliesActives,
}: {
  message: WaMessage;
  onQuickReply: (reply: WaQuickReply) => void;
  quickRepliesActives: boolean;
}) {
  if (message.auteur === "systeme") {
    return (
      <div className="flex justify-center">
        <p className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          {message.texte}
        </p>
      </div>
    );
  }

  const sortant = message.auteur === "bot" || message.auteur === "agent";

  return (
    <div className={cn("flex flex-col gap-1.5", sortant ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm md:max-w-[72%]",
          sortant
            ? "rounded-br-sm bg-success/15 text-foreground"
            : "rounded-bl-sm bg-card text-foreground",
        )}
      >
        {message.intent || message.auteur === "agent" ? (
          <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {message.auteur === "agent" ? (
              <Headset className="size-3" aria-hidden="true" />
            ) : (
              <Bot className="size-3" aria-hidden="true" />
            )}
            {message.auteur === "agent" ? "Secrétariat" : message.intent}
          </p>
        ) : null}

        <p className="whitespace-pre-line leading-relaxed">{message.texte}</p>

        {message.piece ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-foreground">
                {message.piece.nom}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {message.piece.type.toUpperCase()} · {message.piece.taille} · pièce simulée
              </span>
            </span>
          </div>
        ) : null}

        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          {message.heure}
          <EtatIcone etat={message.etat} />
        </p>
      </div>

      {message.quickReplies && message.quickReplies.length > 0 ? (
        <div className={cn("flex flex-wrap gap-1.5", sortant ? "justify-end" : "justify-start")}>
          {message.quickReplies.map((reply) => (
            <button
              key={`${message.id}-${reply.payload}`}
              type="button"
              disabled={!quickRepliesActives}
              onClick={() => onQuickReply(reply)}
              className="rounded-full border border-success/40 bg-background px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reply.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WaTypingIndicator() {
  return (
    <div className="flex justify-end" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-2xl rounded-br-sm bg-success/10 px-3.5 py-2.5 text-xs text-muted-foreground shadow-sm">
        <Bot className="size-3.5 text-success" aria-hidden="true" />
        <span>En train d'écrire</span>
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-success [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
