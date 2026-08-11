import { useEffect } from "react";
import { AlertTriangle, Ban, Clock, Loader2, Percent, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, IconTile, Pill } from "@/components/ui-kit";
import { useAsyncAction } from "@/hooks/use-async-action";
import { fetchFraudClustering } from "@/lib/api/fraud";
import { formatMAD } from "@/data/mock";
import { fraudSignalMeta, type FraudCaseRecord, type FraudSignalKey } from "@/types/fraud";

const signalIcons: Record<FraudSignalKey, typeof Clock> = {
  time_to_pay: Clock,
  discount_rate: Percent,
  post_exam_cancellation: Ban,
};

function ScoreGauge({ score }: { score: number }) {
  const tone = score >= 85 ? "bg-destructive" : score >= 65 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-xs font-semibold">{score}</span>
    </div>
  );
}

function SignalSummary({ cases, signalKey }: { cases: FraudCaseRecord[]; signalKey: FraudSignalKey }) {
  const meta = fraudSignalMeta[signalKey];
  const Icon = signalIcons[signalKey];
  const signals = cases.map((c) => c.signals.find((s) => s.key === signalKey)).filter(Boolean);
  const breached = signals.filter((s) => s!.breached).length;
  const threshold = signals[0]?.threshold ?? 0;
  const moyenne = signals.length
    ? signals.reduce((sum, s) => sum + s!.value, 0) / signals.length
    : 0;

  return (
    <Card className={breached > 0 ? "ring-1 ring-inset ring-destructive/20" : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <IconTile tone={breached > 0 ? "destructive" : "primary"}>
            <Icon className="size-5" />
          </IconTile>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {meta.label}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{signalKey}</p>
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {breached}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            dossier(s) en alerte
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
          <span className="text-muted-foreground">Seuil direction</span>
          <span className="font-semibold">{meta.format(threshold)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
          <span className="text-muted-foreground">Moyenne observée</span>
          <span className="font-semibold">{meta.format(moyenne)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Module « Fraude caisse » — vue Directeur exclusivement.
 * Consomme la réponse JSON du modèle de clustering Python
 * (`FraudClusteringResponse`) et met en évidence les 3 variables critiques.
 */
export function FraudDashboard({ sensitivity = 70 }: { sensitivity?: number }) {
  const { run, data, isLoading, error } = useAsyncAction(fetchFraudClustering);

  useEffect(() => {
    void run({ sensitivity });
  }, [run, sensitivity]);

  const cases = (data?.cases ?? []).filter((c) => c.risk_score >= sensitivity);

  return (
    <section className="space-y-4" aria-labelledby="fraude-caisse-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="fraude-caisse-title"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <ShieldAlert className="size-5 text-destructive" />
            Fraude caisse — clustering des règlements
          </h2>
          <p className="text-sm text-muted-foreground">
            Modèle {data?.model_version ?? "—"} · {data?.analyzed_count ?? 0} dossiers analysés ·
            sensibilité {sensitivity}%
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => void run({ sensitivity })}
        >
          {isLoading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Relancer l'analyse
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 p-5 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <span>
              Le service de scoring est injoignable ({error.message}). Les décisions doivent être
              prises manuellement.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SignalSummary cases={cases} signalKey="time_to_pay" />
        <SignalSummary cases={cases} signalKey="discount_rate" />
        <SignalSummary cases={cases} signalKey="post_exam_cancellation" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Dossiers caisse atypiques ({cases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading && cases.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Chargement du scoring de la caisse…
            </p>
          ) : cases.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="Aucun dossier au-delà du seuil"
                description="Abaissez la sensibilité de l'IA pour inspecter les signaux faibles."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Patient / caissier</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Variables en alerte</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.case_id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {c.invoice_ref}
                      </TableCell>
                      <TableCell>
                        <span className="block text-sm font-medium">{c.patient_name}</span>
                        <span className="block text-xs text-muted-foreground">{c.cashier}</span>
                      </TableCell>
                      <TableCell>
                        <Pill tone="primary">
                          #{c.cluster_id} · {c.cluster_label}
                        </Pill>
                        <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                          d={c.distance_to_centroid}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatMAD(c.amount_mad)}
                        <span className="block text-xs text-muted-foreground">
                          barème {formatMAD(c.reference_amount_mad)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {c.signals.map((s) => (
                            <Pill key={s.key} tone={s.breached ? "destructive" : "neutral"}>
                              {fraudSignalMeta[s.key].label} · {fraudSignalMeta[s.key].format(s.value)}
                            </Pill>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ScoreGauge score={c.risk_score} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
