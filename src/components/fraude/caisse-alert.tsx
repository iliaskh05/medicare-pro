import { AlertTriangle, Ban, Clock, Percent, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTile, Pill } from "@/components/ui-kit";

export type CaisseVariables = {
  /** Temps écoulé entre l'impression des clichés et le paiement du solde (minutes). */
  delaiEncaissementMin: number;
  seuilDelaiMin: number;
  /** Pourcentage de réduction appliqué à l'accueil. */
  tauxRemisePct: number;
  seuilRemisePct: number;
  /** Modifications ou annulations de factures après réalisation de l'examen. */
  annulationsPostExamen: number;
  guichet: string;
};

export const caisseVariablesDemo: CaisseVariables = {
  delaiEncaissementMin: 45,
  seuilDelaiMin: 20,
  tauxRemisePct: 32,
  seuilRemisePct: 10,
  annulationsPostExamen: 2,
  guichet: "Accueil",
};

function VariableRow({
  icon: Icon,
  label,
  description,
  value,
  seuil,
  breached,
}: {
  icon: typeof Clock;
  label: string;
  description: string;
  value: string;
  seuil: string;
  breached: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
      <IconTile tone={breached ? "destructive" : "primary"}>
        <Icon className="size-5" />
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {label}
          <Pill tone={breached ? "destructive" : "success"}>{value}</Pill>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Seuil direction : {seuil}</p>
      </div>
    </div>
  );
}

/**
 * Encadré d'alerte IA ciblé sur la caisse (vue Directeur uniquement).
 * Le rendu conditionnel est assuré par l'appelant : `role === "directeur" && ...`.
 */
export function CaisseFraudAlert({
  variables = caisseVariablesDemo,
  compact = false,
}: {
  variables?: CaisseVariables;
  compact?: boolean;
}) {
  const v = variables;
  const body = (
    <>
      <div className="flex items-start gap-2 rounded-xl bg-destructive/8 p-3.5 ring-1 ring-inset ring-destructive/30">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm font-bold leading-snug text-destructive">
          Anomalie : Délai suspect de {v.delaiEncaissementMin} min entre l&apos;impression et
          l&apos;encaissement ({v.guichet}).
        </p>
      </div>

      <div className="space-y-2">
        <VariableRow
          icon={Clock}
          label="Délai d'encaissement"
          description="Temps écoulé entre l'impression des clichés et le paiement du solde."
          value={`${v.delaiEncaissementMin} min`}
          seuil={`${v.seuilDelaiMin} min`}
          breached={v.delaiEncaissementMin > v.seuilDelaiMin}
        />
        <VariableRow
          icon={Percent}
          label="Taux de remise"
          description="Pourcentage de réduction appliqué à l'accueil sans validation de la direction."
          value={`${v.tauxRemisePct} %`}
          seuil={`${v.seuilRemisePct} %`}
          breached={v.tauxRemisePct > v.seuilRemisePct}
        />
        <VariableRow
          icon={Ban}
          label="Annulations"
          description="Modifications ou annulations de factures après réalisation de l'examen."
          value={`${v.annulationsPostExamen} facture(s)`}
          seuil="0 facture"
          breached={v.annulationsPostExamen > 0}
        />
      </div>
    </>
  );

  if (compact) {
    return (
      <section className="space-y-3" aria-label="Alerte IA caisse">
        {body}
      </section>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <IconTile tone="destructive">
            <ShieldAlert className="size-5" />
          </IconTile>
          <div>
            <CardTitle className="text-base">Analyse de Conformité IA — Caisse</CardTitle>
            <p className="text-xs text-muted-foreground">
              Variables surveillées sur les règlements de l&apos;accueil · validation humaine
              obligatoire
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  );
}
