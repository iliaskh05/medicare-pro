import { useEffect, useId, useRef, useState } from "react";
import { Eraser, Minus, RotateCcw, Send, ShieldAlert, X } from "lucide-react";

import logoRadioCRM from "@/assets/logo-radiocrm.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AssistantMessage,
  AssistantTypingIndicator,
  type AssistantChatMessage,
} from "@/components/assistant/assistant-message";
import { AssistantQuickActions } from "@/components/assistant/assistant-quick-actions";
import type { AssistantAction } from "@/lib/assistant-engine";
import { cn } from "@/lib/utils";

export function AssistantPanel({
  messages,
  actions,
  typing,
  onSend,
  onAction,
  onClose,
  onMinimize,
  onClear,
  onRestart,
}: {
  messages: AssistantChatMessage[];
  actions: AssistantAction[];
  typing: boolean;
  onSend: (texte: string) => void;
  onAction: (action: AssistantAction) => void;
  onClose: () => void;
  onMinimize: () => void;
  onClear: () => void;
  onRestart: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, typing]);

  const submit = () => {
    const texte = draft.trim();
    if (!texte) return;
    onSend(texte);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-elevated",
        // Mobile : feuille pleine largeur en bas d'écran
        "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl",
        // Desktop : panneau flottant 400 px
        "sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[34rem] sm:max-h-[calc(100dvh-2.5rem)] sm:w-[400px] sm:rounded-2xl",
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border bg-primary px-3 py-2.5 text-primary-foreground">
        <img
          src={logoRadioCRM}
          alt=""
          aria-hidden="true"
          className="size-8 rounded-lg bg-primary-foreground/10 object-contain p-1"
        />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-semibold">
            Assistant RadioCRM
          </h2>
          <p className="truncate text-[11px] text-primary-foreground/80">
            Guide de démonstration — réponses simulées
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
          aria-label="Effacer la conversation"
          onClick={onClear}
        >
          <Eraser className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
          aria-label="Redémarrer la démonstration de l'assistant"
          onClick={onRestart}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
          aria-label="Réduire l'assistant"
          onClick={onMinimize}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
          aria-label="Fermer l'assistant"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <p className="flex items-start gap-2 border-b border-border bg-warning/10 px-3 py-2 text-[11px] leading-snug text-warning-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Simulation IA — aucune donnée médicale réelle, aucun diagnostic.
      </p>

      <ScrollArea className="flex-1">
        <div
          className="space-y-3 p-3"
          role="log"
          aria-live="polite"
          aria-label="Conversation avec l'assistant"
        >
          {messages.map((message) => (
            <AssistantMessage key={message.id} message={message} />
          ))}
          {typing ? <AssistantTypingIndicator /> : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-border bg-muted/30 p-3">
        <AssistantQuickActions actions={actions} onAction={onAction} label="Suggestions" />
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            aria-label="Poser une question à l'Assistant RadioCRM"
            placeholder="Posez votre question…"
            className="h-10 rounded-full bg-background"
          />
          <Button
            size="icon"
            className="size-10 shrink-0 rounded-full"
            aria-label="Envoyer la question"
            onClick={submit}
            disabled={!draft.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
