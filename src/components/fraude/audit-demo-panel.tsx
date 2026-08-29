import { useCallback, useEffect, useState } from "react";
import {
  Beaker,
  Loader2,
  Percent,
  ShieldAlert,
  Trash2,
  UserX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTile, Pill } from "@/components/ui-kit";
import {
  fetchAuditDemoExamples,
  fetchAuditDemoStatus,
  loadAuditDemo,
  resetAuditDemo,
  type AuditDemoExample,
  type AuditDemoStatus,
} from "@/lib/api/audit";
import { anomalyRiskTone } from "@/utils/anomalyDetection";

const scenarioIcons = [Percent, UserX, ShieldAlert] as const;

type AuditDemoPanelProps = {
  canManage: boolean;
  onLoaded: () => void;
};

export function AuditDemoPanel({ canManage, onLoaded }: AuditDemoPanelProps) {
  const [examples, setExamples] = useState<AuditDemoExample[]>([]);
  const [status, setStatus] = useState<AuditDemoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback((signal?: AbortSignal) => {
    setIsLoading(true);
    return Promise.all([fetchAuditDemoExamples(signal), fetchAuditDemoStatus(signal)])
      .then(([exRows, st]) => {
        if (signal?.aborted) return;
        setExamples(exRows);
        setStatus(st);
      })
      .catch(() => {
        if (signal?.aborted) return;
        setExamples([]);
        setStatus(null);
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const handleLoad = () => {
    if (!canManage) return;
    setIsBusy(true);
    loadAuditDemo()
      .then((st) => {
        setStatus(st);
        toast.success("Démo chargée — 3 dossiers fictifs visibles dans le tableau");
        onLoaded();
      })
      .catch((e: unknown) => {
        toast.error("Impossible de charger la démo", {
          description: e instanceof Error ? e.message : "Erreur réseau",
        });
      })
      .finally(() => setIsBusy(false));
  };

  const handleReset = () => {
    if (!canManage) return;
    setIsBusy(true);
    resetAuditDemo()
      .then((st) => {
        setStatus(st);
        toast("Démo réinitialisée");
        onLoaded();
      })
      .catch((e: unknown) => {
        toast.error("Réinitialisation impossible", {
          description: e instanceof Error ? e.message : "Erreur réseau",
        });
      })
      .finally(() => setIsBusy(false));
  };

  if (isLoading && examples.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Beaker className="size-4 text-primary" />
            Démonstration — 3 scénarios ML
          </CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Exemples illustrant comment le moteur hybride (clustering + Isolation Forest + règles
            métier) signale des dossiers atypiques. Les données sont fictives et préfixées{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">DEMO-AUDIT-</code>.
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" disabled={isBusy} onClick={handleLoad}>
              {isBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Zap className="mr-2 size-4" />
              )}
              Charger les 3 exemples
            </Button>
            {status?.loaded ? (
              <Button size="sm" variant="outline" disabled={isBusy} onClick={handleReset}>
                <Trash2 className="mr-2 size-4" />
                Effacer la démo
              </Button>
            ) : null}
          </div>
        ) : (
          <Pill tone="neutral">Chargement réservé à la direction</Pill>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.loaded ? (
          <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
            Démo active — {status.count} dossier(s) fictif(s) dans le tableau ci-dessous. Vous pouvez
            tester la validation « Anomalie » / « Normal » et l&apos;export.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            Cliquez sur <strong>Charger les 3 exemples</strong> pour remplir le tableau, les KPIs et
            le graphique de tendance sans attendre des factures réelles.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-3">
          {examples.map((ex, index) => {
            const Icon = scenarioIcons[index] ?? ShieldAlert;
            const tone = anomalyRiskTone(ex.expectedScore);
            return (
              <div
                key={ex.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <IconTile tone={tone === "destructive" ? "destructive" : tone === "warning" ? "primary" : "success"}>
                    <Icon className="size-5" />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-muted-foreground">{ex.id}</p>
                    <p className="mt-0.5 font-semibold leading-snug">{ex.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ex.patient} · {ex.acte}
                    </p>
                  </div>
                  <Pill tone={tone}>
                    {ex.expectedScore}% · {ex.niveau}
                  </Pill>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{ex.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ex.signals.map((s) => (
                    <Pill key={s} tone="neutral">
                      {s}
                    </Pill>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
