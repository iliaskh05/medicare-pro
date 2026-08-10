import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState, Pill } from "@/components/ui-kit";
import {
  waFiltres,
  waStatutLabel,
  waStatutTone,
  type WaConversation,
  type WaStatut,
} from "@/data/mock-whatsapp";
import { cn } from "@/lib/utils";

export function WaConversationList({
  conversations,
  activeId,
  query,
  filtre,
  onQueryChange,
  onFiltreChange,
  onSelect,
}: {
  conversations: WaConversation[];
  activeId: string;
  query: string;
  filtre: "toutes" | WaStatut;
  onQueryChange: (value: string) => void;
  onFiltreChange: (value: "toutes" | WaStatut) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col bg-muted/40 lg:border-r lg:border-border">
      <div className="space-y-3 border-b border-border bg-card/60 p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Rechercher une conversation patient"
            placeholder="Rechercher un patient ou un numéro"
            className="rounded-full bg-background pl-9"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrer par statut de conversation"
        >
          {waFiltres.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filtre === f.key}
              onClick={() => onFiltreChange(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filtre === f.key
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="divide-y divide-border">
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isActive ? "bg-card" : "hover:bg-card/70",
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success">
                    {c.initiales}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {c.patient}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {c.derniereHeure}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-muted-foreground">{c.apercu}</span>
                      {c.nonLus > 0 ? (
                        <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-foreground">
                          <span className="sr-only">Messages non lus :</span>
                          {c.nonLus}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1.5 block">
                      <Pill tone={waStatutTone[c.statut]} className="text-[10px]">
                        {waStatutLabel[c.statut]}
                      </Pill>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {conversations.length === 0 ? (
            <li>
              <EmptyState
                compact
                icon={Search}
                title="Aucune conversation trouvée"
                description="Modifiez votre recherche ou choisissez un autre filtre de statut."
              />
            </li>
          ) : null}
        </ul>
      </ScrollArea>
    </aside>
  );
}
