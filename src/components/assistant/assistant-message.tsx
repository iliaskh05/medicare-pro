import type { ReactNode } from "react";

import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";

export type AssistantAuthor = "assistant" | "utilisateur";

export type AssistantChatMessage = {
  id: string;
  auteur: AssistantAuthor;
  texte: string;
  heure: string;
};

/** Rendu minimal du gras `**texte**` et de l'italique `_texte_` (pas de dépendance markdown). */
function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={key} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function AssistantMessage({ message }: { message: AssistantChatMessage }) {
  const isAssistant = message.auteur === "assistant";
  const lines = message.texte.split("\n");

  return (
    <div className={cn("flex gap-2", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant ? (
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
        >
          <Bot className="size-4" />
        </span>
      ) : null}

      <div className={cn("max-w-[85%] space-y-1", isAssistant ? "items-start" : "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isAssistant
              ? "rounded-tl-sm bg-muted/70 text-foreground"
              : "rounded-tr-sm bg-primary text-primary-foreground",
          )}
        >
          {lines.map((line, index) =>
            line.trim() === "" ? (
              <span key={`${message.id}-br-${index}`} className="block h-2" />
            ) : (
              <p key={`${message.id}-l-${index}`} className={index > 0 ? "mt-0.5" : undefined}>
                {renderInline(line, `${message.id}-l-${index}`)}
              </p>
            ),
          )}
        </div>
        <p
          className={cn(
            "px-1 text-[10px] text-muted-foreground",
            isAssistant ? "text-left" : "text-right",
          )}
        >
          {message.heure}
        </p>
      </div>

      {isAssistant ? null : (
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-inset ring-border"
        >
          <User className="size-4" />
        </span>
      )}
    </div>
  );
}

export function AssistantTypingIndicator() {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
      >
        <Bot className="size-4" />
      </span>
      <span className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted/70 px-3 py-2.5">
        <span className="sr-only">L'assistant rédige une réponse…</span>
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </span>
    </div>
  );
}
