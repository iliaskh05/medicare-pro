import { Bot, CalendarClock, Headset, IdCard, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-kit";
import { waStatutLabel, waStatutTone, type WaConversation, type WaStatut } from "@/types/whatsapp";

const statuts: WaStatut[] = ["bot", "attente", "secretariat", "cloture"];

function InfoLigne({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function WaContextPanel({
  conversation,
  onStatutChange,
}: {
  conversation: WaConversation;
  onStatutChange: (statut: WaStatut) => void;
}) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-border bg-card p-4 xl:border-l">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Contexte patient</h3>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-background p-3">
        <InfoLigne icon={IdCard} label="Dossier" value={conversation.dossier} />
        <InfoLigne icon={Lock} label="Mutuelle déclarée" value={conversation.mutuelle} />
        <InfoLigne icon={Sparkles} label="Examen" value={conversation.examen} />
        <InfoLigne
          icon={CalendarClock}
          label="Prochain rendez-vous"
          value={conversation.prochainRdv}
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Statut de la conversation</h4>
        <Pill tone={waStatutTone[conversation.statut]}>{waStatutLabel[conversation.statut]}</Pill>
        <div
          className="grid gap-1.5"
          role="group"
          aria-label="Changer le statut de la conversation"
        >
          {statuts.map((statut) => (
            <Button
              key={statut}
              type="button"
              size="sm"
              variant={conversation.statut === statut ? "default" : "outline"}
              className="justify-start gap-2"
              onClick={() => onStatutChange(statut)}
            >
              {statut === "bot" ? (
                <Bot className="size-3.5" aria-hidden="true" />
              ) : (
                <Headset className="size-3.5" aria-hidden="true" />
              )}
              {waStatutLabel[statut]}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}
