import {
  ArrowLeft,
  Bot,
  CalendarCheck,
  FileText,
  Headset,
  Info,
  Phone,
  Send,
  Video,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { ActionButton } from "@/components/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui-kit";
import { WaMessageBubble, WaTypingIndicator } from "@/components/whatsapp/wa-message-bubble";
import {
  waStatutLabel,
  waStatutTone,
  type WaConversation,
  type WaQuickReply,
} from "@/types/whatsapp";
import type { WaScenario } from "@/lib/whatsapp-bot";

const scenarios: Array<{ key: WaScenario; label: string; icon: typeof Bot }> = [
  { key: "rdv", label: "Prise de RDV", icon: CalendarCheck },
  { key: "preparation-irm", label: "Préparation IRM", icon: FileText },
  { key: "preparation-scanner", label: "Préparation scanner", icon: FileText },
  { key: "preparation-echographie", label: "Préparation échographie", icon: FileText },
  { key: "preparation-mammographie", label: "Préparation mammographie", icon: FileText },
  { key: "assurance", label: "Mutuelle & prise en charge", icon: Info },
  { key: "rappel", label: "Rappel J-1", icon: CalendarCheck },
  { key: "compte-rendu", label: "Compte rendu disponible", icon: FileText },
  { key: "handoff", label: "Prise en charge secrétariat", icon: Headset },
];

export function WaChatThread({
  conversation,
  draft,
  typing,
  modeAgent,
  onDraftChange,
  onEnvoyer,
  onQuickReply,
  onScenario,
  onToggleMode,
  onRetour,
}: {
  conversation: WaConversation;
  draft: string;
  typing: boolean;
  modeAgent: boolean;
  onDraftChange: (value: string) => void;
  onEnvoyer: () => void;
  onQuickReply: (reply: WaQuickReply) => void;
  onScenario: (scenario: WaScenario) => void;
  onToggleMode: () => void;
  onRetour: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, conversation.messages.length, typing]);

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
          <ActionButton
            variant="ghost"
            size="icon"
            aria-label="Appeler le patient (simulation)"
            toastKind="info"
            toastMessage="Appel simulé — aucune communication réelle n'est établie."
          >
            <Phone className="size-4" />
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="icon"
            aria-label="Démarrer une visioconférence (simulation)"
            toastKind="info"
            toastMessage="Téléconsultation simulée — fonctionnalité de démonstration."
          >
            <Video className="size-4" />
          </ActionButton>
        </div>
      </header>

      {/* Barre de scénarios simulés */}
      <div
        data-tour="whatsapp-demo"
        className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2.5 sm:px-4"
      >
        <span className="mr-1 text-xs font-semibold text-muted-foreground">
          Scénarios simulés :
        </span>
        {scenarios.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onScenario(s.key)}
          >
            <s.icon className="size-3.5" aria-hidden="true" />
            {s.label}
          </Button>
        ))}
      </div>

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
        {typing ? <WaTypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-border bg-card px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {modeAgent
              ? "Mode agent : vos messages sont envoyés au nom du secrétariat."
              : "Mode bot : le patient écrit, l'assistant répond automatiquement."}
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
            placeholder={modeAgent ? "Message du secrétariat…" : "Message du patient…"}
            className="rounded-full bg-muted/50"
            value={draft}
            disabled={conversation.statut === "cloture"}
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
            disabled={!draft.trim() || conversation.statut === "cloture"}
            className="shrink-0 rounded-full"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </footer>
    </section>
  );
}
