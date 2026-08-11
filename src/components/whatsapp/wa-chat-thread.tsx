import { ArrowLeft, Bot, Headset, Loader2, Send } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui-kit";
import { WaMessageBubble } from "@/components/whatsapp/wa-message-bubble";
import {
  waStatutLabel,
  waStatutTone,
  type WaConversation,
  type WaQuickReply,
} from "@/types/whatsapp";

export function WaChatThread({
  conversation,
  draft,
  envoiEnCours,
  modeAgent,
  onDraftChange,
  onEnvoyer,
  onQuickReply,
  onToggleMode,
  onRetour,
}: {
  conversation: WaConversation;
  draft: string;
  envoiEnCours: boolean;
  modeAgent: boolean;
  onDraftChange: (value: string) => void;
  onEnvoyer: () => void;
  onQuickReply: (reply: WaQuickReply) => void;
  onToggleMode: () => void;
  onRetour: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, conversation.messages.length]);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Revenir à la liste des conversations"
          onClick={onRetour}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success">
          {conversation.initiales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{conversation.patient}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.telephone} · {conversation.dossier} · {conversation.mutuelle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Pill tone={waStatutTone[conversation.statut]} className="hidden sm:inline-flex">
            {waStatutLabel[conversation.statut]}
          </Pill>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3 sm:p-4 md:p-6"
        role="log"
        aria-live="polite"
        aria-label={`Conversation avec ${conversation.patient}`}
      >
        {conversation.messages.map((message) => (
          <WaMessageBubble
            key={message.id}
            message={message}
            onQuickReply={onQuickReply}
            quickRepliesActives={conversation.statut !== "cloture"}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-border bg-card px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {modeAgent
              ? "Mode agent : vos messages sont envoyés au nom du secrétariat."
              : "Mode bot : les réponses automatiques sont gérées par l'assistant."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={onToggleMode}
          >
            {modeAgent ? <Bot className="size-3.5" /> : <Headset className="size-3.5" />}
            {modeAgent ? "Repasser en mode bot" : "Répondre en tant qu'agent"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label={
              modeAgent ? "Écrire un message en tant qu'agent" : "Écrire un message patient"
            }
            placeholder={modeAgent ? "Message du secrétariat…" : "Écrire un message…"}
            className="rounded-full bg-muted/50"
            value={draft}
            disabled={conversation.statut === "cloture" || envoiEnCours}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onEnvoyer();
              }
            }}
          />
          <Button
            size="icon"
            aria-label="Envoyer le message"
            onClick={onEnvoyer}
            disabled={!draft.trim() || conversation.statut === "cloture" || envoiEnCours}
            className="shrink-0 rounded-full"
          >
            {envoiEnCours ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </footer>
    </section>
  );
}
