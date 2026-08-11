import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Clock, Loader2, Percent, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTile, Pill } from "@/components/ui-kit";
import { fetchAnomaliesCaisse, type AnomalieCaisseDto } from "@/lib/api/anomalies";

/** Variables métier surveillées, telles que renvoyées par le modèle Python. */
export type CaisseVariables = {
  delaiEncaissementMin: number;
  seuilDelaiMin: number;
  tauxRemisePct: number;
  seuilRemisePct: number;
  statutAnnulation: string;
  guichet: string;
};

function mapDto(dto: AnomalieCaisseDto): CaisseVariables {
  return {
    delaiEncaissementMin: Number(dto.delaiReglementMinutes ?? 0),
    seuilDelaiMin: Number(dto.seuilDelaiMinutes ?? 20),
    tauxRemisePct: Number(dto.tauxRemise ?? 0),
    seuilRemisePct: Number(dto.seuilRemise ?? 10),
    statutAnnulation: dto.annulationPostActe ?? "Aucune",
    guichet: dto.guichet ?? "Accueil",
  };
}

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
 * Les données proviennent du modèle de clustering Python : GET /api/ia/anomalies.
 * Le rendu conditionnel est assuré par l'appelant : `role === "directeur" && ...`.
 */
export function CaisseFraudAlert({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<CaisseVariables | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchAnomaliesCaisse(controller.signal)
      .then((dto) => {
        setData(mapDto(dto));
        setMessage(dto.message ?? null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Service d'analyse indisponible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  } else if (error || !data) {
    body = (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="size-5 shrink-0 text-destructive" />
        <p className="min-w-0 flex-1 text-sm">
          Analyse des anomalies financières indisponible.
          <span className="block text-xs text-muted-foreground">{error}</span>
        </p>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="mr-2 size-4" /> Réessayer
        </Button>
      </div>
    );
  } else {
    const v = data;
    const annulation = v.statutAnnulation.toLowerCase();
    const annulationBreached =
      annulation !== "" && annulation !== "aucune" && annulation !== "none";
    const delaiBreached = v.delaiEncaissementMin > v.seuilDelaiMin;

    body = (
      <>
        {delaiBreached ? (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/8 p-3.5 ring-1 ring-inset ring-destructive/30">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm font-bold leading-snug text-destructive">
              {message ??
                `Anomalie : Délai suspect de ${v.delaiEncaissementMin} min entre l'impression et l'encaissement (${v.guichet}).`}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <VariableRow
            icon={Clock}
            label="Délai d'encaissement"
            description="Temps écoulé entre l'impression des clichés et le paiement du solde."
            value={`${v.delaiEncaissementMin} min`}
            seuil={`${v.seuilDelaiMin} min`}
            breached={delaiBreached}
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
            value={v.statutAnnulation}
            seuil="Aucune"
            breached={annulationBreached}
          />
        </div>
      </>
    );
  }

  if (compact) {
    return (
      <section className="space-y-3" aria-label="Alerte IA caisse" aria-busy={isLoading}>
        {body}
      </section>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <IconTile tone="destructive">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ShieldAlert className="size-5" />
            )}
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
      <CardContent className="space-y-3" aria-busy={isLoading}>
        {body}
      </CardContent>
    </Card>
  );
}
