import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ScanLine, Stethoscope, Wallet } from "lucide-react";

import { EmptyState, KpiCard, PageHeader } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchDashboardKpis, fetchDashboardStats, EMPTY_DASHBOARD_KPIS, EMPTY_DASHBOARD_STATS } from "@/lib/api/dashboard";
import { fetchWorklist, type WorklistItem } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";
import { formatMAD } from "@/types/domain";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — RadioCRM" }] }),
  component: AnalyticsPage,
});

function monthRange() {
  const now = new Date();
  const from = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = toLocalDateKey(now);
  return { from, to };
}

function AnalyticsPage() {
  const [kpis, setKpis] = useState(EMPTY_DASHBOARD_KPIS);
  const [stats, setStats] = useState(EMPTY_DASHBOARD_STATS);
  const [exams, setExams] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const { from, to } = monthRange();
    setLoading(true);
    setError(null);
    Promise.all([fetchDashboardKpis(), fetchDashboardStats(), fetchWorklist({ from, to })])
      .then(([k, s, rows]) => {
        setKpis(k);
        setStats(s);
        setExams(rows);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Impossible de charger les statistiques"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const byModalite = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of exams) {
      const key = e.modalite || "Non précisé";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [exams]);

  const byPrescripteur = useMemo(() => {
    const map = new Map<string, { n: number; ca: number }>();
    for (const e of exams) {
      const key = e.prescripteur || "Non renseigné";
      const prev = map.get(key) ?? { n: 0, ca: 0 };
      map.set(key, { n: prev.n + 1, ca: prev.ca + (e.montant ?? 0) });
    }
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  }, [exams]);

  const encaisses = exams.reduce((s, e) => s + (e.acompte ?? 0), 0);
  const restes = exams.reduce((s, e) => s + (e.reste ?? 0), 0);
  const crPending = exams.filter((e) => e.statutCr === "a_faire" || e.statutCr === "en_redaction").length;
  const walkins = exams.filter((e) => e.passageSansRdv).length;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Pilotage"
        title="Analytics"
        subtitle="Indicateurs calculés sur les examens réellement enregistrés ce mois."
      />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={Activity} title="Impossible de charger les données." action={<Button onClick={load}>Réessayer</Button>} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Examens du mois" value={exams.length} hint={`${stats.examensAujourdhui} aujourd'hui`} icon={ScanLine} />
            <KpiCard label="Patients du jour" value={kpis.patientsDuJour} icon={Activity} />
            <KpiCard label="Encaissé (acompte)" value={formatMAD(encaisses)} icon={Wallet} tone="success" />
            <KpiCard label="Reste à payer" value={formatMAD(restes)} icon={Wallet} tone="warning" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="app-surface p-5">
              <h2 className="text-sm font-semibold">Modalités</h2>
              {byModalite.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Aucun examen ce mois.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {byModalite.map(([name, n]) => (
                    <li key={name} className="flex justify-between text-sm">
                      <span>{name}</span>
                      <span className="tabular-nums font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="app-surface p-5">
              <h2 className="text-sm font-semibold">Médecins prescripteurs</h2>
              {byPrescripteur.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Aucune prescription renseignée.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {byPrescripteur.map(([name, v]) => (
                    <li key={name} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Stethoscope className="size-3.5 text-muted-foreground" />
                        {name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {v.n} · {formatMAD(v.ca)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="app-surface p-5">
            <h2 className="text-sm font-semibold">Opérationnel</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Comptes rendus en attente</dt>
                <dd className="text-lg font-semibold">{crPending}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Passages sans rendez-vous</dt>
                <dd className="text-lg font-semibold">{walkins}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CA enregistré (dashboard)</dt>
                <dd className="text-lg font-semibold">{formatMAD(kpis.chiffreAffaires)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
